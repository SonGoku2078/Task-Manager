// Evernote note links (#8). Evernote stays the archive; a task references a note
// via its link — either a web link (https://www.evernote.com/…, also app./shard/)
// or the desktop deep link (evernote:///view/…). No API needed. Pure + testable.

const EVERNOTE_RE = /^(evernote:\/\/\/|https?:\/\/(www\.|app\.)?evernote\.com\/)/i;

export function isEvernoteUrl(raw: string): boolean {
  return EVERNOTE_RE.test((raw ?? '').trim());
}

// A stable default label when the user doesn't name the note (Evernote URLs
// don't reliably carry a human-readable title).
export const DEFAULT_EVERNOTE_TITLE = 'Evernote-Notiz';

// Web links open in a new tab; evernote:/// deep links are handed to the OS
// (opens the Evernote desktop app). An <a href> handles both — this just tells
// the UI whether target=_blank is appropriate.
export function isEvernoteDeepLink(url: string): boolean {
  return /^evernote:\/\/\//i.test((url ?? '').trim());
}
