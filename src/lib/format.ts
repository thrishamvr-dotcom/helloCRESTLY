export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'Today';
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function relativeLastSeen(iso: string, online: boolean): string {
  if (online) return 'online';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `last seen ${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `last seen ${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `last seen ${day}d ago`;
}

export function countdown(target: Date, now: number): string {
  const diff = target.getTime() - now;
  if (diff <= 0) return 'sending now';
  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  if (days > 0) return `in ${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `in ${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `in ${mins}m ${secs}s`;
  return `in ${secs}s`;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hues = [262, 160, 210, 340, 38, 188, 290, 172, 24, 96];
  const hue = hues[Math.abs(hash) % hues.length];
  return `hsl(${hue}, 55%, 45%)`;
}

// Deterministic pseudo-random waveform bars from a seed string.
export function waveformBars(seed: string, count = 40): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bars: number[] = [];
  let x = h || 1;
  for (let i = 0; i < count; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const v = (x / 0x7fffffff) * 0.7 + 0.3;
    const envelope = Math.sin((i / count) * Math.PI);
    bars.push(Math.max(0.18, Math.min(1, v * envelope)));
  }
  return bars;
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
