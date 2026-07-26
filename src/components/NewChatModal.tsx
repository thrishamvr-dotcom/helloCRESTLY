import { useState } from 'react';
import { X, MessageSquare, Users, Bot, Check } from 'lucide-react';
import { classNames } from '@/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, opts: { isGroup: boolean }) => void;
}

export function NewChatModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [isGroup, setIsGroup] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="glass rounded-2xl p-5 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-primary">New chat</h3>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg text-secondary"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setIsGroup(false)}
            className={classNames('flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all', !isGroup ? 'accent-border bg-active-soft' : 'border-soft bg-input')}
          >
            <MessageSquare className={classNames('w-5 h-5', !isGroup ? 'accent-text' : 'text-secondary')} />
            <span className="text-xs text-secondary">1:1 chat</span>
          </button>
          <button
            onClick={() => setIsGroup(true)}
            className={classNames('flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all', isGroup ? 'accent-border bg-active-soft' : 'border-soft bg-input')}
          >
            <Users className={classNames('w-5 h-5', isGroup ? 'accent-text' : 'text-secondary')} />
            <span className="text-xs text-secondary">Group</span>
          </button>
        </div>

        <label className="block mb-4">
          <span className="text-xs text-secondary mb-1.5 block">{isGroup ? 'Group name' : 'Contact name'}</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isGroup ? 'e.g. Project Team' : 'e.g. Jordan Lee'}
            className="w-full bg-input rounded-xl px-3.5 py-2.5 text-sm text-primary outline-none border border-soft focus:border-strong"
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { onCreate(name.trim(), { isGroup }); setName(''); onClose(); } }}
          />
        </label>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-input text-secondary text-sm hover:text-primary">Cancel</button>
          <button
            onClick={() => { if (name.trim()) { onCreate(name.trim(), { isGroup }); setName(''); onClose(); } }}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl accent-bg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Create
          </button>
        </div>
      </div>
    </div>
  );
}

export function AiHint() {
  return <Bot className="w-4 h-4 accent-text" />;
}
