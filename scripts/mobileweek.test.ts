// #64: Der Woche-Tab der Mobile-App gruppiert überfällige Tasks separat, statt
// sie unter „Diese Woche" zu verstecken.
import { mobileNextWeek } from '../apps/mobile/src/selectors';
import type { Task } from '../src/types';

const day = (offset: number, hour = 12): Date => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

let n = 0;
const task = (title: string, over: Partial<Task> = {}): Task =>
  ({
    id: `t${++n}`,
    number: n,
    title,
    description: '',
    projectId: null,
    categoryIds: [],
    priority: 'medium',
    dueDate: null,
    completed: false,
    starred: false,
    recurrence: 'none',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as Task;

const tasks: Task[] = [
  task('Alt: 26. Dez', { dueDate: day(-205) }),
  task('Alt: vorgestern', { dueDate: day(-2) }),
  task('Gestern', { dueDate: day(-1) }),
  task('Heute frueh', { dueDate: day(0, 6) }), // schon vorbei, aber heute
  task('Heute spaet', { dueDate: day(0, 23) }),
  task('Morgen', { dueDate: day(1) }),
  task('In 3 Tagen', { dueDate: day(3) }),
  task('Ohne Datum, thisWeek', { dueDate: null, thisWeek: true }),
  task('Weit weg', { dueDate: day(30) }), // ausserhalb 7-Tage-Fenster
  task('Erledigt gestern', { dueDate: day(-1), completed: true, completedAt: day(-1) }),
  task('Subtask', { dueDate: day(-1), parentId: 't1' }),
];

const groups = mobileNextWeek(tasks);
const byKey = Object.fromEntries(groups.map((g) => [g.key, g.tasks.map((t) => t.title)]));

let fails = 0;
const check = (name: string, cond: boolean, extra = '') => {
  if (cond) console.log(`✅ ${name}`);
  else {
    console.log(`❌ ${name} ${extra}`);
    fails++;
  }
};

check(
  'Überfällig-Gruppe existiert und steht an erster Stelle',
  groups[0]?.key === 'overdue' && groups[0]?.label === 'Überfällig',
  groups.map((g) => g.key).join(',')
);
check(
  'Überfällig enthält genau die Vergangenheits-Tasks, älteste zuerst',
  JSON.stringify(byKey.overdue) === JSON.stringify(['Alt: 26. Dez', 'Alt: vorgestern', 'Gestern']),
  JSON.stringify(byKey.overdue)
);
check(
  'Heute enthält beide Heute-Tasks (auch die vom Morgen)',
  JSON.stringify(byKey.today) === JSON.stringify(['Heute frueh', 'Heute spaet']),
  JSON.stringify(byKey.today)
);
check('Morgen unverändert', JSON.stringify(byKey.tomorrow) === JSON.stringify(['Morgen']));
check(
  'Diese Woche enthält KEINE überfälligen mehr',
  JSON.stringify(byKey.week) === JSON.stringify(['In 3 Tagen']),
  JSON.stringify(byKey.week)
);
check(
  'Ohne Datum / später: thisWeek-Flag bleibt',
  JSON.stringify(byKey.future) === JSON.stringify(['Ohne Datum, thisWeek']),
  JSON.stringify(byKey.future)
);

const all = groups.flatMap((g) => g.tasks.map((t) => t.title));
check('Kein Task doppelt', new Set(all).size === all.length);
check('Erledigte und Subtasks bleiben draußen', !all.includes('Erledigt gestern') && !all.includes('Subtask'));
check('Tasks außerhalb des Fensters bleiben draußen', !all.includes('Weit weg'));
check('Leere Gruppen werden nicht gerendert', groups.every((g) => g.tasks.length > 0));

// Ohne überfällige Tasks darf die Gruppe gar nicht erscheinen.
const noOverdue = mobileNextWeek([task('Nur heute', { dueDate: day(0) })]);
check('Ohne Überfällige keine Überfällig-Gruppe', noOverdue.every((g) => g.key !== 'overdue'));

if (fails) {
  console.log(`\n${fails} FEHLER`);
  process.exit(1);
}
console.log('\n✅ PASS — Woche-Gruppierung: Überfällig separat, nichts verloren.');
