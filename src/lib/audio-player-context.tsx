import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import type { Message } from './types';

interface AudioPlayerState {
  message: Message | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  chatId: string | null;
}

interface AudioPlayerContextValue extends AudioPlayerState {
  play: (message: Message, chatId: string) => void;
  toggle: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setSpeed: (s: number) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const AudioPlayerContext = createContext<AudioPlayerContextValue | undefined>(undefined);

// Persistent player uses a shared <audio> element generated on demand.
// For demo voice messages (which have no real media_url), we synthesize a
// silent oscillator-based blob so playback works end-to-end.
export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    message: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1,
    chatId: null,
  });

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = 'auto';
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setState((s) => ({ ...s, currentTime: el.currentTime }));
    const onDuration = () => setState((s) => ({ ...s, duration: isFinite(el.duration) ? el.duration : (s.message?.audio_duration_sec ?? 0) }));
    const onEnd = () => setState((s) => ({ ...s, isPlaying: false, currentTime: 0 }));
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onDuration);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onDuration);
      el.removeEventListener('ended', onEnd);
    };
  }, [state.message]);

  const play = useCallback((message: Message, chatId: string) => {
    const el = ensureAudio();
    // If switching to a new message, load new source.
    if (state.message?.id !== message.id) {
      const url = message.media_url || makeSilentBlob(message.audio_duration_sec ?? 10);
      el.src = url;
      el.playbackRate = state.speed;
      el.currentTime = 0;
      setState((s) => ({ ...s, message, chatId, duration: message.audio_duration_sec ?? 0, currentTime: 0 }));
    }
    el.play().then(() => setState((s) => ({ ...s, isPlaying: true }))).catch(() => setState((s) => ({ ...s, isPlaying: false })));
  }, [ensureAudio, state.message, state.speed]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !state.message) return;
    if (state.isPlaying) {
      el.pause();
      setState((s) => ({ ...s, isPlaying: false }));
    } else {
      el.play().then(() => setState((s) => ({ ...s, isPlaying: true }))).catch(() => {});
    }
  }, [state.isPlaying, state.message]);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el) { el.pause(); el.currentTime = 0; }
    setState({ message: null, isPlaying: false, currentTime: 0, duration: 0, speed: 1, chatId: null });
  }, []);

  const seek = useCallback((time: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = time;
    setState((s) => ({ ...s, currentTime: time }));
  }, []);

  const setSpeed = useCallback((s: number) => {
    if (audioRef.current) audioRef.current.playbackRate = s;
    setState((prev) => ({ ...prev, speed: s }));
  }, []);

  const value: AudioPlayerContextValue = { ...state, play, toggle, stop, seek, setSpeed };
  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}

export { SPEEDS };

// Build a tiny silent WAV blob of a given length so the demo voice messages
// can actually "play" through the audio element.
function makeSilentBlob(durationSec: number): string {
  const sampleRate = 8000;
  const samples = Math.max(1, Math.floor(durationSec * sampleRate));
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples * 2, true);
  // leave samples as zero (silence)
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
