import type { ConversationMessage, NormalizedConversation } from "@/types/conversation";

export function parseConversationText(
  text: string,
  platform?: string
): NormalizedConversation {
  const lines = text.split("\n").filter((l) => l.trim());
  const messages: ConversationMessage[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parsed = parseLine(trimmed);
    if (parsed) {
      messages.push(parsed);
    }
  }

  if (messages.length === 0 && text.trim()) {
    messages.push({ sender: "unknown", text: text.trim() });
  }

  return { platform, messages };
}

function parseLine(line: string): ConversationMessage | null {
  const trimmed = line.trim();

  const themMatch = trimmed.match(/^(them|other|friend|person)\s*:\s*(.+)/i);
  if (themMatch) {
    return { sender: "them", text: themMatch[2].trim() };
  }

  const meMatch = trimmed.match(/^(me|i|you)\s*:\s*(.+)/i);
  if (meMatch) {
    return { sender: "me", text: meMatch[2].trim() };
  }

  const nameMatch = trimmed.match(/^([A-Z][a-z]{1,15})\s*:\s*(.+)/);
  if (nameMatch) {
    return { sender: "them", text: nameMatch[2].trim() };
  }

  if (trimmed.startsWith("> ")) {
    return { sender: "them", text: trimmed.slice(2).trim() };
  }

  if (trimmed.startsWith("- ")) {
    return { sender: "me", text: trimmed.slice(2).trim() };
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return { sender: "them", text: trimmed.slice(1, -1).trim() };
  }

  return { sender: "unknown", text: trimmed };
}

export function detectPlatform(text: string): string | undefined {
  const lower = text.toLowerCase();

  if (/\b(instagram|insta|ig|dm)\b/.test(lower)) return "instagram";
  if (/\b(whatsapp|wa|watsapp)\b/.test(lower)) return "whatsapp";
  if (/\b(discord|dms?|server)\b/.test(lower)) return "discord";
  if (/\b(telegram|tg)\b/.test(lower)) return "telegram";
  if (/\b(snapchat|snap|streak)\b/.test(lower)) return "snapchat";
  if (/\b(bumble|tinder|hinge|dating)\b/.test(lower)) return "dating";
  if (/\b(linkedin|in)\b/.test(lower)) return "linkedin";

  return undefined;
}
