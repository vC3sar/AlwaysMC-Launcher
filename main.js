const { app, BrowserWindow } = require("electron");
const { GameLauncherService } = require("./src/game-launcher");
const configManager = require("./src/main/config");
const windowManager = require("./src/main/window");
const botManager = require("./src/main/bot");
const { setupIpcHandlers } = require("./src/main/ipc");

console.log("[Main] main.js - main process is running");

function isKeepAliveTimeoutError(errorLike) {
  const message = String(errorLike?.message || errorLike || "").toLowerCase();
  return message.includes("client timed out after");
}

let gameLauncher = null;

app.whenReady().then(() => {
  console.log("[Main] app.whenReady()");

  // Inicializa la config por defecto
  const initialCfg = configManager.mergeLauncherDefaults(
    configManager.loadConfig(),
  );
  configManager.saveConfig(initialCfg);

  // Instancia el servicio del launcher
  gameLauncher = new GameLauncherService({
    appRoot: __dirname,
    loadConfig: () =>
      configManager.mergeLauncherDefaults(configManager.loadConfig()),
    saveConfig: (cfg) =>
      configManager.saveConfig(configManager.mergeLauncherDefaults(cfg)),
    stopBotSession: () => botManager.stopBotSession(),
    onInstallUpdate: () => {},
  });

  // Registra todos los handlers de IPC
  setupIpcHandlers(gameLauncher);

  // Crea la ventana principal
  windowManager.createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (error) => {
  if (isKeepAliveTimeoutError(error)) {
    console.warn("[Main] Suppressed keepalive timeout:", error?.message || error);
    return;
  }
  console.error("[Main] uncaughtException:", error);
});

process.on("unhandledRejection", (reason) => {
  if (isKeepAliveTimeoutError(reason)) {
    console.warn("[Main] Suppressed keepalive timeout rejection:", reason?.message || reason);
    return;
  }
  console.error("[Main] unhandledRejection:", reason);
});
