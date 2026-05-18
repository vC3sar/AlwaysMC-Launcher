const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("launcherAPI", {
  getLastProfile: () => ipcRenderer.invoke("launcher:getLastProfile"),
  startContinue: () => ipcRenderer.invoke("launcher:startContinue"),
  startNew: (profile) => ipcRenderer.invoke("launcher:startNew", profile),
  getConfig: () => ipcRenderer.invoke("launcher:getConfig"),
  saveConfig: (config) => ipcRenderer.invoke("launcher:saveConfig", config),
  getInfo: () => ipcRenderer.invoke("launcher:getInfo"),
  toggleFullscreen: () => ipcRenderer.invoke("window:toggleFullscreen"),
  getFullscreen: () => ipcRenderer.invoke("window:getFullscreen"),
});
