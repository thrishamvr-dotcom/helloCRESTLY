import { classNames } from '@/lib/format';

// Crestly logo: a "C" arc cradling a connected speech bubble.
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      className={classNames('rounded-2xl accent-gradient flex items-center justify-center accent-glow', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M21.5 8.5 A9 9 0 1 0 21.5 23.5" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
        <rect x="13" y="12" width="8.5" height="6.8" rx="2.4" fill="white" />
        <path d="M14.5 18.6 L12 21 L15.5 19 Z" fill="white" />
      </svg>
    </div>
  );
}
