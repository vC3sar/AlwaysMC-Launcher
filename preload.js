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

async function invokeSafe(channel, ...args) {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (error) {
    console.error(`[preload] IPC invoke failed (${channel})`, error);
    throw error;
  }
}

// fronted brain of the app
contextBridge.exposeInMainWorld("launcherAPI", {
  getLastProfile: () => invokeSafe("launcher:getLastProfile"),
  startContinue: () => invokeSafe("launcher:startContinue"),
  startNew: (profile) => invokeSafe("launcher:startNew", profile),
  getConfig: () => invokeSafe("launcher:getConfig"),
  saveConfig: (config) => invokeSafe("launcher:saveConfig", config),
  getInfo: () => invokeSafe("launcher:getInfo"),
  getVersionCatalog: () => invokeSafe("launcher:getVersionCatalog"),
  refreshVersionCatalog: () => invokeSafe("launcher:refreshVersionCatalog"),
  installVersion: (payload) => invokeSafe("launcher:installVersion", payload),
  getInstallStatus: (installId) => invokeSafe("launcher:getInstallStatus", installId),
  isVersionInstalled: (payload) => invokeSafe("launcher:isVersionInstalled", payload),
  getGameRuntimeStatus: () => invokeSafe("launcher:getGameRuntimeStatus"),
  cancelInstall: (installId) => invokeSafe("launcher:cancelInstall", installId),
  launchGame: (payload) => invokeSafe("launcher:launchGame", payload),
  stopGame: () => invokeSafe("launcher:stopGame"),
  getJavaRuntimes: () => invokeSafe("launcher:getJavaRuntimes"),
  setJavaPath: (javaPath) => invokeSafe("launcher:setJavaPath", javaPath),
  getForgeCatalog: () => invokeSafe("modloader:getForgeCatalog"),
  getFabricCatalog: () => invokeSafe("modloader:getFabricCatalog"),
  msLogin: () => invokeSafe("auth:msLogin"),
  msLogout: () => invokeSafe("auth:msLogout"),
  getAuthSession: () => invokeSafe("auth:getSession"),
  listAuthSessions: () => invokeSafe("auth:listSessions"),
  setActiveAuthSession: (accountId) => invokeSafe("auth:setActiveSession", accountId),
  removeAuthSession: (accountId) => invokeSafe("auth:removeSession", accountId),
  menuReady: () => invokeSafe("launcher:menuReady"),
  toggleFullscreen: () => invokeSafe("window:toggleFullscreen"),
  getFullscreen: () => invokeSafe("window:getFullscreen"),
  quitApp: () => invokeSafe("app:quit"),
  returnToLauncher: () => invokeSafe("app:returnToLauncher"),
  reportRendererError: (payload) => ipcRenderer.send("sentry:rendererError", payload || {}),
  onLanguageChanged,
  offLanguageChanged,
});
