import { Download, FileText, Play, Pause } from 'lucide-react';
import type { Message } from '@/lib/types';
import { useSettings } from '@/lib/settings-context';
import { useAudioPlayer, SPEEDS } from '@/lib/audio-player-context';
import { formatTime, formatBytes, waveformBars, classNames, formatDuration } from '@/lib/format';
import { TickMarks } from './TickMarks';

interface Props {
  message: Message;
  showAvatar: boolean;
  isGroup: boolean;
}

export function MessageBubble({ message, showAvatar, isGroup }: Props) {
  const { settings } = useSettings();
  const audio = useAudioPlayer();
  const me = message.is_me;
  const shape = settings?.bubble_shape ?? 'rounded';
  const isAudio = message.kind === 'voice';
  const isImage = message.kind === 'image';
  const isFile = message.kind === 'file';
  const isPlayingThis = audio.message?.id === message.id && audio.isPlaying;
  const isCurrentTrack = audio.message?.id === message.id;

  const sentClass = settings?.bubble_color_sent === 'neutral' ? 'bubble-sent-neutral' : 'bubble-sent-accent';
  const recvClass = settings?.bubble_color_received === 'neutral' ? 'bubble-recv-neutral' : 'bubble-recv-accent';
  const colorClass = me ? sentClass : recvClass;
  const shapeClass = `bubble-${shape}${me ? ' me' : ' them'}`;

  return (
    <div className={classNames('flex items-end gap-2 animate-slide-up', me ? 'justify-end' : 'justify-start')}>
      {!me && (
        <div className="w-7 shrink-0">
          {showAvatar && isGroup && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--accent)' }}>
              {message.sender_name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      )}
      <div className={classNames('max-w-[75%] sm:max-w-[68%] md:max-w-[60%] px-3 py-2 shadow-sm', shapeClass, colorClass)}>
        {!me && isGroup && showAvatar && (
          <p className="text-xs font-semibold mb-0.5 accent-text">{message.sender_name}</p>
        )}

        {isImage && message.media_url && (
          <div className="mb-1 -mx-1 -mt-1 overflow-hidden rounded-lg">
            <img src={message.media_url} alt={message.media_name ?? 'shared image'} className="max-w-full max-h-72 object-cover" loading="lazy" />
          </div>
        )}

        {isFile && (
          <a
            href={message.media_url ?? '#'}
            download={message.media_name ?? undefined}
            className="flex items-center gap-3 py-1 min-w-[180px]"
            onClick={(e) => { if (!message.media_url) e.preventDefault(); }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-black/20">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.media_name ?? 'file'}</p>
              <p className="text-xs opacity-70">{message.media_size ? formatBytes(message.media_size) : 'file'}</p>
            </div>
            <Download className="w-4 h-4 opacity-70" />
          </a>
        )}

        {isAudio && (
          <VoiceBubble message={message} me={me} isPlaying={isPlayingThis} isCurrent={isCurrentTrack} onToggle={() => {
            if (isCurrentTrack) audio.toggle();
            else audio.play(message, message.chat_id);
          }} />
        )}

        {(message.kind === 'text' || (!isImage && !isFile && !isAudio)) && message.body && (
          <p className="whitespace-pre-wrap break-words leading-relaxed" style={{ fontSize: 'var(--font-size-base)' }}>{message.body}</p>
        )}

        <div className={classNames('flex items-center gap-1 mt-0.5', me ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] opacity-60">{formatTime(message.created_at)}</span>
          {me && <TickMarks status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function VoiceBubble({ message, me, isPlaying, isCurrent, onToggle }: {
  message: Message; me: boolean; isPlaying: boolean; isCurrent: boolean; onToggle: () => void;
}) {
  const audio = useAudioPlayer();
  const bars = waveformBars(message.id, 36);
  const duration = message.audio_duration_sec ?? 0;
  const progress = isCurrent && audio.duration > 0 ? audio.currentTime / audio.duration : 0;

  return (
    <div className="flex items-center gap-3 py-1 min-w-[200px]">
      <button
        onClick={onToggle}
        className="w-9 h-9 rounded-full flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors shrink-0"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-[2px] h-7">
          {bars.map((h, i) => {
            const active = i / bars.length <= progress;
            return (
              <span
                key={i}
                className="flex-1 rounded-full transition-colors"
                style={{
                  height: `${h * 100}%`,
                  background: active ? 'currentColor' : 'color-mix(in srgb, currentColor 40%, transparent)',
                  opacity: active ? 1 : 0.6,
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] opacity-70">
            {isCurrent ? formatDuration(audio.currentTime) : formatDuration(duration)}
          </span>
          {isCurrent && (
            <select
              value={audio.speed}
              onChange={(e) => audio.setSpeed(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] bg-black/20 rounded px-1 py-0.5 outline-none cursor-pointer"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>{s}x</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

export function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex items-end gap-2 justify-start animate-fade-in">
      <div className="max-w-[60%] px-4 py-3 bubble-rounded them bubble-recv-neutral">
        <p className="text-xs accent-text mb-1 font-medium">{name} is typing</p>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2 h-2 rounded-full bg-current opacity-60 typing-dot" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
