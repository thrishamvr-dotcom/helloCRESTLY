import { useState } from 'react';
import { Calendar, Clock, Repeat, X, Check, Edit3, Trash2, AlarmClock } from 'lucide-react';
import type { ScheduledMessage, Recurrence, Chat } from '@/lib/types';
import { countdown, classNames } from '@/lib/format';
import { useNow } from '@/lib/use-now';

interface Props {
  open: boolean;
  onClose: () => void;
  chat: Chat | null;
  scheduled: ScheduledMessage[];
  now: number;
  onSchedule: (body: string, sendAt: string, recurrence: Recurrence) => Promise<void>;
  onUpdate: (id: string, body: string, sendAt: string, recurrence: Recurrence) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}

export function SchedulerPanel({ open, onClose, chat, scheduled, now, onSchedule, onUpdate, onCancel }: Props) {
  const [body, setBody] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const chatScheduled = scheduled.filter((s) => s.chat_id === chat?.id);

  function reset() {
    setBody(''); setDate(''); setTime(''); setRecurrence('none'); setEditingId(null);
  }

  async function submit() {
    if (!body.trim() || !date || !time) return;
    const sendAt = new Date(`${date}T${time}`).toISOString();
    setBusy(true);
    try {
      if (editingId) await onUpdate(editingId, body.trim(), sendAt, recurrence);
      else await onSchedule(body.trim(), sendAt, recurrence);
      reset();
    } finally { setBusy(false); }
  }

  function edit(s: ScheduledMessage) {
    const d = new Date(s.send_at);
    setBody(s.body);
    setDate(d.toISOString().slice(0, 10));
    setTime(d.toTimeString().slice(0, 5));
    setRecurrence(s.recurrence);
    setEditingId(s.id);
  }

  const minDateTime = new Date(Date.now() + 60000);
  const minDateStr = minDateTime.toISOString().slice(0, 10);
  const minTimeStr = minDateTime.toTimeString().slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between px-5 py-4 border-b border-soft">
          <h2 className="font-bold text-primary flex items-center gap-2">
            <AlarmClock className="w-5 h-5 accent-text" /> Scheduled messages
            {chat && <span className="text-sm text-muted font-normal">· {chat.name}</span>}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg text-secondary"><X className="w-5 h-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Existing scheduled */}
          {chatScheduled.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Pending</p>
              {chatScheduled.map((s) => (
                <div key={s.id} className="bg-input rounded-xl p-3 border border-soft">
                  <p className="text-sm text-primary mb-1.5">{s.body}</p>
                  <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{countdown(new Date(s.send_at), now)}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(s.send_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    {s.recurrence !== 'none' && <span className="flex items-center gap-1 accent-text capitalize"><Repeat className="w-3 h-3" />{s.recurrence}</span>}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => edit(s)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-hover-soft text-secondary hover:text-primary">
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => onCancel(s.id)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-500/10">
                      <Trash2 className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide">{editingId ? 'Edit scheduled message' : 'Schedule a new message'}</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              rows={3}
              className="w-full bg-input rounded-xl px-3.5 py-3 text-sm text-primary outline-none resize-none border border-soft focus:border-strong"
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-secondary mb-1 block flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date</span>
                <input type="date" value={date} min={minDateStr} onChange={(e) => setDate(e.target.value)} className="w-full bg-input rounded-xl px-3 py-2.5 text-sm text-primary outline-none" />
              </label>
              <label className="block">
                <span className="text-xs text-secondary mb-1 block flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Time</span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-input rounded-xl px-3 py-2.5 text-sm text-primary outline-none" />
              </label>
            </div>
            <div>
              <span className="text-xs text-secondary mb-1.5 block flex items-center gap-1"><Repeat className="w-3.5 h-3.5" /> Repeat</span>
              <div className="flex gap-2">
                {(['none', 'daily', 'weekly', 'monthly'] as Recurrence[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRecurrence(r)}
                    className={classNames('flex-1 py-2 rounded-lg text-xs capitalize transition-all', recurrence === r ? 'accent-bg text-white' : 'bg-input text-secondary hover:text-primary')}
                  >
                    {r === 'none' ? 'Once' : r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <footer className="flex gap-2 px-5 py-4 border-t border-soft">
          <button onClick={() => { reset(); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-input text-secondary text-sm hover:text-primary">Close</button>
          <button
            onClick={submit}
            disabled={busy || !body.trim() || !date || !time}
            className="flex-1 py-2.5 rounded-xl accent-bg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {busy ? 'Saving…' : editingId ? <><Check className="w-4 h-4" /> Update</> : <><Clock className="w-4 h-4" /> Schedule</>}
          </button>
        </footer>
      </div>
    </div>
  );
}
