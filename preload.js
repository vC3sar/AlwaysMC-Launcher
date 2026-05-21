const { contextBridge, ipcRenderer } = require("electron");
const LANGUAGE_CHANGED_CHANNEL = "settings:languageChanged";
const languageListeners = new WeakMap();

function onLanguageChanged(callback) {
  if (typeof callback !== "function") return () => {};
  const handler = (_, payload) => callback(String(payload?.language || "es"));
  languageListeners.set(callback, handler);
  ipcRenderer.on(LANGUAGE_CHANGED_CHANNEL, handler);
  return () => offLanguageChanged(callback);
}

function offLanguageChanged(callback) {
  const handler = languageListeners.get(callback);
  if (!handler) return;
  ipcRenderer.removeListener(LANGUAGE_CHANGED_CHANNEL, handler);
  languageListeners.delete(callback);
}

// fronted brain of the app
contextBridge.exposeInMainWorld("launcherAPI", {
  getLastProfile: () => ipcRenderer.invoke("launcher:getLastProfile"),
  startContinue: () => ipcRenderer.invoke("launcher:startContinue"),
  startNew: (profile) => ipcRenderer.invoke("launcher:startNew", profile),
  getConfig: () => ipcRenderer.invoke("launcher:getConfig"),
  saveConfig: (config) => ipcRenderer.invoke("launcher:saveConfig", config),
  getInfo: () => ipcRenderer.invoke("launcher:getInfo"),
  getVersionCatalog: () => ipcRenderer.invoke("launcher:getVersionCatalog"),
  refreshVersionCatalog: () => ipcRenderer.invoke("launcher:refreshVersionCatalog"),
  installVersion: (payload) => ipcRenderer.invoke("launcher:installVersion", payload),
  getInstallStatus: (installId) => ipcRenderer.invoke("launcher:getInstallStatus", installId),
  isVersionInstalled: (payload) => ipcRenderer.invoke("launcher:isVersionInstalled", payload),
  getGameRuntimeStatus: () => ipcRenderer.invoke("launcher:getGameRuntimeStatus"),
  cancelInstall: (installId) => ipcRenderer.invoke("launcher:cancelInstall", installId),
  launchGame: (payload) => ipcRenderer.invoke("launcher:launchGame", payload),
  stopGame: () => ipcRenderer.invoke("launcher:stopGame"),
  getJavaRuntimes: () => ipcRenderer.invoke("launcher:getJavaRuntimes"),
  setJavaPath: (javaPath) => ipcRenderer.invoke("launcher:setJavaPath", javaPath),
  getForgeCatalog: () => ipcRenderer.invoke("modloader:getForgeCatalog"),
  getFabricCatalog: () => ipcRenderer.invoke("modloader:getFabricCatalog"),
  msLogin: () => ipcRenderer.invoke("auth:msLogin"),
  msLogout: () => ipcRenderer.invoke("auth:msLogout"),
  getAuthSession: () => ipcRenderer.invoke("auth:getSession"),
  listAuthSessions: () => ipcRenderer.invoke("auth:listSessions"),
  setActiveAuthSession: (accountId) => ipcRenderer.invoke("auth:setActiveSession", accountId),
  removeAuthSession: (accountId) => ipcRenderer.invoke("auth:removeSession", accountId),
  menuReady: () => ipcRenderer.invoke("launcher:menuReady"),
  toggleFullscreen: () => ipcRenderer.invoke("window:toggleFullscreen"),
  getFullscreen: () => ipcRenderer.invoke("window:getFullscreen"),
  quitApp: () => ipcRenderer.invoke("app:quit"),
  returnToLauncher: () => ipcRenderer.invoke("app:returnToLauncher"),
  onLanguageChanged,
  offLanguageChanged,
});
