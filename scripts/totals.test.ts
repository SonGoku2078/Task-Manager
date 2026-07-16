// Proves #47: selectTaskTotals sums planned time (durationMin) and actual
// Pomodoro-booked time (focusSeconds → whole minutes) over exactly the tasks
// it is given, and the header pill's base — selectVisibleTasks — shrinks the
// totals when filters hide tasks. Also guards the detail panel's focus-time
// edit: the click-to-edit prefill formats must round-trip through parseDuration.
// Run: npx tsx scripts/totals.test.ts
import assert from 'node:assert';
import { selectTaskTotals, selectVisibleTasks } from '../src/selectors';
import { parseDuration } from '../src/duration';
import type { Task, UIState } from '../src/types';

const now = new Date();
const base: Task = {
  id: 'x', number: 0, title: '', description: '', projectId: null, dueDate: null,
  priority: 'medium', categoryIds: [], completed: false, createdAt: now,
  updatedAt: now, starred: false, recurrence: 'none',
};
const task = (p: Partial<Task>): Task => ({ ...base, ...p });

// Math: planned = entered durations only (null counts 0); actual = seconds
// rounded to whole minutes (AC5/AC6).
const mixed = [
  task({ id: 'a', durationMin: 30, focusSeconds: 90 }),
  task({ id: 'b' }), // keine Schätzung, keine Fokuszeit
  task({ id: 'c', durationMin: 60, focusSeconds: 3630 }),
];
assert.deepStrictEqual(selectTaskTotals(mixed), { count: 3, plannedMin: 90, actualMin: 62 });
assert.deepStrictEqual(selectTaskTotals([]), { count: 0, plannedMin: 0, actualMin: 0 });
assert.strictEqual(selectTaskTotals([task({ id: 'r', focusSeconds: 119 })]).actualMin, 2, '119s rounds to 2 min');

// Visible-based counting (AC7): the FilterBar's completed filter shrinks the
// base — totals must follow selectVisibleTasks, not the raw task list.
const open = task({ id: 'open', title: 'Offen', dueDate: now, durationMin: 30, focusSeconds: 600 });
const done = task({ id: 'done', title: 'Erledigt', dueDate: now, durationMin: 60, focusSeconds: 1200, completed: true });
const uiFor = (completed: boolean | null) =>
  ({
    currentView: 'today',
    selectedProjectId: null,
    selectedProjectIds: [],
    searchQuery: '',
    filters: { projectId: null, categoryId: null, priority: null, completed, assigneeId: null, dueFrom: null, dueTo: null },
    sortField: 'manual',
    sortDir: 'asc',
  }) as unknown as UIState;
assert.deepStrictEqual(
  selectTaskTotals(selectVisibleTasks([open, done], uiFor(null))),
  { count: 2, plannedMin: 90, actualMin: 30 },
  'both visible → both counted'
);
assert.deepStrictEqual(
  selectTaskTotals(selectVisibleTasks([open, done], uiFor(false))),
  { count: 1, plannedMin: 30, actualMin: 10 },
  'completed filtered away → totals shrink'
);

// Focus-time edit (AC8/AC10): every prefill shape the panel produces parses
// back to the same minutes, and garbage stays unparseable.
assert.strictEqual(parseDuration('45m'), 45);
assert.strictEqual(parseDuration('2h'), 120);
assert.strictEqual(parseDuration('1h 15m'), 75);
assert.strictEqual(parseDuration('abc'), null);

console.log('✅ PASS — totals: math (90/62), rounding, filter-shrink (2→1 tasks), prefill round-trip.');
