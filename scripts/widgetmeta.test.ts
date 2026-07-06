// Proves #30 widget meta line: the compact per-row summary carries the same
// symbols as the web task row. Run: npx tsx scripts/widgetmeta.test.ts
import assert from 'node:assert';
import { widgetMeta } from '../apps/mobile/src/widgetMeta';
import type { Task } from '../src/types';

const base: Task = {
  id: 'x', number: 1, title: 't', description: '', projectId: null, dueDate: null,
  priority: 'medium', categoryIds: [], completed: false, createdAt: new Date(),
  updatedAt: new Date(), starred: false, recurrence: 'none',
};
const task = (p: Partial<Task>): Task => ({ ...base, ...p });

// Full meta: date, time, duration, recurrence, star.
const m = widgetMeta(task({
  dueDate: new Date(2026, 6, 6), startMinutes: 570, durationMin: 15,
  recurrence: 'weekly', starred: true,
}));
assert.ok(m.includes('📅'), 'has date');
assert.ok(m.includes('🕘 09:30'), `has time (${m})`);
assert.ok(m.includes('⏱'), 'has duration');
assert.ok(m.includes('↻'), 'has recurrence');
assert.ok(m.includes('⭐'), 'has star');

// Flags.
assert.ok(widgetMeta(task({ thisWeek: true })).includes('🗓️'), 'thisWeek');
assert.ok(widgetMeta(task({ someday: true })).includes('🌥️'), 'someday');
assert.ok(widgetMeta(task({ waiting: true })).includes('⏳'), 'waiting');
assert.ok(
  widgetMeta(task({ comments: [{ id: 'c', text: 'x', author: 'a', createdAt: new Date() }] })).includes('💬1'),
  'comment count'
);

// Empty task → empty meta (widget hides the line).
assert.strictEqual(widgetMeta(task({})), '', 'plain task has no meta');

console.log('✅ PASS — widget meta line carries date/time/duration/flags like the web row.');
