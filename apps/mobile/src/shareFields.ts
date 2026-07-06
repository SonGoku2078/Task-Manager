// Derive the task title + note from shared content (#34). Kept pure so it can
// be unit-tested. The URL always goes into the note; the title never falls back
// to a bare URL (Instagram/X share only the link) — it uses the page subject or
// the first text line, else stays empty so the user types the topic.
import type { SharedPayload } from './shareTarget';

const URL_RE = /https?:\/\/[^\s]+/i;

export function deriveShareFields(payload: SharedPayload): { title: string; description: string } {
  const text = (payload.text ?? '').trim();
  const subject = (payload.subject ?? '').trim();
  const url = text.match(URL_RE)?.[0] ?? '';
  const rest = url ? text.replace(url, '').trim() : text;
  const restLines = rest.split('\n').map((l) => l.trim()).filter(Boolean);
  const firstLine = restLines[0] ?? '';

  const title = subject || firstLine; // never the bare URL
  const noteParts: string[] = [];
  if (url) noteParts.push(url);
  // Text below the title becomes note context; with a subject, all text lines.
  const extraLines = subject ? restLines : restLines.slice(1);
  if (extraLines.length) noteParts.push(extraLines.join('\n'));
  return { title, description: noteParts.join('\n\n') };
}
