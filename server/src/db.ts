import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { SCHEMA } from './schema.sql';

const DB_PATH =
  process.env.DB_PATH ??
  path.join(os.homedir(), '.task-manager', 'data.db');

// Ensure the directory exists.
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.exec(SCHEMA);

console.log(`SQLite database: ${DB_PATH}`);
