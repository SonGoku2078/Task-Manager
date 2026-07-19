"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
// Thin client (#55/#60/#62): the desktop app is a window onto a running
// Task-Manager server. Target resolution, first hit wins:
//   1. TM_DESKTOP_URL  — full URL override (tests/power users)
//   2. TM_DESKTOP_PORT — 127.0.0.1:<port> (E2E against the dev backend)
//   3. userData/config.json { "serverUrl": … } — set in-app (#62), persisted
//   4. default: prod server http://192.168.8.50:3001 (packaged) / vite :5173 (dev)
const DEFAULT_URL_PACKAGED = 'http://192.168.8.50:3001';
const DEFAULT_URL_DEV = 'http://127.0.0.1:5173';
const POLL_MS = 2000;
let mainWindow = null;
let pollTimer = null;
// Startup log under userData — "double-click does nothing" must stay diagnosable.
function logToFile(msg) {
    try {
        fs.appendFileSync(path.join(electron_1.app.getPath('userData'), 'startup.log'), `[${new Date().toISOString()}] ${msg}\n`);
    }
    catch {
        /* logging must never crash the app */
    }
}
process.on('uncaughtException', (err) => {
    logToFile(`uncaughtException: ${err?.stack ?? String(err)}`);
    try {
        electron_1.dialog.showErrorBox('SelfManaged – Fehler', String(err));
    }
    catch {
        /* headless */
    }
    electron_1.app.exit(1);
});
// E2E isolation: private userData also scopes config + single-instance lock.
if (process.env.TM_USER_DATA_DIR)
    electron_1.app.setPath('userData', process.env.TM_USER_DATA_DIR);
// ── Persisted config (#62) ────────────────────────────────────────────────────
const configPath = () => path.join(electron_1.app.getPath('userData'), 'config.json');
function loadSavedServerUrl() {
    try {
        const raw = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
        return typeof raw.serverUrl === 'string' && raw.serverUrl ? raw.serverUrl : null;
    }
    catch {
        return null; // missing/corrupt config → defaults
    }
}
function saveServerUrl(url) {
    fs.mkdirSync(electron_1.app.getPath('userData'), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify({ serverUrl: url }, null, 2));
}
// Accept http(s) origins only; strip trailing slashes. Returns null if invalid.
function normalizeServerUrl(input) {
    const v = (input ?? '').trim().replace(/\/+$/, '');
    const withScheme = /^https?:\/\//i.test(v) ? v : v ? `http://${v}` : '';
    try {
        const u = new URL(withScheme);
        if (u.protocol !== 'http:' && u.protocol !== 'https:')
            return null;
        return u.origin;
    }
    catch {
        return null;
    }
}
function resolveTarget() {
    if (process.env.TM_DESKTOP_URL) {
        return normalizeServerUrl(process.env.TM_DESKTOP_URL) ?? DEFAULT_URL_PACKAGED;
    }
    if (process.env.TM_DESKTOP_PORT)
        return `http://127.0.0.1:${Number(process.env.TM_DESKTOP_PORT)}`;
    const saved = loadSavedServerUrl();
    if (saved)
        return saved;
    return electron_1.app.isPackaged ? DEFAULT_URL_PACKAGED : DEFAULT_URL_DEV;
}
let currentTarget = ''; // set in main() — app.isPackaged needs the ready app
// ── Health check + fallback page + polling ──────────────────────────────────
function checkHealth(target) {
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
function showFallback(win, mode) {
    void win.loadFile(path.join(__dirname, 'fallback.html'), {
        query: { target: currentTarget, mode },
    });
}
function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}
function startPolling(win) {
    stopPolling();
    pollTimer = setInterval(() => {
        void (async () => {
            if (win.isDestroyed()) {
                stopPolling();
                return;
            }
            if (await checkHealth(currentTarget)) {
                stopPolling();
                if (!win.isDestroyed())
                    void win.loadURL(currentTarget);
            }
        })();
    }, POLL_MS);
}
async function connectAndLoad(win) {
    if (await checkHealth(currentTarget)) {
        void win.loadURL(currentTarget);
    }
    else {
        showFallback(win, 'error');
        startPolling(win);
    }
}
// ── IPC (#62): the fallback/change page sets a new server URL ────────────────
electron_1.ipcMain.handle('tm:get-target', () => currentTarget);
electron_1.ipcMain.handle('tm:set-server-url', async (_e, input) => {
    const url = normalizeServerUrl(String(input));
    if (!url)
        return { ok: false, error: 'Ungültige Adresse — erwartet z. B. http://192.168.8.50:3001' };
    currentTarget = url;
    try {
        saveServerUrl(url);
    }
    catch (err) {
        logToFile(`config save failed: ${String(err)}`);
    }
    const win = mainWindow;
    if (win && !win.isDestroyed()) {
        stopPolling();
        if (await checkHealth(url)) {
            void win.loadURL(url);
        }
        else {
            showFallback(win, 'error');
            startPolling(win);
        }
    }
    return { ok: true };
});
function buildMenu() {
    const template = [
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
    electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate(template));
}
function createWindow() {
    const win = new electron_1.BrowserWindow({
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
    if (!electron_1.app.isPackaged &&
        !process.env.TM_DESKTOP_PORT &&
        !process.env.TM_DESKTOP_URL &&
        !process.env.TM_USER_DATA_DIR)
        win.webContents.openDevTools();
    // Open external links in the OS browser, not Electron.
    win.webContents.setWindowOpenHandler(({ url }) => {
        void electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    // Server died between health check and load (or a mid-session reload failed):
    // back to the fallback page and keep polling instead of a white screen.
    win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
        if (!isMainFrame || code === -3 /* ERR_ABORTED: our own navigation */)
            return;
        if (!url.startsWith('http'))
            return; // ignore the file:// fallback itself
        logToFile(`did-fail-load ${code} ${desc} ${url}`);
        showFallback(win, 'error');
        startPolling(win);
    });
    win.on('closed', () => {
        stopPolling();
        if (mainWindow === win)
            mainWindow = null;
    });
    return win;
}
async function main() {
    currentTarget = resolveTarget();
    logToFile(`start pid=${process.pid} packaged=${electron_1.app.isPackaged} target=${currentTarget}`);
    buildMenu();
    const win = createWindow();
    await connectAndLoad(win);
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            void connectAndLoad(createWindow());
    });
}
// Single instance: a second launch hands over to the running one and exits.
if (!electron_1.app.requestSingleInstanceLock()) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
    void electron_1.app.whenReady().then(main);
}
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
