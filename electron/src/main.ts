import { app, BrowserWindow, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';

// Thin client (#55): the desktop app no longer embeds its own server — it is a
// window onto the already-running Task-Manager server. Packaged builds target
// the production server (:3001), dev runs target the vite dev server (:5173,
// which proxies /health to the dev backend). TM_DESKTOP_PORT overrides the
// target for tests, so E2E can point at the dev backend or a dead port.
// Number(x || fallback), not ??: an empty env string must fall through.
const PORT = Number(process.env.TM_DESKTOP_PORT || (app.isPackaged ? 3001 : 5173));
// 127.0.0.1, not localhost: on Windows 11 Node and Chromium may resolve
// localhost to different address families (::1 vs IPv4).
const APP_URL = `http://127.0.0.1:${PORT}`;
const HEALTH_URL = `${APP_URL}/health`;
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

// E2E isolation: private userData also scopes the single-instance lock, so
// tests never fight with an installed running app.
if (process.env.TM_USER_DATA_DIR) app.setPath('userData', process.env.TM_USER_DATA_DIR);

function checkHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 1500 }, (res) => {
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

function showFallback(win: BrowserWindow): void {
  // Query param lets the static page show the actual target URL.
  void win.loadFile(path.join(__dirname, 'fallback.html'), { query: { target: APP_URL } });
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
      if (await checkHealth()) {
        stopPolling();
        if (!win.isDestroyed()) void win.loadURL(APP_URL);
      }
    })();
  }, POLL_MS);
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
    },
  });
  mainWindow = win;
  // DevTools only for a plain dev run — E2E always sets TM_DESKTOP_PORT, and
  // an open DevTools window breaks Playwright's firstWindow().
  if (!app.isPackaged && !process.env.TM_DESKTOP_PORT) win.webContents.openDevTools();

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
    showFallback(win);
    startPolling(win);
  });

  win.on('closed', () => {
    stopPolling();
    if (mainWindow === win) mainWindow = null;
  });
  return win;
}

async function connectAndLoad(win: BrowserWindow): Promise<void> {
  if (await checkHealth()) {
    void win.loadURL(APP_URL);
  } else {
    showFallback(win);
    startPolling(win);
  }
}

async function main(): Promise<void> {
  logToFile(`start pid=${process.pid} packaged=${app.isPackaged} target=${APP_URL}`);
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
