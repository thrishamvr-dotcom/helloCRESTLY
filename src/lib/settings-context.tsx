import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';
import {
  ACCENTS,
  DEFAULT_SETTINGS,
  type Settings,
  type ThemeMode,
  type AccentKey,
  type BubbleShape,
  type BubbleColorSent,
  type BubbleColorReceived,
  type ChatBgType,
  type FontSize,
} from './types';

interface SettingsContextValue {
  settings: Settings | null;
  loading: boolean;
  setTheme: (t: ThemeMode) => Promise<void>;
  setAccent: (a: AccentKey) => Promise<void>;
  setBubbleShape: (s: BubbleShape) => Promise<void>;
  setBubbleColorSent: (c: BubbleColorSent) => Promise<void>;
  setBubbleColorReceived: (c: BubbleColorReceived) => Promise<void>;
  setChatBg: (type: ChatBgType, value: string) => Promise<void>;
  setFontSize: (f: FontSize) => Promise<void>;
  themeTransition: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [themeTransition, setThemeTransition] = useState(false);

  const persist = useCallback(
    async (patch: Partial<Settings>) => {
      if (!user) return;
      setSettings((prev) => (prev ? { ...prev, ...patch, updated_at: new Date().toISOString() } : prev));
      const { error } = await supabase
        .from('settings')
        .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' });
      if (error) console.warn('settings save error', error.message);
    },
    [user],
  );

  useEffect(() => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle();
      if (error) {
        console.warn('settings load error', error.message);
        setLoading(false);
        return;
      }
      if (data) {
        setSettings(data as Settings);
      } else {
        const { data: created } = await supabase
          .from('settings')
          .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
          .select()
          .single();
        setSettings(created as Settings);
      }
      setLoading(false);
    })();
  }, [user]);

  // Apply CSS variables whenever settings change.
  useEffect(() => {
    if (!settings) return;
    const accent = ACCENTS[settings.accent] ?? ACCENTS.violet;
    const root = document.documentElement;
    root.classList.toggle('theme-dark', settings.theme === 'dark');
    root.classList.toggle('theme-light', settings.theme === 'light');
    root.style.setProperty('--accent', settings.theme === 'dark' ? accent.dark : accent.light);
    root.style.setProperty('--accent-glow', accent.glow);
    root.style.setProperty('--font-size-base', settings.font_size === 'small' ? '13px' : settings.font_size === 'large' ? '17px' : '15px');
  }, [settings]);

  const setTheme = useCallback(
    async (t: ThemeMode) => {
      setThemeTransition(true);
      await persist({ theme: t });
      setTimeout(() => setThemeTransition(false), 700);
    },
    [persist],
  );
  const setAccent = useCallback((a: AccentKey) => persist({ accent: a }), [persist]);
  const setBubbleShape = useCallback((s: BubbleShape) => persist({ bubble_shape: s }), [persist]);
  const setBubbleColorSent = useCallback((c: BubbleColorSent) => persist({ bubble_color_sent: c }), [persist]);
  const setBubbleColorReceived = useCallback((c: BubbleColorReceived) => persist({ bubble_color_received: c }), [persist]);
  const setChatBg = useCallback((type: ChatBgType, value: string) => persist({ chat_bg_type: type, chat_bg_value: value }), [persist]);
  const setFontSize = useCallback((f: FontSize) => persist({ font_size: f }), [persist]);

  const value: SettingsContextValue = {
    settings,
    loading,
    setTheme,
    setAccent,
    setBubbleShape,
    setBubbleColorSent,
    setBubbleColorReceived,
    setChatBg,
    setFontSize,
    themeTransition,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
