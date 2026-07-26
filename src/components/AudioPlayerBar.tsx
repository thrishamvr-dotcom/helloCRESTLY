import { Play, Pause, X, FastForward } from 'lucide-react';
import { useAudioPlayer, SPEEDS } from '@/lib/audio-player-context';
import { formatDuration, waveformBars, classNames } from '@/lib/format';

export function AudioPlayerBar() {
  const audio = useAudioPlayer();
  if (!audio.message) return null;

  const bars = waveformBars(audio.message.id, 48);
  const progress = audio.duration > 0 ? audio.currentTime / audio.duration : 0;
  const sender = audio.message.sender_name;

  return (
    <div className="glass border-t border-soft px-4 py-2.5 flex items-center gap-3 animate-slide-up">
      <button
        onClick={audio.toggle}
        className="w-10 h-10 rounded-full accent-bg text-white flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity accent-glow"
        aria-label={audio.isPlaying ? 'Pause' : 'Play'}
      >
        {audio.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-secondary truncate">Voice message · {sender}</span>
          <span className="text-xs text-muted tabular-nums">{formatDuration(audio.currentTime)} / {formatDuration(audio.duration || (audio.message.audio_duration_sec ?? 0))}</span>
        </div>
        <div className="flex items-center gap-[2px] h-6">
          {bars.map((h, i) => {
            const active = i / bars.length <= progress;
            return (
              <button
                key={i}
                onClick={() => audio.seek((i / bars.length) * (audio.duration || 1))}
                className="flex-1 rounded-full transition-colors"
                style={{
                  height: `${h * 100}%`,
                  background: active ? 'var(--accent)' : 'color-mix(in srgb, var(--text-primary) 30%, transparent)',
                }}
                aria-label={`Seek to ${Math.round((i / bars.length) * 100)}%`}
              />
            );
          })}
        </div>
      </div>

      {/* speed control */}
      <div className="flex items-center gap-1 shrink-0">
        <FastForward className="w-3.5 h-3.5 text-muted" />
        <div className="flex bg-input rounded-lg p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => audio.setSpeed(s)}
              className={classNames('px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors', audio.speed === s ? 'accent-bg text-white' : 'text-secondary hover:text-primary')}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <button onClick={audio.stop} className="btn-ghost p-2 rounded-lg text-secondary" aria-label="Close player">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
