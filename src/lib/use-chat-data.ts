import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';
import type { Chat, Folder, Message, ScheduledMessage } from './types';

export interface ChatWithMeta extends Chat {
  last_message?: Message | null;
  unread?: number;
}

export function useChatData() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatWithMeta[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const userRef = useRef(user);
  userRef.current = user;

  const loadAll = useCallback(async () => {
    if (!userRef.current) return;
    const uid = userRef.current.id;

    const [chatsRes, foldersRes, schedRes] = await Promise.all([
      supabase.from('chats').select('*').eq('user_id', uid).order('updated_at', { ascending: false }),
      supabase.from('folders').select('*').eq('user_id', uid).order('sort_order', { ascending: true }),
      supabase.from('scheduled_messages').select('*').eq('user_id', uid).eq('status', 'pending').order('send_at', { ascending: true }),
    ]);

    const chatRows = (chatsRes.data ?? []) as Chat[];
    const folderRows = (foldersRes.data ?? []) as Folder[];

    // Load messages for every chat (small dataset)
    const msgs: Record<string, Message[]> = {};
    if (chatRows.length) {
      const { data: allMsgs } = await supabase
        .from('messages')
        .select('*')
        .in('chat_id', chatRows.map((c) => c.id))
        .order('created_at', { ascending: true });
      for (const m of (allMsgs ?? []) as Message[]) {
        const list = msgs[m.chat_id];
        if (list) list.push(m);
        else msgs[m.chat_id] = [m];
      }
    }

    const chatsWithMeta: ChatWithMeta[] = chatRows.map((c) => ({
      ...c,
      last_message: msgs[c.id]?.[msgs[c.id].length - 1] ?? null,
    }));

    setChats(chatsWithMeta);
    setFolders(folderRows);
    setMessagesByChat(msgs);
    setScheduled((schedRes.data ?? []) as ScheduledMessage[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadAll();
  }, [user, loadAll]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('chatai-pro-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_messages', filter: `user_id=eq.${user.id}` }, () => loadAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadAll]);

  const setMessagesFor = useCallback((chatId: string, updater: (prev: Message[]) => Message[]) => {
    setMessagesByChat((prev) => {
      const next = updater(prev[chatId] ?? []);
      return { ...prev, [chatId]: next };
    });
  }, []);

  const insertMessage = useCallback(async (chatId: string, row: Partial<Message> & { body?: string | null }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('messages')
      .insert({ chat_id: chatId, user_id: user.id, ...row })
      .select()
      .single();
    if (error) { console.warn('insertMessage', error.message); return null; }
    return data as Message;
  }, [user]);

  const updateChat = useCallback(async (chatId: string, patch: Partial<Chat>) => {
    const { error } = await supabase.from('chats').update(patch).eq('id', chatId);
    if (error) console.warn('updateChat', error.message);
  }, []);

  return {
    chats,
    folders,
    messagesByChat,
    scheduled,
    loading,
    reload: loadAll,
    setMessagesFor,
    insertMessage,
    updateChat,
  };
}
