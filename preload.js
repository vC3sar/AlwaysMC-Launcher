const { contextBridge, ipcRenderer } = require("electron");
const Sentry = require("@sentry/electron/renderer");
const LANGUAGE_CHANGED_CHANNEL = "settings:languageChanged";
const languageListeners = new WeakMap();
const SENTRY_DSN = "https://502f8bb23f8a93c42a22eafe1d9aedde@o4511440032890880.ingest.us.sentry.io/4511440044621824";

Sentry.init({
  dsn: SENTRY_DSN,
  attachStacktrace: true,
  tracesSampleRate: 1.0,
  initialScope: {
    tags: {
      process: "renderer",
      app_name: "mc-beta",
    },
  },
});

window.addEventListener("error", (event) => {
  if (!event?.error) return;
  Sentry.captureException(event.error, {
    tags: { handler: "window.error" },
    level: "error",
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason;
  Sentry.captureException(
    reason instanceof Error ? reason : new Error(String(reason)),
    {
      tags: { handler: "window.unhandledrejection" },
      level: "error",
      extra: { reason },
    },
  );
});

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
    Sentry.captureException(error, {
      tags: { handler: "ipc.invoke", channel },
      level: "error",
      extra: {
        channel,
        argsLength: args.length,
      },
    });
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
  onLanguageChanged,
  offLanguageChanged,
});
