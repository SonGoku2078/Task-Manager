// Copy the Production database into the Dev/Test database so the sandbox can be
// tested against realistic data. Never writes to data.db.
//   Prod:     ~/.task-manager/data.db
//   Dev/Test: ~/.task-manager/dev.db
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, copyFileSync, mkdirSync } from 'node:fs';

const dir = join(homedir(), '.task-manager');
const prod = join(dir, 'data.db');
const dev = join(dir, 'dev.db');

mkdirSync(dir, { recursive: true });

if (!existsSync(prod)) {
  console.error(`Prod DB not found at ${prod} — start the prod app first (npm run start:prod).`);
  process.exit(1);
}

copyFileSync(prod, dev);
console.log(`Seeded Dev/Test DB:\n  from ${prod}\n  to   ${dev}`);
console.log('Stop any running Dev/Test server before seeding, then restart it.');
