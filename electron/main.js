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
const http = __importStar(require("http"));
const PORT = 3001;
let mainWindow = null;
// In production: load the Express server directly in this process.
function startServer() {
    const entry = path.join(process.resourcesPath, 'server', 'index.js');
    process.env.PORT = String(PORT);
    try {
        require(entry);
    }
    catch (e) {
        const { dialog } = require('electron');
        dialog.showErrorBox('Server Start Error', String(e));
    }
}
function waitForServer(retries = 30) {
    return new Promise((resolve, reject) => {
        const attempt = (n) => {
            http.get(`http://localhost:${PORT}/health`, (res) => {
                if (res.statusCode === 200)
                    return resolve();
                if (n <= 0)
                    return reject(new Error('Server did not start in time'));
                setTimeout(() => attempt(n - 1), 300);
            }).on('error', () => {
                if (n <= 0)
                    return reject(new Error('Server did not start in time'));
                setTimeout(() => attempt(n - 1), 300);
            });
        };
        attempt(retries);
    });
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    const url = electron_1.app.isPackaged
        ? `http://localhost:${PORT}`
        : 'http://localhost:5173';
    mainWindow.loadURL(url);
    if (!electron_1.app.isPackaged)
        mainWindow.webContents.openDevTools();
    // Open external links in the OS browser, not Electron.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    mainWindow.on('closed', () => { mainWindow = null; });
}
electron_1.app.whenReady().then(async () => {
    if (electron_1.app.isPackaged) {
        startServer();
    }
    try {
        await waitForServer();
    }
    catch (e) {
        console.error('Could not reach server:', e);
    }
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('quit', () => {
    // Server runs in-process, nothing to kill separately.
});
