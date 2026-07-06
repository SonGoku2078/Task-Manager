// Proves #34: shared content → task title/note. The URL always goes to the
// note; the title is never the bare URL (Instagram/X share only a link).
// Run: npx tsx scripts/sharefields.test.ts
import assert from 'node:assert';
import { deriveShareFields } from '../apps/mobile/src/shareFields';

// Instagram/X: only a URL, no subject → empty title, URL in the note.
let r = deriveShareFields({ text: 'https://instagram.com/p/ABC123' });
assert.strictEqual(r.title, '', 'bare-URL share → empty title');
assert.strictEqual(r.description, 'https://instagram.com/p/ABC123', 'URL goes to the note');

// Text with a topic line + URL → first line is the title, URL in note.
r = deriveShareFields({ text: 'Cooles Rezept\nhttps://example.com/rezept' });
assert.strictEqual(r.title, 'Cooles Rezept', 'first text line becomes title');
assert.ok(r.description.includes('https://example.com/rezept'), 'URL in note');

// A real page subject (Chrome/Safari) → subject as title, URL in note.
r = deriveShareFields({ text: 'https://example.com/artikel', subject: 'Der Artikel-Titel' });
assert.strictEqual(r.title, 'Der Artikel-Titel', 'subject wins as title');
assert.strictEqual(r.description, 'https://example.com/artikel', 'URL in note');

// Plain text, no URL → title is the text, empty note.
r = deriveShareFields({ text: 'Nur ein Gedanke' });
assert.strictEqual(r.title, 'Nur ein Gedanke', 'plain text title');
assert.strictEqual(r.description, '', 'no URL → empty note');

// Multi-line without subject → first line title, remaining lines + URL in note.
r = deriveShareFields({ text: 'Titelzeile\nZusatz\nhttps://x.com/status/9' });
assert.strictEqual(r.title, 'Titelzeile', 'first line title');
assert.ok(r.description.includes('https://x.com/status/9') && r.description.includes('Zusatz'), 'url + extra lines in note');

console.log('✅ PASS — share fields: URL to note, title never a bare URL.');
