import { useMemo, useState } from 'react';
import {
  Search, Settings, Archive, Plus, Folder as FolderIcon, ChevronRight, ChevronDown,
  Pin, MessageSquarePlus, MoreVertical, LogOut, Trash2, FolderPlus, X,
} from 'lucide-react';
import type { Chat, Folder } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useSettings } from '@/lib/settings-context';
import { formatTime, classNames, relativeLastSeen } from '@/lib/format';
import { Avatar, AiBadge } from './Avatar';
import { Logo } from '@/components/Logo';

interface Props {
  chats: (Chat & { last_message?: { body: string | null; kind: string; created_at: string; sender_name: string } | null })[];
  folders: Folder[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onOpenSettings: () => void;
  onMoveChatToFolder: (chatId: string, folderId: string | null) => void;
  onCreateFolder: (parent: string | null, name: string, emoji: string, color: string) => void;
  onDeleteFolder: (id: string) => void;
  onTogglePinFolder: (id: string, pinned: boolean) => void;
  onCreateChat: () => void;
  search: string;
  setSearch: (s: string) => void;
}

const FOLDER_EMOJIS = ['📁', '💼', '👨‍👩‍👧', '🎉', '⭐', '❤️', '🚀', '🎯', '🏠', '📚', '🎮', '✈️'];
const FOLDER_COLORS = ['violet', 'emerald', 'blue', 'rose', 'amber', 'cyan', 'fuchsia', 'teal', 'orange', 'lime'];

export function Sidebar({
  chats, folders, activeChatId, onSelectChat, onOpenSettings,
  onMoveChatToFolder, onCreateFolder, onDeleteFolder, onTogglePinFolder,
  onCreateChat, search, setSearch,
}: Props) {
  const { profile, signOut } = useAuth();
  const { settings } = useSettings();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [menuFolderId, setMenuFolderId] = useState<string | null>(null);
  const [showFolderForm, setShowFolderForm] = useState<{ parent: string | null } | null>(null);
  const [dragChatId, setDragChatId] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'archive' | string>(`folder:root`);

  const toggleExpand = (id: string) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const folderTree = useMemo(() => {
    const byParent = new Map<string | null, Folder[]>();
    for (const f of folders) {
      const key = f.parent_id;
      const list = byParent.get(key);
      if (list) list.push(f);
      else byParent.set(key, [f]);
    }
    const sort = (list: Folder[]) => list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.sort_order - b.sort_order);
    sort(byParent.get(null) ?? []);
    return byParent;
  }, [folders]);

  const rootFolders = folderTree.get(null) ?? [];
  const archiveFolder = rootFolders.find((f) => f.is_archive);

  const chatsForView = useMemo(() => {
    let list = chats;
    if (view === 'archive') list = chats.filter((c) => c.is_archived);
    else if (view === 'all') list = chats.filter((c) => !c.is_archived);
    else if (view.startsWith('folder:')) {
      const fid = view.slice(7);
      // include chats in this folder OR any descendant folder
      const descendant = new Set<string>([fid]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const f of folders) {
          if (descendant.has(f.parent_id ?? '') && !descendant.has(f.id)) { descendant.add(f.id); changed = true; }
        }
      }
      list = chats.filter((c) => c.folder_id && descendant.has(c.folder_id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.last_message?.body?.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [chats, folders, view, search]);

  function handleDrop(folderId: string | null) {
    if (dragChatId) onMoveChatToFolder(dragChatId, folderId);
    setDragChatId(null);
    setDragOverFolder(null);
  }

  return (
    <div className="flex flex-col h-full panel-bg border-r border-soft">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-soft">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <div>
            <h1 className="font-bold text-primary leading-tight">Crestly</h1>
            <p className="text-[10px] text-muted leading-tight">2026 edition</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onCreateChat} className="btn-ghost p-2 rounded-lg text-secondary" aria-label="New chat" title="New chat">
            <Plus className="w-5 h-5" />
          </button>
          <button onClick={onOpenSettings} className="btn-ghost p-2 rounded-lg text-secondary" aria-label="Settings" title="Customize">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 bg-input rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats"
            className="bg-transparent outline-none text-sm flex-1 text-primary placeholder:text-muted"
          />
          {search && <button onClick={() => setSearch('')} className="text-muted hover:text-primary"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* Folders nav */}
      <div className="px-2 pb-1 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-1 flex-wrap">
          <FolderChip active={view === 'all'} onClick={() => setView('all')} icon={<MessageSquarePlus className="w-3.5 h-3.5" />} label="All" />
          <FolderChip active={view === 'archive'} onClick={() => setView('archive')} icon={<Archive className="w-3.5 h-3.5" />} label="Archive" />
          {rootFolders.filter((f) => !f.is_archive).map((f) => (
            <FolderChip
              key={f.id}
              active={view === `folder:${f.id}`}
              onClick={() => setView(`folder:${f.id}`)}
              label={`${f.emoji} ${f.name}`}
              pinned={f.pinned}
            />
          ))}
          <button
            onClick={() => setShowFolderForm({ parent: null })}
            className="btn-ghost p-1.5 rounded-lg text-muted hover:text-primary"
            aria-label="New folder"
            title="New folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Folder tree + chat list */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
        {/* Folder tree */}
        <div className="px-1.5 py-1">
          {rootFolders.map((f) => (
            <FolderRow
              key={f.id}
              folder={f}
              folders={folders}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onSelect={(id) => setView(`folder:${id}`)}
              activeView={view}
              onMenu={(id) => setMenuFolderId(id)}
              onAddChild={(parent) => setShowFolderForm({ parent })}
              dragOver={dragOverFolder}
              onDragOver={(id) => { setDragOverFolder(id); }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={(id) => handleDrop(id)}
            />
          ))}
        </div>

        {/* Chat list */}
        <div className="mt-1 space-y-0.5 px-1.5"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={() => handleDrop(null)}
        >
          {chatsForView.length === 0 && (
            <p className="text-center text-muted text-sm py-10">{search ? 'No chats match your search.' : 'No chats here yet.'}</p>
          )}
          {chatsForView.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              active={chat.id === activeChatId}
              accent={settings?.accent ?? 'violet'}
              onClick={() => onSelectChat(chat.id)}
              onDragStart={() => setDragChatId(chat.id)}
            />
          ))}
        </div>
      </div>

      {/* Profile footer */}
      <div className="flex items-center gap-3 px-3 py-3 border-t border-soft">
        <Avatar name={profile?.display_name ?? 'Me'} url={profile?.avatar_url ?? undefined} size={36} online />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary truncate">{profile?.display_name ?? 'Me'}</p>
          <p className="text-[11px] text-emerald-500">online</p>
        </div>
        <button onClick={signOut} className="btn-ghost p-2 rounded-lg text-secondary" aria-label="Sign out" title="Sign out">
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Folder context menu */}
      {menuFolderId && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuFolderId(null)} />
          <div className="fixed z-50 glass rounded-xl shadow-lg py-1 min-w-[180px] text-sm"
            style={{ left: 16, top: 200 }}>
            {(() => {
              const f = folders.find((x) => x.id === menuFolderId);
              if (!f) return null;
              return (
                <>
                  <MenuBtn onClick={() => { onTogglePinFolder(f.id, !f.pinned); setMenuFolderId(null); }} icon={<Pin className="w-4 h-4" />}>{f.pinned ? 'Unpin' : 'Pin to top'}</MenuBtn>
                  <MenuBtn onClick={() => { setShowFolderForm({ parent: f.id }); setMenuFolderId(null); }} icon={<FolderPlus className="w-4 h-4" />}>Add subfolder</MenuBtn>
                  {!f.is_archive && (
                    <MenuBtn onClick={() => { onDeleteFolder(f.id); setMenuFolderId(null); }} icon={<Trash2 className="w-4 h-4" />} danger>Delete</MenuBtn>
                  )}
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* New folder form */}
      {showFolderForm && (
        <FolderForm
          onClose={() => setShowFolderForm(null)}
          onCreate={(name, emoji, color) => { onCreateFolder(showFolderForm.parent, name, emoji, color); setShowFolderForm(null); }}
        />
      )}
    </div>
  );
}

function FolderChip({ active, onClick, icon, label, pinned }: { active: boolean; onClick: () => void; icon?: React.ReactNode; label: string; pinned?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
        active ? 'accent-bg text-white' : 'bg-input text-secondary hover:text-primary',
      )}
    >
      {icon}{label}{pinned && <Pin className="w-3 h-3" />}
    </button>
  );
}

function FolderRow({
  folder, folders, expanded, toggleExpand, onSelect, activeView, onMenu, onAddChild,
  dragOver, onDragOver, onDragLeave, onDrop,
}: {
  folder: Folder; folders: Folder[]; expanded: Set<string>; toggleExpand: (id: string) => void;
  onSelect: (id: string) => void; activeView: string; onMenu: (id: string) => void; onAddChild: (parent: string) => void;
  dragOver: string | null; onDragOver: (id: string) => void; onDragLeave: () => void; onDrop: (id: string) => void;
}) {
  const children = folders.filter((f) => f.parent_id === folder.id);
  const isExpanded = expanded.has(folder.id);
  const isDraggingOver = dragOver === folder.id;
  const depth = getDepth(folder, folders);

  return (
    <div>
      <div
        className={classNames(
          'flex items-center gap-1 px-2 py-1.5 rounded-lg group transition-colors',
          isDraggingOver ? 'accent-border border bg-active-soft' : 'hover:bg-hover-soft border border-transparent',
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragOver(folder.id); }}
        onDragLeave={onDragLeave}
        onDrop={(e) => { e.stopPropagation(); onDrop(folder.id); }}
      >
        {children.length > 0 ? (
          <button onClick={() => toggleExpand(folder.id)} className="p-0.5 text-muted hover:text-primary">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4.5 inline-block" />
        )}
        <button onClick={() => onSelect(folder.id)} className="flex-1 flex items-center gap-1.5 text-left min-w-0">
          <span className="text-sm">{folder.emoji}</span>
          <span className={classNames('text-sm truncate', activeView === `folder:${folder.id}` ? 'accent-text font-medium' : 'text-secondary')}>{folder.name}</span>
          {folder.pinned && <Pin className="w-3 h-3 text-muted" />}
        </button>
        <button onClick={() => onMenu(folder.id)} className="btn-ghost p-1 rounded text-muted opacity-0 group-hover:opacity-100">
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>
      {isExpanded && children.map((c) => (
        <FolderRow
          key={c.id} folder={c} folders={folders} expanded={expanded} toggleExpand={toggleExpand}
          onSelect={onSelect} activeView={activeView} onMenu={onMenu} onAddChild={onAddChild}
          dragOver={dragOver} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        />
      ))}
    </div>
  );
}

function getDepth(folder: Folder, all: Folder[]): number {
  let d = 0, cur: Folder | undefined = folder;
  while (cur?.parent_id) { cur = all.find((f) => f.id === cur!.parent_id); d++; if (!cur) break; }
  return d;
}

function ChatListItem({ chat, active, onClick, onDragStart }: {
  chat: Chat & { last_message?: { body: string | null; kind: string; created_at: string; sender_name: string } | null };
  active: boolean; accent: string; onClick: () => void; onDragStart: () => void;
}) {
  const last = chat.last_message;
  const preview = !last ? 'No messages yet'
    : last.kind === 'image' ? 'Photo'
    : last.kind === 'file' ? (last.body || 'File')
    : last.kind === 'voice' ? 'Voice message'
    : last.body ?? '';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={classNames(
        'flex items-center gap-3 px-2.5 py-2.5 rounded-xl cursor-pointer transition-colors',
        active ? 'bg-active-soft' : 'hover:bg-hover-soft',
      )}
    >
      <Avatar name={chat.name} url={chat.avatar_url} size={48} isAiBot={chat.is_ai_bot} isGroup={chat.is_group} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-primary text-sm truncate flex items-center gap-1">
            {chat.name}
            {chat.is_ai_bot && <AiBadge />}
          </span>
          {chat.is_pinned && <Pin className="w-3 h-3 text-muted shrink-0" />}
          <span className="text-[10px] text-muted ml-auto shrink-0">{last ? formatTime(last.created_at) : ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <p className="text-xs text-secondary truncate flex-1">
            {last && !chat.is_ai_bot && last.sender_name !== 'Me' ? `${last.sender_name}: ` : ''}{preview}
          </p>
          {chat.is_group && !chat.is_ai_bot && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-input text-muted shrink-0">group</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuBtn({ onClick, icon, children, danger }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} className={classNames('flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-hover-soft', danger ? 'text-rose-500' : 'text-secondary hover:text-primary')}>
      {icon}{children}
    </button>
  );
}

function FolderForm({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, emoji: string, color: string) => void }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [color, setColor] = useState('violet');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="glass rounded-2xl p-5 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-primary mb-4">New folder</h3>
        <input
          autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Folder name"
          className="w-full bg-input rounded-xl px-3.5 py-2.5 text-sm text-primary outline-none mb-4"
        />
        <p className="text-xs text-secondary mb-1.5">Icon</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {FOLDER_EMOJIS.map((e) => (
            <button key={e} onClick={() => setEmoji(e)} className={classNames('w-8 h-8 rounded-lg text-lg flex items-center justify-center', emoji === e ? 'accent-bg' : 'bg-input')}>{e}</button>
          ))}
        </div>
        <p className="text-xs text-secondary mb-1.5">Color</p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {FOLDER_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={classNames('w-7 h-7 rounded-full', emoji === c && 'ring-2')} style={{ background: `var(--accent)` }} />
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-input text-secondary text-sm hover:text-primary">Cancel</button>
          <button onClick={() => name.trim() && onCreate(name.trim(), emoji, color)} className="flex-1 py-2.5 rounded-xl accent-bg text-white text-sm font-medium hover:opacity-90">Create</button>
        </div>
      </div>
    </div>
  );
}
