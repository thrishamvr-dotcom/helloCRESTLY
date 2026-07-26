import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { seedAccount } from './seed';
import type { Profile } from './types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) {
      console.warn('profile load error', error.message);
      return;
    }
    if (data) {
      setProfile(data as Profile);
    } else {
      // first sign-in: create profile + set online
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: uid, online: true, last_seen: new Date().toISOString() })
        .select()
        .single();
      if (newProfile) {
        setProfile(newProfile as Profile);
        await seedAccount(uid, (newProfile as Profile).display_name);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        (async () => {
          await loadProfile(newSession.user.id);
          if (mounted) setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? friendlyAuthError(error.message) : null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: friendlyAuthError(error.message) };
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: data.user.id, display_name: displayName, online: true, last_seen: new Date().toISOString() }, { onConflict: 'id' });
      if (profileError) console.warn('profile upsert', profileError.message);
      await seedAccount(data.user.id, displayName);
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (session?.user) {
      await supabase.from('profiles').update({ online: false, last_seen: new Date().toISOString() }).eq('id', session.user.id);
    }
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, [session]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function friendlyAuthError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password.';
  if (/already registered/i.test(msg)) return 'An account with this email already exists.';
  if (/rate limit/i.test(msg)) return 'Too many attempts — please wait a moment and try again.';
  if (/password/i.test(msg) && /weak|short|at least/i.test(msg)) return 'Password must be at least 6 characters.';
  return msg;
}
