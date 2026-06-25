import { app, BrowserWindow, shell } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as http from 'http';

const PORT = 3001;
let serverProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

// Resolve path to the bundled server or dev server.
function getServerEntry(): string {
  if (app.isPackaged) {
    // In production: server/index.js lives in the extraResources folder.
    return path.join(process.resourcesPath, 'server', 'index.js');
  }
  // In dev: compiled server next to the electron folder.
  return path.join(__dirname, '..', '..', 'server', 'dist', 'index.js');
}

function startServer(): void {
  const entry = getServerEntry();
  serverProcess = spawn(process.execPath, [entry], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit',
  });
  serverProcess.on('error', (err) => console.error('Server start error:', err));
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

  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Open external links in the OS browser, not Electron.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  startServer();
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
  if (serverProcess) serverProcess.kill();
});
