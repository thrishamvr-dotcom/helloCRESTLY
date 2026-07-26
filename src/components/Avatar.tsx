import { Bot } from 'lucide-react';
import { initials, colorFromString, classNames } from '@/lib/format';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
  online?: boolean;
  isAiBot?: boolean;
  isGroup?: boolean;
  className?: string;
}

export function Avatar({ name, url, size = 44, online, isAiBot, isGroup, className }: AvatarProps) {
  const dim = { width: size, height: size };
  const ringStyle = isAiBot ? { boxShadow: '0 0 0 2px var(--accent), 0 0 16px -4px var(--accent-glow)' } : undefined;

  return (
    <div className={classNames('relative shrink-0', className)} style={dim}>
      {url ? (
        <img
          src={url}
          alt={name}
          width={size}
          height={size}
          className={classNames('rounded-full object-cover w-full h-full', isGroup && 'rounded-xl')}
          style={ringStyle}
          loading="lazy"
        />
      ) : isAiBot ? (
        <div className="w-full h-full rounded-full accent-gradient flex items-center justify-center" style={ringStyle}>
          <Bot className="text-white" style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.2} />
        </div>
      ) : (
        <div
          className={classNames('w-full h-full rounded-full flex items-center justify-center font-semibold text-white', isGroup && 'rounded-xl')}
          style={{ background: colorFromString(name), fontSize: size * 0.38, ...ringStyle }}
        >
          {initials(name)}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-emerald-500 border-2"
          style={{ width: size * 0.26, height: size * 0.26, borderColor: 'var(--bg-panel)' }}
        />
      )}
    </div>
  );
}

export function AiBadge({ className }: { className?: string }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide accent-bg text-white',
        className,
      )}
    >
      <Bot className="w-3 h-3" strokeWidth={2.5} />
      AI
    </span>
  );
}
