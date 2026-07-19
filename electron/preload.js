"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// #62: minimal bridge so the fallback/change page can read and change the
// server target. Exposed on every page (incl. the remote app) — the main
// process validates every URL, so the surface stays harmless.
electron_1.contextBridge.exposeInMainWorld('tm', {
    getTarget: () => electron_1.ipcRenderer.invoke('tm:get-target'),
    setServerUrl: (url) => electron_1.ipcRenderer.invoke('tm:set-server-url', url),
});
