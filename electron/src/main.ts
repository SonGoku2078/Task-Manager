import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import * as http from 'http';

const PORT = 3001;
let mainWindow: BrowserWindow | null = null;

// In production: load the Express server directly in this process.
function startServer(): void {
  const entry = path.join(process.resourcesPath, 'server', 'index.js');
  process.env.PORT = String(PORT);
  try {
    require(entry);
  } catch (e) {
    const { dialog } = require('electron');
    dialog.showErrorBox('Server Start Error', String(e));
  }
}

function waitForServer(retries = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    const attempt = (n: number) => {
      http.get(`http://localhost:${PORT}/health`, (res) => {
        if (res.statusCode === 200) return resolve();
        if (n <= 0) return reject(new Error('Server did not start in time'));
        setTimeout(() => attempt(n - 1), 300);
      }).on('error', () => {
        if (n <= 0) return reject(new Error('Server did not start in time'));
        setTimeout(() => attempt(n - 1), 300);
      });
    };
    attempt(retries);
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
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

  const url = app.isPackaged
    ? `http://localhost:${PORT}`
    : 'http://localhost:5173';
  mainWindow.loadURL(url);
  if (!app.isPackaged) mainWindow.webContents.openDevTools();

  // Open external links in the OS browser, not Electron.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  if (app.isPackaged) {
    startServer();
  }
  try {
    await waitForServer();
  } catch (e) {
    console.error('Could not reach server:', e);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  // Server runs in-process, nothing to kill separately.
});
