import { contextBridge, ipcRenderer } from 'electron';

// #62: minimal bridge so the fallback/change page can read and change the
// server target. Exposed on every page (incl. the remote app) — the main
// process validates every URL, so the surface stays harmless.
contextBridge.exposeInMainWorld('tm', {
  getTarget: (): Promise<string> => ipcRenderer.invoke('tm:get-target'),
  setServerUrl: (url: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('tm:set-server-url', url),
  // #84: laufende Version der Desktop-App fuer die Einstellungen.
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('tm:get-app-version'),
});
