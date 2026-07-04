// Proves #23: the manual ☀️ Heute flag (todayDate) shows a task in the Today
// view alongside due-today tasks and expires overnight (a stale key is inert).
// Run: npx tsx scripts/todayflag.test.ts
import assert from 'node:assert';
import { selectVisibleTasks, isTodayFlagActive, dateKey, addDays } from '../src/selectors';
import { mobileToday } from '../apps/mobile/src/selectors';
import type { Task, UIState } from '../src/types';

const now = new Date();
const todayKey = dateKey(now);
const yesterdayKey = dateKey(addDays(now, -1));

const base: Task = {
  id: 'x', number: 0, title: '', description: '', projectId: null, dueDate: null,
  priority: 'medium', categoryIds: [], completed: false, createdAt: now,
  updatedAt: now, starred: false, recurrence: 'none',
};
const task = (p: Partial<Task>): Task => ({ ...base, ...p });

const dueToday = task({ id: 'due', number: 1, title: 'Fällig heute', dueDate: now });
const pinnedToday = task({ id: 'pin', number: 2, title: 'Heute gepinnt', todayDate: todayKey });
const pinnedYesterday = task({ id: 'stale', number: 3, title: 'Gestern gepinnt', todayDate: yesterdayKey });
const plain = task({ id: 'plain', number: 4, title: 'Ohne alles' });

// isTodayFlagActive: only today's key counts.
assert.ok(isTodayFlagActive(pinnedToday), 'flag with today key is active');
assert.ok(!isTodayFlagActive(pinnedYesterday), 'flag from yesterday expired overnight');
assert.ok(!isTodayFlagActive(plain), 'no todayDate → not active');

// Today view: union of due-today and actively pinned; stale pin stays out.
const ui = {
  currentView: 'today',
  selectedProjectId: null,
  selectedProjectIds: [],
  searchQuery: '',
  filters: { projectId: null, categoryId: null, priority: null, completed: null, assigneeId: null, dueFrom: null, dueTo: null },
  sortField: 'manual',
  sortDir: 'asc',
} as unknown as UIState;
const visible = selectVisibleTasks([dueToday, pinnedToday, pinnedYesterday, plain], ui).map((t) => t.id);
assert.deepStrictEqual(visible.sort(), ['due', 'pin'], 'Heute = due today ∪ pinned today');

// Mobile Heute tab uses the same rules (open root tasks only).
const mobile = mobileToday([dueToday, pinnedToday, pinnedYesterday, plain]).map((t) => t.id);
assert.deepStrictEqual(mobile.sort(), ['due', 'pin'], 'mobileToday matches the web rule');

console.log(`✅ PASS — Heute view shows [${visible.join(', ')}]; stale pin (${yesterdayKey}) is inert.`);
