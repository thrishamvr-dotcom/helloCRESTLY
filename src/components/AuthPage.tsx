import { useState, type FormEvent } from 'react';
import { Sparkles, Mail, Lock, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/Logo';
import { useSettings } from '@/lib/settings-context';
import { ACCENTS, ACCENT_KEYS } from '@/lib/types';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { settings, setTheme, setAccent } = useSettings();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === 'signin'
          ? await signIn(email.trim(), password)
          : await signUp(email.trim(), password, displayName.trim() || email.split('@')[0]);
      if (result.error) setError(result.error);
    } finally {
      setBusy(false);
    }
  }

  const accent = settings?.accent ?? 'violet';

  return (
    <div className="app-bg min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* ambient gradient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full accent-bg opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full accent-bg opacity-15 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* brand */}
        <div className="flex flex-col items-center mb-8 animate-slide-up">
          <div className="relative mb-4">
            <Logo size={64} />
            <Sparkles className="w-5 h-5 accent-text absolute -top-1 -right-1" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Crestly</h1>
          <p className="text-secondary text-sm mt-1.5">Space to speak.</p>
        </div>

        {/* card */}
        <div className="glass rounded-3xl p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] animate-scale-in">
          {/* tabs */}
          <div className="flex p-1 bg-input rounded-xl mb-6">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m ? 'accent-bg text-white shadow-sm' : 'text-secondary hover:text-primary'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Field icon={<UserIcon className="w-4 h-4" />} label="Display name">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-transparent outline-none text-primary placeholder:text-muted"
                  autoComplete="name"
                />
              </Field>
            )}
            <Field icon={<Mail className="w-4 h-4" />} label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent outline-none text-primary placeholder:text-muted"
                autoComplete="email"
              />
            </Field>
            <Field icon={<Lock className="w-4 h-4" />} label="Password">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-transparent outline-none text-primary placeholder:text-muted"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </Field>

            {error && (
              <p className="text-sm text-rose-500 bg-rose-500/10 rounded-lg px-3 py-2 animate-fade-in">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full accent-bg text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 accent-glow"
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted mt-5">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="accent-text font-medium hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* preview accent + theme picker so the look is felt before login */}
        <div className="glass-card rounded-2xl p-4 mt-5 animate-fade-in">
          <p className="text-xs text-muted mb-2.5 text-center">Try the theme & accent before you sign in</p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5 flex-wrap justify-center">
              {ACCENT_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAccent(key)}
                  aria-label={`Accent ${key}`}
                  className={`w-6 h-6 rounded-full transition-transform ${accent === key ? 'ring-2 ring-offset-2 ring-offset-transparent scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: ACCENTS[key].dark, boxShadow: accent === key ? `0 0 0 2px ${ACCENTS[key].dark}` : undefined }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTheme(settings?.theme === 'dark' ? 'light' : 'dark')}
              className="px-3 py-2 rounded-lg bg-input text-secondary text-xs font-medium hover:text-primary transition-colors whitespace-nowrap"
            >
              {settings?.theme === 'dark' ? 'Light' : 'Dark'} mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-secondary font-medium mb-1.5 block">{label}</span>
      <div className="flex items-center gap-2.5 bg-input rounded-xl px-3.5 py-3 border border-transparent focus-within:border-strong transition-colors">
        <span className="text-muted">{icon}</span>
        {children}
      </div>
    </label>
  );
}
