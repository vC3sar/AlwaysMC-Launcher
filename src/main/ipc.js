const { app, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
const configManager = require("./config");
const windowManager = require("./window");
const botManager = require("./bot");
const LANGUAGE_CHANGED_CHANNEL = "settings:languageChanged";

function broadcastLanguageChanged(language) {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win || win.isDestroyed()) return;
    win.webContents.send(LANGUAGE_CHANGED_CHANNEL, { language });
  });
}

function setupIpcHandlers(gameLauncher) {
  // Config & Profiles
  ipcMain.handle("launcher:getLastProfile", () => configManager.loadProfile());

  ipcMain.handle("launcher:startContinue", async () => {
    console.log("[IPC] launcher:startContinue");
    const profile = configManager.loadProfile();
    if (!profile) {
      console.log("[IPC] startContinue canceled: no saved profile");
      return { ok: false, errorCode: "no_saved_profile", error: "No saved profile." };
    }
    configManager.saveProfile(profile);
    console.log("[IPC] startContinue profile ready", {
      username: profile.username,
      version: profile.version,
    });
    await botManager.startBot(profile);
    return { ok: true, profile };
  });

  ipcMain.handle("launcher:startNew", async (_, profileInput) => {
    console.log("[IPC] launcher:startNew", profileInput);
    const normalized = configManager.normalizeProfile(profileInput);
    if (!normalized) {
      console.log("[IPC] startNew canceled: invalid profile");
      return {
        ok: false,
        errorCode: "invalid_profile",
        error: "Invalid profile. Verify nickname and server.",
      };
    }
    configManager.saveProfile(normalized);
    console.log("[IPC] startNew profile normalized", {
      username: normalized.username,
      version: normalized.version,
    });
    await botManager.startBot(normalized);
    return { ok: true, profile: normalized };
  });

  ipcMain.handle("launcher:getConfig", () => configManager.loadConfig());
  ipcMain.handle("launcher:saveConfig", (_, config) => {
    try {
      const merged = configManager.mergeLauncherDefaults(config);
      configManager.saveConfig(merged);
      broadcastLanguageChanged(String(merged?.launcher?.language || "es"));
      return { ok: true };
    } catch {
      return { ok: false, errorCode: "save_config_failed", error: "Failed to save config.json" };
    }
  });

  // App & Window
  ipcMain.handle("launcher:getInfo", () => {
    return {
      name: "MC-BETA",
      version: app.getVersion(),
      credits: [
        "MC-BETA Launcher",
        "Mineflayer + Electron",
        "Optional Discord RPC",
      ],
      about:
        "Offline/non-premium client for connecting a Minecraft bot to a local control panel. Uses persistent configuration in config.json and profiles in profiles.json.",
    };
  });

  ipcMain.handle("launcher:menuReady", () => {
    const win = windowManager.mainWindow;
    if (win && !win.isDestroyed() && !win.isVisible()) {
      win.show();
    }
    return { ok: true };
  });

  ipcMain.handle("window:toggleFullscreen", () => {
    const win = windowManager.getMainWindow();
    if (!win) return { ok: false, isFullscreen: false };
    const next = !win.isFullScreen();
    win.setFullScreen(next);
    return { ok: true, isFullscreen: win.isFullScreen() };
  });

  ipcMain.handle("window:getFullscreen", () => {
    const win = windowManager.getMainWindow();
    return { ok: true, isFullscreen: win ? win.isFullScreen() : false };
  });

  ipcMain.handle("app:quit", () => {
    console.log("[IPC] app:quit requested");
    app.quit();
    return { ok: true };
  });

  ipcMain.handle("app:returnToLauncher", () => {
    console.log("[IPC] app:returnToLauncher requested");
    return Promise.all([
      botManager.stopBotSession(),
      gameLauncher
        ? Promise.resolve(gameLauncher.stopGame())
        : Promise.resolve({ ok: true }),
    ])
      .then(() => {
        const win = windowManager.mainWindow || windowManager.getMainWindow();
        if (win && !win.isDestroyed()) {
          return win
            .loadFile(path.join(__dirname, "../../launcher.html"))
            .then(() => ({ ok: true }));
        }
        return { ok: false, errorCode: "no_active_window", error: "There is no active window." };
      })
      .catch((error) => ({
        ok: false,
        error: error && error.message ? error.message : String(error),
      }));
  });

  // Game Launcher
  ipcMain.handle("launcher:getVersionCatalog", async () => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.getVersionCatalog({ forceRefresh: false });
  });

  ipcMain.handle("launcher:refreshVersionCatalog", async () => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.getVersionCatalog({ forceRefresh: true });
  });

  ipcMain.handle("launcher:installVersion", async (_, payload) => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.installVersion(payload || {});
  });

  ipcMain.handle("launcher:getInstallStatus", async (_, installId) => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.getInstallStatus(String(installId || ""));
  });

  ipcMain.handle("launcher:cancelInstall", async (_, installId) => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.cancelInstall(String(installId || ""));
  });

  ipcMain.handle("launcher:launchGame", async (_, payload) => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.launchGame(payload || {});
  });

  ipcMain.handle("launcher:isVersionInstalled", async (_, payload) => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.isVersionInstalled(payload || {});
  });

  ipcMain.handle("launcher:getGameRuntimeStatus", async () => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.getGameRuntimeStatus();
  });

  ipcMain.handle("launcher:stopGame", async () => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.stopGame();
  });

  ipcMain.handle("launcher:getJavaRuntimes", async () => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    const runtimes = await gameLauncher.detectJavaRuntimes();
    return { ok: true, runtimes };
  });

  ipcMain.handle("launcher:setJavaPath", async (_, javaPath) => {
    try {
      const cfg = configManager.mergeLauncherDefaults(
        configManager.loadConfig(),
      );
      cfg.launcher.downloads.javaPath = String(javaPath || "").trim();
      configManager.saveConfig(cfg);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : String(error),
      };
    }
  });

  // Modloader
  ipcMain.handle("modloader:getForgeCatalog", async () => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    const result = await gameLauncher.getVersionCatalog({
      forceRefresh: false,
    });
    return result.ok ? { ok: true, forge: result.catalog.forge || [] } : result;
  });

  ipcMain.handle("modloader:getFabricCatalog", async () => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    const result = await gameLauncher.getVersionCatalog({
      forceRefresh: false,
    });
    return result.ok
      ? { ok: true, fabric: result.catalog.fabric || [] }
      : result;
  });

  // Auth
  ipcMain.handle("auth:msLogin", async () => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.msLogin();
  });

  ipcMain.handle("auth:msLogout", async () => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.msLogout();
  });

  ipcMain.handle("auth:getSession", async () => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.getAuthSession();
  });

  ipcMain.handle("auth:listSessions", async () => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.listAuthSessions();
  });

  ipcMain.handle("auth:setActiveSession", async (_, accountId) => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.setActiveAuthSession(String(accountId || ""));
  });

  ipcMain.handle("auth:removeSession", async (_, accountId) => {
    if (!gameLauncher)
      return { ok: false, errorCode: "launcher_not_initialized", error: "Launcher service not initialized." };
    return gameLauncher.removeAuthSession(String(accountId || ""));
  });
}

module.exports = { setupIpcHandlers };



