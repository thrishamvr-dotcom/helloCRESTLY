import { useState } from 'react';
import {
  X, Sun, Moon, Palette, MessageSquare, ImageIcon, Type, Upload, Check,
  RotateCcw, SunMedium, Droplet, Shapes,
} from 'lucide-react';
import { useSettings } from '@/lib/settings-context';
import { ACCENTS, ACCENT_KEYS, type BubbleShape, type ChatBgType, type FontSize } from '@/lib/types';
import { classNames } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
}

const FOLDER_COLORS = ['violet', 'emerald', 'blue', 'rose', 'amber', 'cyan', 'fuchsia', 'teal', 'orange', 'lime'];

export function SettingsPanel({ open, onClose }: Props) {
  const s = useSettings();
  const settings = s.settings;
  const [customBg, setCustomBg] = useState('');

  if (!settings) return null;

  const gradients = [
    'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)',
    'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    'linear-gradient(135deg, #111827 0%, #312e81 100%)',
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    'linear-gradient(135deg, #2d124d 0%, #1a0b2e 100%)',
    'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
    'linear-gradient(135deg, #1c1917 0%, #44403c 100%)',
    'linear-gradient(135deg, #3b0764 0%, #1d4ed8 100%)',
  ];

  function handleUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomBg(dataUrl);
      s.setChatBg('custom', dataUrl);
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={onClose} />}
      <aside
        className={classNames(
          'fixed top-0 right-0 h-full w-full max-w-md z-50 glass border-l border-soft transition-transform duration-300 ease-out flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-soft">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Palette className="w-5 h-5 accent-text" /> Customize
          </h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg text-secondary" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* THEME */}
          <Section icon={<SunMedium className="w-4 h-4" />} title="Appearance">
            <div className="grid grid-cols-2 gap-3">
              <ThemeCard
                active={settings.theme === 'light'}
                onClick={() => s.setTheme('light')}
                label="Light"
                preview={<div className="h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center"><Sun className="w-6 h-6 text-emerald-500" /></div>}
              />
              <ThemeCard
                active={settings.theme === 'dark'}
                onClick={() => s.setTheme('dark')}
                label="Dark"
                preview={<div className="h-16 rounded-lg bg-[#0a0a0f] border border-violet-900/40 flex items-center justify-center"><Moon className="w-6 h-6 text-violet-400" /></div>}
              />
            </div>
          </Section>

          {/* ACCENT */}
          <Section icon={<Droplet className="w-4 h-4" />} title="Accent color">
            <div className="grid grid-cols-5 gap-3">
              {ACCENT_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => s.setAccent(key)}
                  aria-label={ACCENTS[key].label}
                  className={classNames(
                    'h-11 rounded-xl flex items-center justify-center transition-all relative',
                    settings.accent === key ? 'ring-2 ring-offset-2 ring-offset-transparent scale-105' : 'hover:scale-105',
                  )}
                  style={{
                    backgroundColor: ACCENTS[key].dark,
                    ['--tw-ring-color' as string]: ACCENTS[key].dark,
                  }}
                >
                  {settings.accent === key && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">Current: {ACCENTS[settings.accent].label}</p>
          </Section>

          {/* BUBBLE SHAPE */}
          <Section icon={<Shapes className="w-4 h-4" />} title="Bubble shape">
            <div className="grid grid-cols-2 gap-3">
              {(['rounded', 'sharp'] as BubbleShape[]).map((shape) => (
                <button
                  key={shape}
                  onClick={() => s.setBubbleShape(shape)}
                  className={classNames(
                    'p-3 rounded-xl border transition-all flex flex-col items-center gap-2',
                    settings.bubble_shape === shape ? 'accent-border bg-active-soft' : 'border-soft bg-input hover:border-strong',
                  )}
                >
                  <div
                    className={classNames(
                      'w-10 h-7 accent-bg',
                      shape === 'rounded' && 'rounded-xl',
                      shape === 'sharp' && 'rounded-[3px]',
                      shape === 'cloud' && 'rounded-[16px_16px_16px_4px]',
                    )}
                  />
                  <span className="text-xs capitalize text-secondary">{shape}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* BUBBLE COLORS */}
          <Section icon={<MessageSquare className="w-4 h-4" />} title="Bubble colors">
            <div className="space-y-3">
              <ColorToggle
                label="Sent messages"
                value={settings.bubble_color_sent}
                options={[{ v: 'accent', label: 'Accent' }, { v: 'neutral', label: 'Neutral' }]}
                onChange={(v) => s.setBubbleColorSent(v as typeof settings.bubble_color_sent)}
              />
              <ColorToggle
                label="Received messages"
                value={settings.bubble_color_received}
                options={[{ v: 'accent', label: 'Accent' }, { v: 'neutral', label: 'Neutral' }]}
                onChange={(v) => s.setBubbleColorReceived(v as typeof settings.bubble_color_received)}
              />
            </div>
          </Section>

          {/* CHAT BACKGROUND */}
          <Section icon={<ImageIcon className="w-4 h-4" />} title="Chat background">
            <div className="grid grid-cols-4 gap-2 mb-3">
              <BgTile active={settings.chat_bg_type === 'pattern'} onClick={() => s.setChatBg('pattern', 'dots')} label="Dots">
                <div className="chat-bg-pattern" />
              </BgTile>
              {gradients.map((g, i) => (
                <BgTile key={i} active={settings.chat_bg_type === 'gradient' && settings.chat_bg_value === g} onClick={() => s.setChatBg('gradient', g)} label="Gradient">
                  <div style={{ background: g }} className="w-full h-full min-h-[50px] aspect-square rounded-xl block" />
                </BgTile>
              ))}
            </div>
            <label className="flex items-center gap-2 px-3 py-2.5 bg-input rounded-xl cursor-pointer hover:border-strong border border-soft transition-colors text-sm text-secondary">
              <Upload className="w-4 h-4" />
              Upload custom image
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </label>
            {customBg && (
              <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {customBg.startsWith('linear-gradient') ? 'Gradient background applied' : 'Custom background applied'}
              </p>
            )}
          </Section>

          {/* FONT SIZE */}
          <Section icon={<Type className="w-4 h-4" />} title="Font size">
            <div className="space-y-2">
              {(['small', 'medium', 'large'] as FontSize[]).map((f) => (
                <button
                  key={f}
                  onClick={() => s.setFontSize(f)}
                  className={classNames(
                    'w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all',
                    settings.font_size === f ? 'accent-bg text-white' : 'bg-input text-secondary hover:text-primary',
                  )}
                >
                  <span className="capitalize">{f}</span>
                  <span style={{ fontSize: f === 'small' ? 13 : f === 'large' ? 17 : 15 }}>Aa</span>
                </button>
              ))}
            </div>
          </Section>

          <div className="pt-2">
            <button
              onClick={() => {
                s.setTheme('dark'); s.setAccent('violet'); s.setBubbleShape('rounded');
                s.setBubbleColorSent('accent'); s.setBubbleColorReceived('neutral');
                s.setChatBg('solid', 'default'); s.setFontSize('medium');
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-input text-secondary text-sm hover:text-primary transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reset to defaults
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-primary mb-3">
        <span className="text-muted">{icon}</span> {title}
      </h3>
      {children}
    </section>
  );
}

function ThemeCard({ active, onClick, label, preview }: { active: boolean; onClick: () => void; label: string; preview: React.ReactNode }) {
  return (
    <button onClick={onClick} className={classNames('rounded-xl overflow-hidden border-2 transition-all', active ? 'accent-border scale-[1.02]' : 'border-soft hover:border-strong')}>
      {preview}
      <div className={classNames('py-2 text-xs font-medium', active ? 'accent-text' : 'text-secondary')}>{label}</div>
    </button>
  );
}

function ColorToggle({ label, value, options, onChange }: {
  label: string; value: string; options: { v: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-secondary mb-1.5">{label}</p>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={classNames('flex-1 py-2 rounded-lg text-sm transition-all', value === o.v ? 'accent-bg text-white' : 'bg-input text-secondary hover:text-primary')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BgTile({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={classNames('aspect-square rounded-xl overflow-hidden border-2 relative transition-all', active ? 'accent-border scale-105' : 'border-soft hover:border-strong')} title={label}>
      {children}
    </button>
  );
}
