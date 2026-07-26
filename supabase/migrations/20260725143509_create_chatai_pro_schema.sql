/*
# ChatAI Pro — initial schema

A premium WhatsApp-style multi-user chat app. Each authenticated user owns
their own chats, messages, folders, scheduled messages, and settings. Auth is
Supabase email/password (built in the frontend). AI bot responses and seeded
demo contacts are produced client-side, so the AI bot is represented as a
regular chat row flagged with `is_ai_bot = true`.

## Tables
1. `profiles` — display name + avatar + online status per auth user.
2. `folders` — user-organized nested folders for grouping chats. Self-referencing parent_id. (Created before chats so chats.folder_id FK resolves.)
3. `chats` — a conversation (1:1, group, or the built-in AI bot). Owner-scoped.
4. `messages` — individual message in a chat. Supports text, image, file, voice.
5. `scheduled_messages` — messages drafted to be sent at a future date/time, optionally recurring.
6. `settings` — per-user customization: theme, accent, bubble shape/colors, background, font size.

## Security
- RLS enabled on every table.
- All policies scope to `TO authenticated` with `auth.uid() = user_id` ownership checks.
- `user_id` columns default to `auth.uid()` so client inserts that omit the owner still satisfy `WITH CHECK`.
- Child tables (messages, scheduled_messages) verify ownership through their parent chat.
*/

-- 1. PROFILES ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'User',
  avatar_url text,
  online boolean NOT NULL DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. FOLDERS (created before chats) -----------------------------------------
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'indigo',
  emoji text NOT NULL DEFAULT '📁',
  pinned boolean NOT NULL DEFAULT false,
  is_archive boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "folders_select_own" ON folders;
CREATE POLICY "folders_select_own" ON folders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "folders_insert_own" ON folders;
CREATE POLICY "folders_insert_own" ON folders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "folders_update_own" ON folders;
CREATE POLICY "folders_update_own" ON folders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "folders_delete_own" ON folders;
CREATE POLICY "folders_delete_own" ON folders
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

-- 3. CHATS -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  is_group boolean NOT NULL DEFAULT false,
  is_ai_bot boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  participant_count int NOT NULL DEFAULT 2,
  last_message_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chats_select_own" ON chats;
CREATE POLICY "chats_select_own" ON chats
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chats_insert_own" ON chats;
CREATE POLICY "chats_insert_own" ON chats
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chats_update_own" ON chats;
CREATE POLICY "chats_update_own" ON chats
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chats_delete_own" ON chats;
CREATE POLICY "chats_delete_own" ON chats
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_folder_id ON chats(folder_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);

-- 4. MESSAGES ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL DEFAULT 'Me',
  is_me boolean NOT NULL DEFAULT true,
  body text,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','image','file','voice','system')),
  media_url text,
  media_name text,
  media_size bigint,
  audio_duration_sec numeric,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','delivered','read')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_own" ON messages;
CREATE POLICY "messages_select_own" ON messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()));

DROP POLICY IF EXISTS "messages_insert_own" ON messages;
CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()));

DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_update_own" ON messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()));

DROP POLICY IF EXISTS "messages_delete_own" ON messages;
CREATE POLICY "messages_delete_own" ON messages
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- 5. SCHEDULED MESSAGES ------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  send_at timestamptz NOT NULL,
  recurrence text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly','monthly')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scheduled_select_own" ON scheduled_messages;
CREATE POLICY "scheduled_select_own" ON scheduled_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = scheduled_messages.chat_id AND chats.user_id = auth.uid()));

DROP POLICY IF EXISTS "scheduled_insert_own" ON scheduled_messages;
CREATE POLICY "scheduled_insert_own" ON scheduled_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM chats WHERE chats.id = scheduled_messages.chat_id AND chats.user_id = auth.uid()));

DROP POLICY IF EXISTS "scheduled_update_own" ON scheduled_messages;
CREATE POLICY "scheduled_update_own" ON scheduled_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = scheduled_messages.chat_id AND chats.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM chats WHERE chats.id = scheduled_messages.chat_id AND chats.user_id = auth.uid()));

DROP POLICY IF EXISTS "scheduled_delete_own" ON scheduled_messages;
CREATE POLICY "scheduled_delete_own" ON scheduled_messages
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = scheduled_messages.chat_id AND chats.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_scheduled_user_id ON scheduled_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_send_at ON scheduled_messages(send_at);

-- 6. SETTINGS ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light')),
  accent text NOT NULL DEFAULT 'violet',
  bubble_shape text NOT NULL DEFAULT 'rounded' CHECK (bubble_shape IN ('rounded','sharp','cloud')),
  bubble_color_sent text NOT NULL DEFAULT 'accent',
  bubble_color_received text NOT NULL DEFAULT 'neutral',
  chat_bg_type text NOT NULL DEFAULT 'solid' CHECK (chat_bg_type IN ('solid','gradient','pattern','custom')),
  chat_bg_value text NOT NULL DEFAULT 'default',
  font_size text NOT NULL DEFAULT 'medium' CHECK (font_size IN ('small','medium','large')),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_own" ON settings;
CREATE POLICY "settings_select_own" ON settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_insert_own" ON settings;
CREATE POLICY "settings_insert_own" ON settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_update_own" ON settings;
CREATE POLICY "settings_update_own" ON settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "settings_delete_own" ON settings;
CREATE POLICY "settings_delete_own" ON settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Helper: keep chats.updated_at fresh on new message --------------------------
CREATE OR REPLACE FUNCTION touch_chat_updated_at()
RETURNS trigger AS $$
BEGIN
  UPDATE chats SET updated_at = now(), last_message_id = NEW.id WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_touch_chat_on_message ON messages;
CREATE TRIGGER trg_touch_chat_on_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION touch_chat_updated_at();
