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
// Thin client (#55): the desktop app no longer embeds its own server — it is a
// window onto the already-running Task-Manager server. Packaged builds target
// the production server (:3001), dev runs target the vite dev server (:5173,
// which proxies /health to the dev backend). TM_DESKTOP_PORT overrides the
// target for tests, so E2E can point at the dev backend or a dead port.
// Number(x || fallback), not ??: an empty env string must fall through.
const PORT = Number(process.env.TM_DESKTOP_PORT || (electron_1.app.isPackaged ? 3001 : 5173));
// 127.0.0.1, not localhost: on Windows 11 Node and Chromium may resolve
// localhost to different address families (::1 vs IPv4).
const APP_URL = `http://127.0.0.1:${PORT}`;
const HEALTH_URL = `${APP_URL}/health`;
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
// E2E isolation: private userData also scopes the single-instance lock, so
// tests never fight with an installed running app.
if (process.env.TM_USER_DATA_DIR)
    electron_1.app.setPath('userData', process.env.TM_USER_DATA_DIR);
function checkHealth() {
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
function showFallback(win) {
    // Query param lets the static page show the actual target URL.
    void win.loadFile(path.join(__dirname, 'fallback.html'), { query: { target: APP_URL } });
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
            if (await checkHealth()) {
                stopPolling();
                if (!win.isDestroyed())
                    void win.loadURL(APP_URL);
            }
        })();
    }, POLL_MS);
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
        },
    });
    mainWindow = win;
    // DevTools only for a plain dev run — E2E always sets TM_DESKTOP_PORT, and
    // an open DevTools window breaks Playwright's firstWindow().
    if (!electron_1.app.isPackaged && !process.env.TM_DESKTOP_PORT)
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
        showFallback(win);
        startPolling(win);
    });
    win.on('closed', () => {
        stopPolling();
        if (mainWindow === win)
            mainWindow = null;
    });
    return win;
}
async function connectAndLoad(win) {
    if (await checkHealth()) {
        void win.loadURL(APP_URL);
    }
    else {
        showFallback(win);
        startPolling(win);
    }
}
async function main() {
    logToFile(`start pid=${process.pid} packaged=${electron_1.app.isPackaged} target=${APP_URL}`);
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
