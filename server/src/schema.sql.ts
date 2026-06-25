export const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  number          INTEGER NOT NULL,
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  project_id      TEXT,
  parent_id       TEXT,
  section_id      TEXT,
  due_date        TEXT,
  start_minutes   INTEGER,
  duration_min    INTEGER,
  priority        TEXT NOT NULL DEFAULT 'medium',
  completed       INTEGER NOT NULL DEFAULT 0,
  starred         INTEGER NOT NULL DEFAULT 0,
  someday         INTEGER NOT NULL DEFAULT 0,
  this_week       INTEGER NOT NULL DEFAULT 0,
  waiting         INTEGER NOT NULL DEFAULT 0,
  waiting_for     TEXT,
  recurrence      TEXT NOT NULL DEFAULT 'none',
  recurrence_end  TEXT,
  recur_interval  INTEGER,
  recur_unit      TEXT,
  recur_month_day TEXT,
  completed_at    TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  nozbe_id        TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  category_ids    TEXT NOT NULL DEFAULT '[]',
  assignee_ids    TEXT NOT NULL DEFAULT '[]',
  comments        TEXT NOT NULL DEFAULT '[]',
  attachments     TEXT NOT NULL DEFAULT '[]',
  links               TEXT NOT NULL DEFAULT '[]',
  linked_project_id   TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#4caf50',
  icon        TEXT NOT NULL DEFAULT '📁',
  label       TEXT,
  pinned      INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  kind        TEXT NOT NULL DEFAULT 'project',
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  nozbe_id        TEXT,
  parent_area_id  TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#4caf50',
  sort_order INTEGER NOT NULL DEFAULT 0,
  nozbe_id   TEXT
);

CREATE TABLE IF NOT EXISTS members (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'editor',
  color      TEXT NOT NULL DEFAULT '#4caf50',
  avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS sections (
  id         TEXT PRIMARY KEY,
  scope      TEXT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS blockers (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  weekdays      TEXT NOT NULL DEFAULT '[]',
  start_minutes INTEGER NOT NULL DEFAULT 0,
  duration_min  INTEGER NOT NULL DEFAULT 60
);

CREATE TABLE IF NOT EXISTS saved_views (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  filters      TEXT NOT NULL DEFAULT '{}',
  sort_field   TEXT NOT NULL DEFAULT 'manual',
  sort_dir     TEXT NOT NULL DEFAULT 'asc',
  search_query TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS activity_log (
  id          TEXT PRIMARY KEY,
  at          TEXT NOT NULL,
  actor       TEXT NOT NULL DEFAULT '',
  kind        TEXT NOT NULL,
  task_id     TEXT,
  task_number INTEGER,
  task_title  TEXT NOT NULL DEFAULT '',
  field       TEXT,
  from_val    TEXT,
  to_val      TEXT,
  payload     TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_project  ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due      ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_parent   ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_order    ON tasks(sort_order);
CREATE INDEX IF NOT EXISTS idx_activity_at    ON activity_log(at DESC);
`;
