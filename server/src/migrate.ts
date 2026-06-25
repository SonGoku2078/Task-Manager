import type Database from 'better-sqlite3';

// Accept either the raw Zustand persist envelope or the unwrapped state object.
function unwrap(data: Record<string, unknown>): Record<string, unknown> {
  return (data.state as Record<string, unknown>) ?? data;
}

export function runMigration(db: Database.Database, raw: Record<string, unknown>): number {
  const state = unwrap(raw);
  const tasks    = (state.tasks    as unknown[]) ?? [];
  const projects = (state.projects as unknown[]) ?? [];
  const cats     = (state.categories  as unknown[]) ?? [];
  const members  = (state.members  as unknown[]) ?? [];
  const sections = (state.sections as unknown[]) ?? [];
  const blockers = (state.blockers as unknown[]) ?? [];
  const views    = (state.savedViews as unknown[]) ?? [];
  const log      = (state.activityLog as unknown[]) ?? [];
  const settings = (state.settings as Record<string, unknown>) ?? {};
  const nextNum  = (state.nextTaskNumber as number) ?? 1;

  const now = new Date().toISOString();

  db.transaction(() => {
    // Tasks
    const insTask = db.prepare(`INSERT OR REPLACE INTO tasks VALUES (
      @id,@number,@title,@description,@project_id,@parent_id,@section_id,
      @due_date,@start_minutes,@duration_min,@priority,@completed,@starred,
      @someday,@this_week,@waiting,@waiting_for,@recurrence,@recurrence_end,
      @recur_interval,@recur_unit,@recur_month_day,@created_at,@updated_at,
      @nozbe_id,@sort_order,@category_ids,@assignee_ids,@comments,@attachments,@links,@linked_project_id
    )`);
    tasks.forEach((t: unknown, i: number) => {
      const task = t as Record<string, unknown>;
      insTask.run({
        id: task.id, number: task.number ?? i + 1,
        title: task.title ?? '', description: task.description ?? '',
        project_id: task.projectId ?? null, parent_id: task.parentId ?? null,
        section_id: task.sectionId ?? null,
        due_date: task.dueDate ? new Date(task.dueDate as string).toISOString() : null,
        start_minutes: task.startMinutes ?? null, duration_min: task.durationMin ?? null,
        priority: task.priority ?? 'medium',
        completed: task.completed ? 1 : 0, starred: task.starred ? 1 : 0,
        someday: task.someday ? 1 : 0, this_week: task.thisWeek ? 1 : 0,
        waiting: task.waiting ? 1 : 0, waiting_for: task.waitingFor ?? null,
        recurrence: task.recurrence ?? 'none',
        recurrence_end: task.recurrenceEnd ? new Date(task.recurrenceEnd as string).toISOString() : null,
        recur_interval: task.recurInterval ?? null, recur_unit: task.recurUnit ?? null,
        recur_month_day: task.recurMonthDay ?? null,
        created_at: task.createdAt ? new Date(task.createdAt as string).toISOString() : now,
        updated_at: task.updatedAt ? new Date(task.updatedAt as string).toISOString() : now,
        nozbe_id: task.nozbeId ?? null, sort_order: i,
        category_ids: JSON.stringify(task.categoryIds ?? []),
        assignee_ids: JSON.stringify(task.assigneeIds ?? []),
        comments: JSON.stringify(task.comments ?? []),
        attachments: JSON.stringify(task.attachments ?? []),
        links: JSON.stringify(task.links ?? []),
        linked_project_id: task.linkedProjectId ?? null,
      });
    });

    // Projects
    const insProj = db.prepare(`INSERT OR REPLACE INTO projects VALUES (@id,@name,@color,@icon,@label,@pinned,@active,@kind,@description,@sort_order,@nozbe_id)`);
    projects.forEach((p: unknown, i: number) => {
      const proj = p as Record<string, unknown>;
      insProj.run({ id: proj.id, name: proj.name ?? '', color: proj.color ?? '#4caf50', icon: proj.icon ?? '📁', label: proj.label ?? null, pinned: proj.pinned ? 1 : 0, active: proj.active !== false ? 1 : 0, kind: proj.kind ?? 'project', description: proj.description ?? null, sort_order: i, nozbe_id: proj.nozbeId ?? null });
    });

    // Categories
    const insCat = db.prepare(`INSERT OR REPLACE INTO categories VALUES (@id,@name,@color,@sort_order,@nozbe_id)`);
    cats.forEach((c: unknown, i: number) => {
      const cat = c as Record<string, unknown>;
      insCat.run({ id: cat.id, name: cat.name ?? '', color: cat.color ?? '#4caf50', sort_order: i, nozbe_id: cat.nozbeId ?? null });
    });

    // Members
    const insMem = db.prepare(`INSERT OR REPLACE INTO members VALUES (@id,@name,@role,@color,@avatar_url)`);
    members.forEach((m: unknown) => {
      const mem = m as Record<string, unknown>;
      insMem.run({ id: mem.id, name: mem.name ?? '', role: mem.role ?? 'editor', color: mem.color ?? '#4caf50', avatar_url: mem.avatarUrl ?? null });
    });

    // Sections
    const insSec = db.prepare(`INSERT OR REPLACE INTO sections VALUES (@id,@scope,@name,@sort_order)`);
    sections.forEach((s: unknown, i: number) => {
      const sec = s as Record<string, unknown>;
      insSec.run({ id: sec.id, scope: sec.scope ?? '', name: sec.name ?? '', sort_order: i });
    });

    // Blockers
    const insBlk = db.prepare(`INSERT OR REPLACE INTO blockers VALUES (@id,@project_id,@weekdays,@start_minutes,@duration_min)`);
    blockers.forEach((b: unknown) => {
      const blk = b as Record<string, unknown>;
      insBlk.run({ id: blk.id, project_id: blk.projectId, weekdays: JSON.stringify(blk.weekdays ?? []), start_minutes: blk.startMinutes ?? 0, duration_min: blk.durationMin ?? 60 });
    });

    // Saved views
    const insView = db.prepare(`INSERT OR REPLACE INTO saved_views VALUES (@id,@name,@filters,@sort_field,@sort_dir,@search_query,@sort_order)`);
    views.forEach((v: unknown, i: number) => {
      const view = v as Record<string, unknown>;
      insView.run({ id: view.id, name: view.name ?? '', filters: JSON.stringify(view.filters ?? {}), sort_field: view.sortField ?? 'manual', sort_dir: view.sortDir ?? 'asc', search_query: view.searchQuery ?? '', sort_order: i });
    });

    // Activity log (newest first, cap 500)
    const insLog = db.prepare(`INSERT OR REPLACE INTO activity_log VALUES (@id,@at,@actor,@kind,@task_id,@task_number,@task_title,@field,@from_val,@to_val,@payload)`);
    log.slice(-500).forEach((e: unknown) => {
      const entry = e as Record<string, unknown>;
      insLog.run({ id: entry.id, at: new Date(entry.at as string).toISOString(), actor: entry.actor ?? '', kind: entry.kind, task_id: entry.taskId ?? null, task_number: entry.taskNumber ?? null, task_title: entry.taskTitle ?? '', field: entry.field ?? null, from_val: entry.from ?? null, to_val: entry.to ?? null, payload: entry.payload ? JSON.stringify(entry.payload) : null });
    });

    // Settings
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(settings)) {
      upsert.run(k, typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''));
    }
    upsert.run('nextTaskNumber', String(nextNum));
    upsert.run('migrated', '1');
  })();

  console.log(`Migration complete: ${tasks.length} tasks, ${projects.length} projects.`);
  return tasks.length;
}
