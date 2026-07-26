import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Send, Paperclip, Image as ImageIcon, Mic, ArrowLeft, MoreVertical,
  Search, AlarmClock, Sparkles,
} from 'lucide-react';
import type { Chat, Message } from '@/lib/types';
import { useSettings } from '@/lib/settings-context';
import { useAudioPlayer } from '@/lib/audio-player-context';
import { relativeLastSeen, classNames, formatDayLabel } from '@/lib/format';
import { Avatar, AiBadge } from './Avatar';
import { Logo } from '@/components/Logo';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { AudioPlayerBar } from './AudioPlayerBar';

interface Props {
  chat: Chat | null;
  messages: Message[];
  online: boolean;
  lastSeen: string;
  onBack: () => void;
  onSend: (body: string, kind?: Message['kind'], meta?: Partial<Message>) => void;
  onAttachImage: (file: File) => void;
  onAttachFile: (file: File) => void;
  onRecordVoice: (durationSec: number) => void;
  onOpenScheduler: () => void;
  onOpenSettings: () => void;
  isAiTyping: boolean;
  composerExtra?: ReactNode;
}

export function ChatWindow({
  chat, messages, online, lastSeen, onBack, onSend, onAttachImage, onAttachFile,
  onRecordVoice, onOpenScheduler, onOpenSettings, isAiTyping,
}: Props) {
  const { settings } = useSettings();
  const audio = useAudioPlayer();
  const [text, setText] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileImgRef = useRef<HTMLInputElement>(null);
  const fileDocRef = useRef<HTMLInputElement>(null);
  const recordTimer = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isAiTyping, chat?.id]);

  useEffect(() => {
    setText('');
    setShowAttach(false);
    stopRecording();
  }, [chat?.id]);

  function send() {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  }

  function startRecording() {
    setRecording(true);
    setRecordSecs(0);
    recordTimer.current = window.setInterval(() => setRecordSecs((s) => s + 1), 1000);
  }
  function stopRecording(send = false) {
    if (recordTimer.current) { clearInterval(recordTimer.current); recordTimer.current = null; }
    if (send && recordSecs > 0) onRecordVoice(recordSecs);
    setRecording(false);
    setRecordSecs(0);
  }

  const bgStyle = computeBgStyle(settings);
  const isAi = chat?.is_ai_bot;

  // group messages by day for date separators
  const grouped = groupByDay(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {chat ? (
        <header className="glass border-b border-soft px-3 sm:px-4 py-2.5 flex items-center gap-3 z-10">
          <button onClick={onBack} className="btn-ghost p-2 rounded-lg text-secondary md:hidden" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Avatar name={chat.name} url={chat.avatar_url} size={42} isAiBot={chat.is_ai_bot} isGroup={chat.is_group} online={online} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-primary truncate">{chat.name}</h2>
              {chat.is_ai_bot && <AiBadge />}
              {chat.is_group && <span className="text-[10px] px-1.5 py-0.5 rounded bg-input text-muted">group</span>}
            </div>
            <p className={classNames('text-xs', online ? 'text-emerald-500' : 'text-muted')}>
              {isAi ? 'AI Assistant · always online' : chat.is_group ? `${chat.participant_count} members` : relativeLastSeen(lastSeen, online)}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={onOpenScheduler} className="btn-ghost p-2 rounded-lg text-secondary" title="Schedule message">
              <AlarmClock className="w-5 h-5" />
            </button>
            <button onClick={onOpenSettings} className="btn-ghost p-2 rounded-lg text-secondary" title="Customize">
              <Sparkles className="w-5 h-5" />
            </button>
            <button className="btn-ghost p-2 rounded-lg text-secondary hidden sm:block" aria-label="Search">
              <Search className="w-5 h-5" />
            </button>
            <button className="btn-ghost p-2 rounded-lg text-secondary" aria-label="More">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>
      ) : null}

      {/* AI hint banner */}
      {chat && isAi && (
        <div className="px-4 py-2 bg-input border-b border-soft text-xs text-secondary flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 accent-text" />
          Try <code className="px-1.5 py-0.5 rounded bg-hover-soft accent-text">/image &lt;desc&gt;</code> or <code className="px-1.5 py-0.5 rounded bg-hover-soft accent-text">/summarize</code>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className={classNames('flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1.5', !chat && 'hidden', bgStyle.className)}
        style={bgStyle.style}
      >
        {!chat ? (
          <EmptyState />
        ) : (
          <>
            {grouped.map(({ day, items }) => (
              <div key={day} className="space-y-1.5">
                <div className="flex justify-center my-3 sticky top-0 z-10">
                  <span className="glass text-[11px] text-secondary px-3 py-1 rounded-full shadow-sm">{day}</span>
                </div>
                {items.map((m, i) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    showAvatar={i === 0 || items[i - 1].sender_name !== m.sender_name}
                    isGroup={chat.is_group}
                  />
                ))}
              </div>
            ))}
            {isAiTyping && <TypingIndicator name={chat.name} />}
          </>
        )}
      </div>

      {/* Persistent audio bar */}
      <AudioPlayerBar />

      {/* Composer */}
      {chat && (
        <div className="glass border-t border-soft px-3 sm:px-4 py-3">
          {recording ? (
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse-dot" />
              <span className="text-sm text-secondary">Recording… {Math.floor(recordSecs / 60)}:{(recordSecs % 60).toString().padStart(2, '0')}</span>
              <div className="flex-1" />
              <button onClick={() => stopRecording(false)} className="btn-ghost px-3 py-2 rounded-lg text-secondary text-sm">Cancel</button>
              <button onClick={() => stopRecording(true)} className="accent-bg text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5">
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="relative">
                <button onClick={() => setShowAttach((v) => !v)} className="btn-ghost p-2.5 rounded-xl text-secondary" aria-label="Attach">
                  <Paperclip className="w-5 h-5" />
                </button>
                {showAttach && (
                  <div className="absolute bottom-full mb-2 left-0 glass rounded-xl shadow-lg py-1 min-w-[160px] animate-scale-in z-20">
                    <button onClick={() => { fileImgRef.current?.click(); setShowAttach(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover-soft">
                      <ImageIcon className="w-4 h-4" /> Photo
                    </button>
                    <button onClick={() => { fileDocRef.current?.click(); setShowAttach(false); }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover-soft">
                      <Paperclip className="w-4 h-4" /> Document
                    </button>
                  </div>
                )}
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={isAi ? 'Ask the AI assistant…' : 'Type a message'}
                rows={1}
                className="flex-1 bg-input rounded-xl px-3.5 py-2.5 text-sm text-primary outline-none resize-none max-h-32 border border-soft focus:border-strong"
                style={{ fontSize: 'var(--font-size-base)' }}
              />
              {text.trim() ? (
                <button onClick={send} className="accent-bg text-white p-2.5 rounded-xl transition-transform active:scale-95 accent-glow" aria-label="Send">
                  <Send className="w-5 h-5" />
                </button>
              ) : (
                <button onClick={startRecording} className="btn-ghost p-2.5 rounded-xl text-secondary" aria-label="Record voice message" title="Hold to record">
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          <input ref={fileImgRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAttachImage(e.target.files[0])} />
          <input ref={fileDocRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onAttachFile(e.target.files[0])} />
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <Logo size={80} className="mb-5" />
      <h2 className="text-xl font-bold text-primary mb-2">Welcome to Crestly</h2>
      <p className="text-secondary text-sm max-w-xs">Select a chat to start messaging, or talk to your built-in AI assistant.</p>
    </div>
  );
}

function groupByDay(messages: Message[]): Array<{ day: string; items: Message[] }> {
  const out: Array<{ day: string; items: Message[] }> = [];
  for (const m of messages) {
    const label = formatDayLabel(m.created_at);
    const last = out[out.length - 1];
    if (last && last.day === label) last.items.push(m);
    else out.push({ day: label, items: [m] });
  }
  return out;
}

function computeBgStyle(settings: { chat_bg_type: string; chat_bg_value: string } | null): { className: string; style: React.CSSProperties } {
  if (!settings) return { className: 'chat-bg-default', style: {} };
  if (settings.chat_bg_type === 'gradient') return { className: '', style: { background: settings.chat_bg_value } };
  if (settings.chat_bg_type === 'custom') return { className: '', style: { backgroundImage: `url(${settings.chat_bg_value})`, backgroundSize: 'cover', backgroundPosition: 'center' } };
  if (settings.chat_bg_type === 'pattern') return { className: 'chat-bg-pattern', style: {} };
  return { className: 'chat-bg-default', style: {} };
}
