// Proves #8 Evernote link detection: web links + desktop deep links are
// recognised; unrelated URLs are not. Run: npx tsx scripts/evernote.test.ts
import assert from 'node:assert';
import { isEvernoteUrl, isEvernoteDeepLink } from '../src/evernote';

// Desktop deep link.
assert.ok(isEvernoteUrl('evernote:///view/12345/s1/abc-def/abc-def/'), 'deep link');
assert.ok(isEvernoteDeepLink('evernote:///view/1/2/3/'), 'deep link flagged');

// Web links (www / app / shard paths).
assert.ok(isEvernoteUrl('https://www.evernote.com/shard/s1/nl/12/abc/'), 'web nl link');
assert.ok(isEvernoteUrl('https://app.evernote.com/client/web?login=true#/notes'), 'app link');
assert.ok(isEvernoteUrl('http://evernote.com/l/AB12'), 'short share link');
assert.ok(!isEvernoteDeepLink('https://www.evernote.com/x'), 'web link is not a deep link');

// Whitespace tolerated.
assert.ok(isEvernoteUrl('  evernote:///view/9/  '), 'trims whitespace');

// Negatives.
assert.ok(!isEvernoteUrl('https://www.google.com/'), 'non-evernote rejected');
assert.ok(!isEvernoteUrl('https://notevernote.com.evil.com/'), 'lookalike host rejected');
assert.ok(!isEvernoteUrl(''), 'empty rejected');

console.log('✅ PASS — evernote: web + deep-link detection, negatives.');
