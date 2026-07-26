export type ThemeMode = 'dark' | 'light';
export type AccentKey =
  | 'violet'
  | 'emerald'
  | 'blue'
  | 'rose'
  | 'amber'
  | 'cyan'
  | 'fuchsia'
  | 'teal'
  | 'orange'
  | 'lime';
export type BubbleShape = 'rounded' | 'sharp' | 'cloud';
export type BubbleColorSent = 'accent' | 'neutral';
export type BubbleColorReceived = 'accent' | 'neutral';
export type ChatBgType = 'solid' | 'gradient' | 'pattern' | 'custom';
export type FontSize = 'small' | 'medium' | 'large';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  online: boolean;
  last_seen: string;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_group: boolean;
  is_ai_bot: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  folder_id: string | null;
  participant_count: number;
  last_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export type MessageKind = 'text' | 'image' | 'file' | 'voice' | 'system';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  sender_name: string;
  is_me: boolean;
  body: string | null;
  kind: MessageKind;
  media_url: string | null;
  media_name: string | null;
  media_size: number | null;
  audio_duration_sec: number | null;
  status: MessageStatus;
  created_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  color: string;
  emoji: string;
  pinned: boolean;
  is_archive: boolean;
  sort_order: number;
  created_at: string;
}

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export type ScheduledStatus = 'pending' | 'sent' | 'cancelled';

export interface ScheduledMessage {
  id: string;
  chat_id: string;
  user_id: string;
  body: string;
  send_at: string;
  recurrence: Recurrence;
  status: ScheduledStatus;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  theme: ThemeMode;
  accent: AccentKey;
  bubble_shape: BubbleShape;
  bubble_color_sent: BubbleColorSent;
  bubble_color_received: BubbleColorReceived;
  chat_bg_type: ChatBgType;
  chat_bg_value: string;
  font_size: FontSize;
  updated_at: string;
}

export const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'user_id' | 'updated_at'> = {
  theme: 'dark',
  accent: 'violet',
  bubble_shape: 'rounded',
  bubble_color_sent: 'accent',
  bubble_color_received: 'neutral',
  chat_bg_type: 'solid',
  chat_bg_value: 'default',
  font_size: 'medium',
};

export interface AccentConfig {
  key: AccentKey;
  label: string;
  light: string;
  dark: string;
  glow: string;
}

export const ACCENTS: Record<AccentKey, AccentConfig> = {
  violet: { key: 'violet', label: 'Violet', light: '#7c3aed', dark: '#a78bfa', glow: 'rgba(167,139,250,0.45)' },
  emerald: { key: 'emerald', label: 'Emerald', light: '#059669', dark: '#34d399', glow: 'rgba(52,211,153,0.45)' },
  blue: { key: 'blue', label: 'Blue', light: '#2563eb', dark: '#60a5fa', glow: 'rgba(96,165,250,0.45)' },
  rose: { key: 'rose', label: 'Rose', light: '#e11d48', dark: '#fb7185', glow: 'rgba(251,113,133,0.45)' },
  amber: { key: 'amber', label: 'Amber', light: '#d97706', dark: '#fbbf24', glow: 'rgba(251,191,36,0.45)' },
  cyan: { key: 'cyan', label: 'Cyan', light: '#0891b2', dark: '#22d3ee', glow: 'rgba(34,211,238,0.45)' },
  fuchsia: { key: 'fuchsia', label: 'Fuchsia', light: '#c026d3', dark: '#e879f9', glow: 'rgba(232,121,249,0.45)' },
  teal: { key: 'teal', label: 'Teal', light: '#0d9488', dark: '#2dd4bf', glow: 'rgba(45,212,191,0.45)' },
  orange: { key: 'orange', label: 'Orange', light: '#ea580c', dark: '#fb923c', glow: 'rgba(251,146,60,0.45)' },
  lime: { key: 'lime', label: 'Lime', light: '#65a30d', dark: '#a3e635', glow: 'rgba(163,230,53,0.45)' },
};

export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

export const FONT_SIZE_PX: Record<FontSize, number> = {
  small: 13,
  medium: 15,
  large: 17,
};
