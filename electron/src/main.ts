import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

// Thin client (#55/#60/#62): the desktop app is a window onto a running
// Task-Manager server. Target resolution, first hit wins:
//   1. TM_DESKTOP_URL  — full URL override (tests/power users)
//   2. TM_DESKTOP_PORT — 127.0.0.1:<port> (E2E against the dev backend)
//   3. userData/config.json { "serverUrl": … } — set in-app (#62), persisted
//   4. default: prod server http://192.168.8.50:3001 (packaged) / vite :5173 (dev)
const DEFAULT_URL_PACKAGED = 'http://192.168.8.50:3001';
const DEFAULT_URL_DEV = 'http://127.0.0.1:5173';
const POLL_MS = 2000;

let mainWindow: BrowserWindow | null = null;
let pollTimer: NodeJS.Timeout | null = null;

// Startup log under userData — "double-click does nothing" must stay diagnosable.
function logToFile(msg: string): void {
  try {
    fs.appendFileSync(
      path.join(app.getPath('userData'), 'startup.log'),
      `[${new Date().toISOString()}] ${msg}\n`
    );
  } catch {
    /* logging must never crash the app */
  }
}

process.on('uncaughtException', (err) => {
  logToFile(`uncaughtException: ${(err as Error)?.stack ?? String(err)}`);
  try {
    dialog.showErrorBox('SelfManaged – Fehler', String(err));
  } catch {
    /* headless */
  }
  app.exit(1);
});

// E2E isolation: private userData also scopes config + single-instance lock.
if (process.env.TM_USER_DATA_DIR) app.setPath('userData', process.env.TM_USER_DATA_DIR);

// ── Persisted config (#62) ────────────────────────────────────────────────────
const configPath = (): string => path.join(app.getPath('userData'), 'config.json');

function loadSavedServerUrl(): string | null {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), 'utf8')) as { serverUrl?: unknown };
    return typeof raw.serverUrl === 'string' && raw.serverUrl ? raw.serverUrl : null;
  } catch {
    return null; // missing/corrupt config → defaults
  }
}

function saveServerUrl(url: string): void {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify({ serverUrl: url }, null, 2));
}

// Accept http(s) origins only; strip trailing slashes. Returns null if invalid.
function normalizeServerUrl(input: string): string | null {
  const v = (input ?? '').trim().replace(/\/+$/, '');
  const withScheme = /^https?:\/\//i.test(v) ? v : v ? `http://${v}` : '';
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.origin;
  } catch {
    return null;
  }
}

function resolveTarget(): string {
  if (process.env.TM_DESKTOP_URL) {
    return normalizeServerUrl(process.env.TM_DESKTOP_URL) ?? DEFAULT_URL_PACKAGED;
  }
  if (process.env.TM_DESKTOP_PORT) return `http://127.0.0.1:${Number(process.env.TM_DESKTOP_PORT)}`;
  const saved = loadSavedServerUrl();
  if (saved) return saved;
  return app.isPackaged ? DEFAULT_URL_PACKAGED : DEFAULT_URL_DEV;
}

let currentTarget = ''; // set in main() — app.isPackaged needs the ready app

// ── Health check + fallback page + polling ──────────────────────────────────
function checkHealth(target: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`${target}/health`, { timeout: 1500 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

// mode 'error': server unreachable — page shows spinner, main keeps polling.
// mode 'change': user picked "Server ändern…" — no polling, just the form.
function showFallback(win: BrowserWindow, mode: 'error' | 'change'): void {
  void win.loadFile(path.join(__dirname, 'fallback.html'), {
    query: { target: currentTarget, mode },
  });
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling(win: BrowserWindow): void {
  stopPolling();
  pollTimer = setInterval(() => {
    void (async () => {
      if (win.isDestroyed()) {
        stopPolling();
        return;
      }
      if (await checkHealth(currentTarget)) {
        stopPolling();
        if (!win.isDestroyed()) void win.loadURL(currentTarget);
      }
    })();
  }, POLL_MS);
}

async function connectAndLoad(win: BrowserWindow): Promise<void> {
  if (await checkHealth(currentTarget)) {
    void win.loadURL(currentTarget);
  } else {
    showFallback(win, 'error');
    startPolling(win);
  }
}

// ── IPC (#62): the fallback/change page sets a new server URL ────────────────
ipcMain.handle('tm:get-target', () => currentTarget);
ipcMain.handle('tm:set-server-url', async (_e, input: string) => {
  const url = normalizeServerUrl(String(input));
  if (!url) return { ok: false, error: 'Ungültige Adresse — erwartet z. B. http://192.168.8.50:3001' };
  currentTarget = url;
  try {
    saveServerUrl(url);
  } catch (err) {
    logToFile(`config save failed: ${String(err)}`);
  }
  const win = mainWindow;
  if (win && !win.isDestroyed()) {
    stopPolling();
    if (await checkHealth(url)) {
      void win.loadURL(url);
    } else {
      showFallback(win, 'error');
      startPolling(win);
    }
  }
  return { ok: true };
});

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Datei',
      submenu: [
        {
          label: 'Server ändern…',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              stopPolling();
              showFallback(mainWindow, 'change');
            }
          },
        },
        { type: 'separator' },
        { role: 'quit', label: 'Beenden' },
      ],
    },
    { label: 'Bearbeiten', role: 'editMenu' },
    { label: 'Ansicht', role: 'viewMenu' },
    { label: 'Fenster', role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'SelfManaged',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow = win;
  // DevTools only for a plain dev run — E2E sets TM_USER_DATA_DIR (and usually
  // TM_DESKTOP_PORT/URL); an open DevTools window breaks Playwright's firstWindow().
  if (
    !app.isPackaged &&
    !process.env.TM_DESKTOP_PORT &&
    !process.env.TM_DESKTOP_URL &&
    !process.env.TM_USER_DATA_DIR
  )
    win.webContents.openDevTools();

  // Open external links in the OS browser, not Electron.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  // Server died between health check and load (or a mid-session reload failed):
  // back to the fallback page and keep polling instead of a white screen.
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 /* ERR_ABORTED: our own navigation */) return;
    if (!url.startsWith('http')) return; // ignore the file:// fallback itself
    logToFile(`did-fail-load ${code} ${desc} ${url}`);
    showFallback(win, 'error');
    startPolling(win);
  });

  win.on('closed', () => {
    stopPolling();
    if (mainWindow === win) mainWindow = null;
  });
  return win;
}

async function main(): Promise<void> {
  currentTarget = resolveTarget();
  logToFile(`start pid=${process.pid} packaged=${app.isPackaged} target=${currentTarget}`);
  buildMenu();
  const win = createWindow();
  await connectAndLoad(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void connectAndLoad(createWindow());
  });
}

// Single instance: a second launch hands over to the running one and exits.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  void app.whenReady().then(main);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
