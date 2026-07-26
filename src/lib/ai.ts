import type { Message } from './types';
import { formatDayLabel, formatTime } from './format';

export interface AIResponse {
  kind: 'text' | 'image';
  text?: string;
  imageUrl?: string;
}

// A lightweight, deterministic in-browser assistant. No external API needed.
const GREETINGS = ['hi', 'hello', 'hey', 'yo', 'hola', 'good morning', 'good evening'];

const KNOWLEDGE: Array<{ match: RegExp; reply: string }> = [
  { match: /weather/i, reply: "I can't pull live weather here, but I'd suggest checking a window or your favorite weather app. Want me to draft a friendly weather-check message for a contact?" },
  { match: /joke/i, reply: "Why don't programmers like nature? It has too many bugs. I've got a hundred more where that came from." },
  { match: /summari[sz]e|recap/i, reply: 'Type "/summarize" and I will condense the conversation above into key points.' },
  { match: /image|picture|draw|generate/i, reply: 'Type "/image <description>" and I will generate a picture for you.' },
  { match: /how are you/i, reply: 'Running at peak efficiency, thank you. How can I help with your chats today?' },
  { match: /thank/i, reply: 'Anytime. I am always one message away.' },
  { match: /who are you|what are you/i, reply: "I'm the Crestly assistant — I live in your contacts, answer questions, generate images, and summarize conversations. Look for the AI badge next to my name." },
  { match: /help|what can you do/i, reply: 'I can:\n• Answer questions and chat naturally\n• Generate images — type "/image a serene mountain lake at dawn"\n• Summarize this conversation — type "/summarize"\n• Draft messages for you to send later' },
  { match: /whatsapp|telegram|messenger/i, reply: 'Crestly takes the best of all of them — customizable bubbles, folders, scheduling, and me, the built-in AI.' },
];

export function isImageCommand(text: string): boolean {
  return /^\s*\/image\b/i.test(text);
}

export function isSummarizeCommand(text: string): boolean {
  return /^\s*\/summari[sz]e\b/i.test(text);
}

export function aiRespond(prompt: string): AIResponse {
  const text = prompt.trim();
  if (!text) return { kind: 'text', text: "I didn't catch that — could you say it another way?" };

  if (isImageCommand(text)) {
    const desc = text.replace(/^\s*\/image\b/i, '').trim() || 'abstract art';
    return { kind: 'image', imageUrl: generateImage(desc), text: `Here's a generated image of "${desc}".` };
  }

  const lower = text.toLowerCase();
  if (GREETINGS.some((g) => lower === g || lower.startsWith(g + ' '))) {
    return { kind: 'text', text: "Hello! I'm the Crestly assistant. Ask me anything, or try /image and /summarize." };
  }

  for (const entry of KNOWLEDGE) {
    if (entry.match.test(lower)) return { kind: 'text', text: entry.reply };
  }

  if (/^\d/.test(text) && /[+\-*/x]/.test(text)) {
    const result = safeMath(text);
    if (result !== null) return { kind: 'text', text: `That equals ${result}.` };
  }

  const generic = [
    `Great question. Here's my take on "${text}": it depends on the context, but I'd start by clarifying the goal and working backwards.`,
    `Interesting — "${text}". Tell me a bit more and I can give you a sharper answer.`,
    `I've thought about "${text}" and the short version is: keep it simple, then iterate. Want the longer version?`,
  ];
  const idx = hashString(text) % generic.length;
  return { kind: 'text', text: generic[idx] };
}

export function summarizeConversation(messages: Message[]): AIResponse {
  const recent = messages.filter((m) => m.kind === 'text' && m.body).slice(-20);
  if (recent.length === 0) {
    return { kind: 'text', text: "There's nothing to summarize yet — send a few messages first." };
  }
  const groups = new Map<string, number>();
  for (const m of recent) {
    const who = m.is_me ? 'You' : m.sender_name;
    groups.set(who, (groups.get(who) ?? 0) + 1);
  }
  const span = recent.length > 1
    ? `${formatDayLabel(recent[0].created_at)} ${formatTime(recent[0].created_at)} → ${formatTime(recent[recent.length - 1].created_at)}`
    : `${formatDayLabel(recent[0].created_at)} ${formatTime(recent[0].created_at)}`;

  const topics = recent
    .map((m) => m.body!.toLowerCase())
    .join(' ')
    .split(/\W+/)
    .filter((w) => w.length > 4)
    .slice(0, 6);

  const highlights = recent.slice(0, 3).map((m) => {
    const who = m.is_me ? 'You' : m.sender_name;
    const snippet = m.body!.length > 80 ? m.body!.slice(0, 80) + '…' : m.body!;
    return `• ${who}: "${snippet}"`;
  });

  const parts = [
    `Conversation summary (${recent.length} messages, ${span}):`,
    `Participants: ${[...groups.keys()].join(', ')}.`,
    `Likely topics: ${topics.length ? topics.join(', ') : 'general chat'}.`,
    `Highlights:`,
    ...highlights,
  ];
  return { kind: 'text', text: parts.join('\n') };
}

// Generate a deterministic SVG data URL from a text description — no external service.
export function generateImage(description: string): string {
  const h = hashString(description);
  const hue1 = h % 360;
  const hue2 = (hue1 + 60 + (h % 120)) % 360;
  const hue3 = (hue2 + 90) % 360;
  const shapes = 6;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">`;
  svg += `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`;
  svg += `<stop offset="0%" stop-color="hsl(${hue1},70%,55%)"/>`;
  svg += `<stop offset="50%" stop-color="hsl(${hue2},70%,50%)"/>`;
  svg += `<stop offset="100%" stop-color="hsl(${hue3},70%,40%)"/>`;
  svg += `</linearGradient><radialGradient id="r" cx="50%" cy="50%" r="50%">`;
  svg += `<stop offset="0%" stop-color="hsl(${hue1},80%,70%)" stop-opacity="0.8"/>`;
  svg += `<stop offset="100%" stop-color="hsl(${hue3},80%,30%)" stop-opacity="0"/>`;
  svg += `</radialGradient></defs>`;
  svg += `<rect width="400" height="400" fill="url(#g)"/>`;
  svg += `<rect width="400" height="400" fill="url(#r)"/>`;
  let seed = h || 1;
  for (let i = 0; i < shapes; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const cx = (seed % 320) + 40;
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const cy = (seed % 320) + 40;
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const r = (seed % 90) + 30;
    const hue = (hue1 + i * 50) % 360;
    const op = 0.25 + ((seed % 50) / 100);
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(${hue},80%,65%)" opacity="${op}"/>`;
  }
  const label = description.slice(0, 28).replace(/[<>&]/g, '');
  svg += `<rect x="10" y="360" width="380" height="30" rx="8" fill="rgba(0,0,0,0.35)"/>`;
  svg += `<text x="200" y="380" font-family="system-ui,sans-serif" font-size="14" fill="white" text-anchor="middle">AI · ${label}</text>`;
  svg += `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

function safeMath(expr: string): number | null {
  const cleaned = expr.replace(/x/g, '*').replace(/[^\d+\-*/.\s]/g, '');
  if (!cleaned || !/[+\-*/]/.test(cleaned)) return null;
  try {
    if (!/^[\d+\-*/.\s]+$/.test(cleaned)) return null;
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${cleaned})`);
    const r = fn();
    return typeof r === 'number' && isFinite(r) ? Math.round(r * 1e6) / 1e6 : null;
  } catch {
    return null;
  }
}
