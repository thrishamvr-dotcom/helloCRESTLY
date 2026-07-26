import { supabase } from './supabase';
import type { Chat, Folder } from './types';
import { generateImage } from './ai';

const AVATAR_API = 'https://api.dicebear.com/7.x/avataaars/svg?seed=';

function avatarUrl(seed: string): string {
  return `${AVATAR_API}${encodeURIComponent(seed)}`;
}

export async function seedAccount(userId: string, displayName: string): Promise<void> {
  const { data: existing } = await supabase.from('chats').select('id').eq('user_id', userId).limit(1).maybeSingle();
  if (existing) return;

  // Folders
  const folders: Folder[] = [];
  const folderRows = [
    { name: 'Work', emoji: '💼', color: 'blue', pinned: true },
    { name: 'Family', emoji: '👨‍👩‍👧', color: 'rose', pinned: true },
    { name: 'Friends', emoji: '🎉', color: 'amber', pinned: false },
  ];
  for (const f of folderRows) {
    const { data } = await supabase
      .from('folders')
      .insert({ user_id: userId, name: f.name, emoji: f.emoji, color: f.color, pinned: f.pinned, sort_order: f.pinned ? 0 : 1 })
      .select()
      .single();
    if (data) folders.push(data as Folder);
  }

  // AI bot chat
  const { data: aiChat } = await supabase
    .from('chats')
    .insert({
      user_id: userId,
      name: 'Crestly Assistant',
      avatar_url: null,
      is_ai_bot: true,
      is_pinned: true,
      participant_count: 2,
    })
    .select()
    .single();
  const aiChatId = (aiChat as Chat | null)?.id;
  if (aiChatId) {
    await supabase.from('messages').insert([
      {
        chat_id: aiChatId,
        user_id: userId,
        sender_name: 'Crestly Assistant',
        is_me: false,
        body: `Hi ${displayName.split(' ')[0]}! I'm your built-in AI assistant. Ask me anything, or try:\n• /image a neon city skyline\n• /summarize`,
        kind: 'text',
        status: 'read',
      },
    ]);
  }

  // Demo contacts with conversations
  const contacts: Array<{ name: string; seed: string; folder?: string; group?: boolean; msgs: Array<{ me: boolean; body: string; minsAgo: number; kind?: 'text' | 'image' | 'voice' | 'file'; file?: string; sender?: string }> }> = [
    {
      name: 'Maya Chen',
      seed: 'Maya',
      folder: 'Work',
      msgs: [
        { me: false, body: 'Hey! Are we still on for the design review at 3?', minsAgo: 40 },
        { me: true, body: 'Yes — I just polished the mockups.', minsAgo: 38 },
        { me: false, body: 'Perfect. Can you share the file?', minsAgo: 36 },
        { me: true, body: 'design-review-v3.pdf', kind: 'file', file: 'design-review-v3.pdf', minsAgo: 35 },
        { me: false, body: 'Got it, thank you!', minsAgo: 34 },
      ],
    },
    {
      name: 'Design Team',
      seed: 'DesignTeam',
      folder: 'Work',
      group: true,
      msgs: [
        { me: false, body: 'Pushed the new color tokens to staging 🎨', sender: 'Leo', minsAgo: 120 },
        { me: false, body: 'Looks great, merging now.', sender: 'Priya', minsAgo: 110 },
        { me: true, body: 'Nice teamwork everyone.', minsAgo: 100 },
      ],
    },
    {
      name: 'Mom',
      seed: 'Mom',
      folder: 'Family',
      msgs: [
        { me: false, body: 'Did you eat dinner yet? ❤️', minsAgo: 200 },
        { me: true, body: 'Just about to! Love you.', minsAgo: 195 },
        { me: false, body: 'Voice message', kind: 'voice', minsAgo: 190, file: 'voice-mom' },
      ],
    },
    {
      name: 'Alex Rivera',
      seed: 'Alex',
      folder: 'Friends',
      msgs: [
        { me: false, body: 'Check out this view from my hike!', kind: 'image', file: 'mountain-view', minsAgo: 300 },
        { me: true, body: 'Wow, that is unreal. Where is that?', minsAgo: 290 },
        { me: false, body: 'Eagle Ridge trail — you have to come next time.', minsAgo: 285 },
      ],
    },
    {
      name: 'Sofia Park',
      seed: 'Sofia',
      msgs: [
        { me: false, body: 'Lunch this week?', minsAgo: 600 },
        { me: true, body: 'Thursday works for me 🙌', minsAgo: 590 },
      ],
    },
  ];

  for (const c of contacts) {
    const folder = folders.find((f) => f.name === c.folder);
    const { data: chat } = await supabase
      .from('chats')
      .insert({
        user_id: userId,
        name: c.name,
        avatar_url: avatarUrl(c.seed),
        is_group: !!c.group,
        participant_count: c.group ? 5 : 2,
        folder_id: folder?.id ?? null,
        updated_at: new Date(Date.now() - c.msgs[c.msgs.length - 1].minsAgo * 60000).toISOString(),
      })
      .select()
      .single();
    const chatId = (chat as Chat | null)?.id;
    if (!chatId) continue;

    const rows = c.msgs.map((m) => {
      const createdAt = new Date(Date.now() - m.minsAgo * 60000).toISOString();
      const base: Record<string, unknown> = {
        chat_id: chatId,
        user_id: userId,
        sender_name: m.me ? 'Me' : (m.sender ?? c.name),
        is_me: m.me,
        body: m.body,
        kind: m.kind ?? 'text',
        status: 'read' as const,
        created_at: createdAt,
      };
      if (m.kind === 'image' && m.file) {
        base.media_url = generateImage(m.file);
        base.media_name = m.file;
      }
      if (m.kind === 'file' && m.file) {
        base.media_name = m.file;
        base.media_size = 248000;
      }
      if (m.kind === 'voice' && m.file) {
        base.audio_duration_sec = 23;
        base.body = 'Voice message';
      }
      return base;
    });
    await supabase.from('messages').insert(rows);
  }

  // Settings row
  await supabase.from('settings').upsert({
    user_id: userId,
    theme: 'dark',
    accent: 'violet',
    bubble_shape: 'rounded',
    bubble_color_sent: 'accent',
    bubble_color_received: 'neutral',
    chat_bg_type: 'solid',
    chat_bg_value: 'default',
    font_size: 'medium',
  }, { onConflict: 'user_id' });
}
