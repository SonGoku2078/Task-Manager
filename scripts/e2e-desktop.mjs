// E2E for the Electron thin client (#55). Runs the committed electron/main.js
// via Playwright's _electron against the DEV backend (:3002) and a throwaway
// server — production (:3001) is never touched.
//
// Preconditions: dev backend running on 127.0.0.1:3002 (npm run dev:server),
// playwright + tsx available in the root node_modules.
import { _electron } from 'playwright';
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ELECTRON_EXE = path.join(ROOT, 'electron', 'node_modules', 'electron', 'dist', 'electron.exe');
const APP_DIR = process.env.E2E_APP_DIR ?? path.join(ROOT, 'electron'); // packaged exe via env override
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-e2e-desktop-'));
const DEAD_PORT = '3999';

const results = [];
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
};

const launchApp = (port, udDir, extraEnv = {}) => {
  const env = {
    ...process.env,
    TM_USER_DATA_DIR: path.join(TMP, udDir),
    ...(port ? { TM_DESKTOP_PORT: port } : {}),
    ...extraEnv,
  };
  // VS Code terminals export this — it would demote electron.exe to plain Node.
  delete env.ELECTRON_RUN_AS_NODE;
  return _electron.launch({
    executablePath: process.env.E2E_EXE ?? ELECTRON_EXE,
    args: process.env.E2E_EXE ? [] : [APP_DIR],
    env,
  });
};

// Throwaway server from source via tsx — writes nothing to server/dist.
const startThrowawayServer = (port) =>
  spawn('npx tsx server/src/index.ts', {
    cwd: ROOT,
    shell: true,
    env: { ...process.env, PORT: port, DB_PATH: path.join(TMP, `e2e-${port}.db`) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const killTree = (child) => {
  try {
    execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
  } catch {
    /* already gone */
  }
};

let appA, appB, srv;
try {
  // Precondition: dev backend reachable.
  const devUp = await fetch('http://127.0.0.1:3002/health').then((r) => r.ok).catch(() => false);
  if (!devUp) throw new Error('Dev-Backend :3002 läuft nicht — bitte npm run dev:server starten.');

  // ── Scenario A: server reachable → app loads it directly ──
  appA = await launchApp('3002', 'ud-a');
  const pageA = await appA.firstWindow();
  await pageA.waitForURL('http://127.0.0.1:3002/', { timeout: 15000 });
  await pageA.waitForSelector('.quick-add-input', { timeout: 15000 });
  ok('A: window loads dev server UI (127.0.0.1:3002)', true);
  await appA.close();
  appA = null;

  // ── Scenario B: dead port → fallback page, then auto-recovery ──
  appB = await launchApp(DEAD_PORT, 'ud-b');
  const pageB = await appB.firstWindow();
  await pageB.getByText('Server nicht erreichbar').waitFor({ timeout: 10000 });
  ok('B1: fallback page shown on dead port', true);

  srv = startThrowawayServer(DEAD_PORT);
  await pageB.waitForURL(`http://127.0.0.1:${DEAD_PORT}/`, { timeout: 25000 });
  await pageB.waitForSelector('.quick-add-input', { timeout: 15000 });
  ok('B2: auto-recovery — app loads once server appears', true);

  // ── Scenario C: EADDRINUSE → clean German error + exit 1 ──
  const dup = startThrowawayServer(DEAD_PORT);
  let dupErr = '';
  dup.stderr.on('data', (d) => (dupErr += d.toString()));
  dup.stdout.on('data', (d) => (dupErr += d.toString()));
  const dupExit = await new Promise((resolve) => {
    dup.on('exit', (code) => resolve(code));
    setTimeout(() => {
      killTree(dup);
      resolve('timeout');
    }, 15000);
  });
  ok('C: duplicate server exits cleanly with message', dupExit !== 'timeout' && /bereits belegt/.test(dupErr),
    `exit=${dupExit}`);

  await appB.close();
  appB = null;
  killTree(srv); // free :3999 — scenario F needs it dead again
  srv = null;

  // ── Scenario D (#60): TM_DESKTOP_URL full-URL override ──
  const appD = await launchApp(null, 'ud-d', { TM_DESKTOP_URL: 'http://127.0.0.1:3002' });
  const pageD = await appD.firstWindow();
  await pageD.waitForURL('http://127.0.0.1:3002/', { timeout: 15000 });
  ok('D: TM_DESKTOP_URL override respected', true);
  await appD.close();

  // ── Scenario E (#62): saved config.json wins without env overrides ──
  const udE = path.join(TMP, 'ud-e');
  fs.mkdirSync(udE, { recursive: true });
  fs.writeFileSync(path.join(udE, 'config.json'), JSON.stringify({ serverUrl: 'http://127.0.0.1:3002' }));
  const appE = await launchApp(null, 'ud-e');
  const pageE = await appE.firstWindow();
  await pageE.waitForURL('http://127.0.0.1:3002/', { timeout: 15000 });
  ok('E: persisted serverUrl from config.json used', true);
  await appE.close();

  // ── Scenario F (#62): enter a server on the fallback page ──
  const appF = await launchApp(DEAD_PORT, 'ud-f');
  const pageF = await appF.firstWindow();
  await pageF.getByText('Server nicht erreichbar').waitFor({ timeout: 10000 });
  await pageF.fill('#url', 'http://127.0.0.1:3002');
  await pageF.click('#connect');
  await pageF.waitForURL('http://127.0.0.1:3002/', { timeout: 15000 });
  const cfgF = JSON.parse(fs.readFileSync(path.join(TMP, 'ud-f', 'config.json'), 'utf8'));
  ok('F: fallback input connects + persists', cfgF.serverUrl === 'http://127.0.0.1:3002', JSON.stringify(cfgF));

  // ── Scenario G (#62): menu "Server ändern…" opens the change page ──
  await appF.evaluate(({ Menu }) => {
    const item = Menu.getApplicationMenu()
      ?.items.find((i) => i.label === 'Datei')
      ?.submenu?.items.find((i) => i.label === 'Server ändern…');
    item?.click();
  });
  await pageF.getByText('Server ändern').waitFor({ timeout: 10000 });
  ok('G: menu opens change-server page', true);
  await appF.close();
} catch (err) {
  console.error('💥 E2E failed:', err.message);
  results.push({ name: 'run', pass: false });
} finally {
  if (appA) await appA.close().catch(() => {});
  if (appB) await appB.close().catch(() => {});
  if (srv) killTree(srv);
  try {
    fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  } catch {
    /* Electron profile handles can linger briefly — leftover tmp dir is harmless */
  }
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
