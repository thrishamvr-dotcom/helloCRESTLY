import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { SettingsProvider, useSettings } from '@/lib/settings-context';
import { AudioPlayerProvider } from '@/lib/audio-player-context';
import { useChatData } from '@/lib/use-chat-data';
import { useNow } from '@/lib/use-now';
import { supabase } from '@/lib/supabase';

function makeMsg(partial: Partial<Message> & { chat_id: string; user_id: string }): Message {
  return {
    id: crypto.randomUUID(),
    sender_name: 'Me',
    is_me: true,
    body: null,
    kind: 'text',
    media_url: null,
    media_name: null,
    media_size: null,
    audio_duration_sec: null,
    status: 'sent',
    created_at: new Date().toISOString(),
    ...partial,
  };
}
import { aiRespond, isImageCommand, isSummarizeCommand, summarizeConversation } from '@/lib/ai';
import type { Chat, Message, Recurrence } from '@/lib/types';

import AuthPage from '@/components/AuthPage';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { SettingsPanel } from '@/components/SettingsPanel';
import { SchedulerPanel } from '@/components/SchedulerPanel';
import { NewChatModal } from '@/components/NewChatModal';

function Shell() {
  const { user, loading } = useAuth();
  const { settings, themeTransition } = useSettings();

  if (loading) {
    return (
      <div className="app-bg min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-transparent accent-border animate-spin" style={{ borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) return <AuthPage />;
  if (!settings) {
    return (
      <div className="app-bg min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-transparent accent-border animate-spin" style={{ borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return <ChatApp />;
}

function ChatApp() {
  const { user } = useAuth();
  const { settings, themeTransition } = useSettings();
  const data = useChatData();
  const now = useNow();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [search, setSearch] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const activeChat = useMemo(() => data.chats.find((c) => c.id === activeChatId) ?? null, [data.chats, activeChatId]);
  const activeMessages = activeChatId ? data.messagesByChat[activeChatId] ?? [] : [];

  // Simulated online status for non-AI chats: deterministic per chat id.
  const onlineInfo = useMemo(() => {
    if (!activeChat) return { online: false, lastSeen: new Date().toISOString() };
    if (activeChat.is_ai_bot) return { online: true, lastSeen: new Date().toISOString() };
    const seed = activeChat.id;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const online = (h % 10) > 4;
    const minsAgo = (h % 180) + 1;
    return { online, lastSeen: new Date(Date.now() - minsAgo * 60000).toISOString() };
  }, [activeChat]);

  const selectChat = useCallback((id: string) => {
    setActiveChatId(id);
    setMobileChatOpen(true);
  }, []);

  // ---- Sending messages -----------------------------------------------------
  const handleSend = useCallback(async (body: string, kind: Message['kind'] = 'text', meta: Partial<Message> = {}) => {
    if (!activeChat || !user) return;
    const chat = activeChat;

    // Insert user message (optimistic local append + DB write).
    const optimistic: Message = {
      id: crypto.randomUUID(),
      chat_id: chat.id,
      user_id: user.id,
      sender_name: 'Me',
      is_me: true,
      body: kind === 'voice' ? 'Voice message' : body,
      kind,
      media_url: meta.media_url ?? null,
      media_name: meta.media_name ?? null,
      media_size: meta.media_size ?? null,
      audio_duration_sec: meta.audio_duration_sec ?? null,
      status: 'sent',
      created_at: new Date().toISOString(),
    };
    data.setMessagesFor(chat.id, (prev) => [...prev, optimistic]);

    const inserted = await data.insertMessage(chat.id, {
      body: kind === 'voice' ? 'Voice message' : body,
      kind,
      sender_name: 'Me',
      is_me: true,
      ...meta,
    });
    if (inserted) {
      data.setMessagesFor(chat.id, (prev) => prev.map((m) => (m.id === optimistic.id ? inserted : m)));
      // mark delivered shortly after
      setTimeout(async () => {
        data.setMessagesFor(chat.id, (prev) => prev.map((m) => (m.id === inserted.id ? { ...m, status: 'delivered' } : m)));
        await supabase.from('messages').update({ status: 'delivered' }).eq('id', inserted.id);
      }, 700);
      setTimeout(async () => {
        data.setMessagesFor(chat.id, (prev) => prev.map((m) => (m.id === inserted.id ? { ...m, status: 'read' } : m)));
        await supabase.from('messages').update({ status: 'read' }).eq('id', inserted.id);
      }, 1800);
    }

    // AI bot auto-response
    if (chat.is_ai_bot) {
      setAiTyping(true);
      const delay = 900 + Math.min(2200, body.length * 18);
      setTimeout(async () => {
        let resp;
        if (isSummarizeCommand(body)) {
          const allMsgs = data.messagesByChat[chat.id] ?? [];
          resp = summarizeConversation(allMsgs);
        } else {
          resp = aiRespond(body);
        }
        const aiMsg = makeMsg({
          chat_id: chat.id,
          user_id: user.id,
          sender_name: chat.name,
          is_me: false,
          body: resp.text ?? null,
          kind: resp.kind === 'image' ? 'image' : 'text',
          media_url: resp.imageUrl ?? null,
          media_name: resp.kind === 'image' ? 'AI generated image' : null,
          status: 'read',
        });
        data.setMessagesFor(chat.id, (prev) => [...prev, aiMsg]);
        const aiInserted = await data.insertMessage(chat.id, {
          body: aiMsg.body, kind: aiMsg.kind, sender_name: chat.name, is_me: false,
          media_url: aiMsg.media_url, media_name: aiMsg.media_name, status: 'read',
        });
        if (aiInserted) data.setMessagesFor(chat.id, (prev) => prev.map((m) => (m.id === aiMsg.id ? aiInserted : m)));
        setAiTyping(false);
      }, delay);
      return;
    }

    // Auto-reply from simulated contact (echo-style demo reply)
    if (!chat.is_ai_bot) {
      setTimeout(async () => {
        const replies = [
          'Sounds good!',
          'Got it, thanks.',
          'Let me get back to you on that.',
          'Perfect — talk soon.',
          '👍',
          'That works for me.',
          'Appreciate it!',
        ];
        let h = 0;
        for (let i = 0; i < chat.id.length; i++) h = (h * 31 + chat.id.charCodeAt(i)) >>> 0;
        const reply = replies[h % replies.length];
        const replyMsg = makeMsg({
          chat_id: chat.id,
          user_id: user.id,
          sender_name: chat.name,
          is_me: false,
          body: reply,
          kind: 'text',
          status: 'read',
        });
        data.setMessagesFor(chat.id, (prev) => [...prev, replyMsg]);
        const inserted2 = await data.insertMessage(chat.id, {
          body: reply, kind: 'text', sender_name: chat.name, is_me: false, status: 'read',
        });
        if (inserted2) data.setMessagesFor(chat.id, (prev) => prev.map((m) => (m.id === replyMsg.id ? inserted2 : m)));
      }, 1400 + Math.random() * 1600);
    }
  }, [activeChat, user, data]);

  // ---- Attachments ----------------------------------------------------------
  const handleAttachImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => handleSend(file.name, 'image', { media_url: reader.result as string, media_name: file.name, media_size: file.size });
    reader.readAsDataURL(file);
  }, [handleSend]);

  const handleAttachFile = useCallback((file: File) => {
    handleSend(file.name, 'file', { media_name: file.name, media_size: file.size });
  }, [handleSend]);

  const handleRecordVoice = useCallback((durationSec: number) => {
    handleSend('', 'voice', { audio_duration_sec: durationSec });
  }, [handleSend]);

  // ---- Folder ops -----------------------------------------------------------
  const handleCreateFolder = useCallback(async (parent: string | null, name: string, emoji: string, color: string) => {
    if (!user) return;
    await supabase.from('folders').insert({
      user_id: user.id, parent_id: parent, name, emoji, color,
      pinned: false, is_archive: false, sort_order: Date.now(),
    });
  }, [user]);

  const handleDeleteFolder = useCallback(async (id: string) => {
    await supabase.from('folders').delete().eq('id', id);
  }, []);

  const handleTogglePinFolder = useCallback(async (id: string, pinned: boolean) => {
    await supabase.from('folders').update({ pinned }).eq('id', id);
  }, []);

  const handleMoveChatToFolder = useCallback(async (chatId: string, folderId: string | null) => {
    await supabase.from('chats').update({ folder_id: folderId }).eq('id', chatId);
  }, []);

  // ---- New chat -------------------------------------------------------------
  const handleCreateChat = useCallback(async (name: string, opts: { isGroup: boolean }) => {
    if (!user) return;
    const { data: chat } = await supabase
      .from('chats')
      .insert({ user_id: user.id, name, is_group: opts.isGroup, participant_count: opts.isGroup ? 3 : 2 })
      .select()
      .single();
    if (chat) selectChat((chat as Chat).id);
  }, [user, selectChat]);

  // ---- Scheduler ------------------------------------------------------------
  const handleSchedule = useCallback(async (body: string, sendAt: string, recurrence: Recurrence) => {
    if (!activeChat || !user) return;
    await supabase.from('scheduled_messages').insert({
      chat_id: activeChat.id, user_id: user.id, body, send_at: sendAt, recurrence, status: 'pending',
    });
  }, [activeChat, user]);

  const handleUpdateScheduled = useCallback(async (id: string, body: string, sendAt: string, recurrence: Recurrence) => {
    await supabase.from('scheduled_messages').update({ body, send_at: sendAt, recurrence }).eq('id', id);
  }, []);

  const handleCancelScheduled = useCallback(async (id: string) => {
    await supabase.from('scheduled_messages').update({ status: 'cancelled' }).eq('id', id);
  }, []);

  // ---- Scheduled message dispatcher (runs every tick) ----------------------
  useEffect(() => {
    if (!user || data.scheduled.length === 0) return;
    const due = data.scheduled.filter((s) => new Date(s.send_at).getTime() <= now);
    for (const s of due) {
      (async () => {
        const optimistic = makeMsg({
          chat_id: s.chat_id,
          user_id: user.id,
          body: s.body,
          kind: 'text',
          status: 'sent',
        });
        data.setMessagesFor(s.chat_id, (prev) => [...prev, optimistic]);
        await data.insertMessage(s.chat_id, { body: s.body, kind: 'text', sender_name: 'Me', is_me: true });

        // Handle recurrence: schedule next occurrence
        if (s.recurrence !== 'none') {
          const next = computeNextRecurrence(new Date(s.send_at), s.recurrence);
          await handleUpdateScheduled(s.id, s.body, next.toISOString(), s.recurrence);
        } else {
          await supabase.from('scheduled_messages').update({ status: 'sent' }).eq('id', s.id);
        }
      })();
    }
  }, [now, data.scheduled, user, data, handleUpdateScheduled]);

  return (
    <div className="app-bg h-screen w-screen flex overflow-hidden">
      {themeTransition && <div className="theme-transition-overlay" />}

      {/* Sidebar */}
      <div className={`w-full md:w-[360px] lg:w-[380px] shrink-0 h-full ${mobileChatOpen ? 'hidden md:block' : 'block'}`}>
        <Sidebar
          chats={data.chats}
          folders={data.folders}
          activeChatId={activeChatId}
          onSelectChat={selectChat}
          onOpenSettings={() => setShowSettings(true)}
          onMoveChatToFolder={handleMoveChatToFolder}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          onTogglePinFolder={handleTogglePinFolder}
          onCreateChat={() => setShowNewChat(true)}
          search={search}
          setSearch={setSearch}
        />
      </div>

      {/* Chat area */}
      <div className={`flex-1 h-full ${mobileChatOpen ? 'block' : 'hidden md:block'}`}>
        <ChatWindow
          chat={activeChat ?? null}
          messages={activeMessages}
          online={onlineInfo.online}
          lastSeen={onlineInfo.lastSeen}
          onBack={() => setMobileChatOpen(false)}
          onSend={handleSend}
          onAttachImage={handleAttachImage}
          onAttachFile={handleAttachFile}
          onRecordVoice={handleRecordVoice}
          onOpenScheduler={() => setShowScheduler(true)}
          onOpenSettings={() => setShowSettings(true)}
          isAiTyping={aiTyping}
        />
      </div>

      <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
      <SchedulerPanel
        open={showScheduler}
        onClose={() => setShowScheduler(false)}
        chat={activeChat}
        scheduled={data.scheduled}
        now={now}
        onSchedule={handleSchedule}
        onUpdate={handleUpdateScheduled}
        onCancel={handleCancelScheduled}
      />
      <NewChatModal open={showNewChat} onClose={() => setShowNewChat(false)} onCreate={handleCreateChat} />
    </div>
  );
}

function computeNextRecurrence(from: Date, recurrence: Recurrence): Date {
  const next = new Date(from);
  if (recurrence === 'daily') next.setDate(next.getDate() + 1);
  else if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  else if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
  return next;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AudioPlayerProvider>
          <Shell />
        </AudioPlayerProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
