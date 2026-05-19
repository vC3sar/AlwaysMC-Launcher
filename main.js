const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const fs = require("fs");
const path = require("path");
console.log("[Main] main.js cargado - proceso principal activo");

const DEFAULT_SERVER = "mc.haliacraft.com";
const PROFILE_FILE = path.join(__dirname, "profiles.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

let botRunner = null;
let mainWindow = null;

function parseHostAndPort(hostInput, portInput) {
  const rawHost = String(hostInput ?? "").trim();
  const fallbackHost = DEFAULT_SERVER;
  const rawPort = String(portInput ?? "").trim();
  const hostMatch = rawHost.match(/^\[(.+)\]:(\d+)$/) || rawHost.match(/^([^:]+):(\d+)$/);

  if (hostMatch) {
    return {
      ip: hostMatch[1].trim() || fallbackHost,
      port: Number.parseInt(hostMatch[2], 10) || 25565,
    };
  }

  return {
    ip: rawHost || fallbackHost,
    port: Number.parseInt(rawPort || "25565", 10) || 25565,
  };
}

function loadJsonSafe(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadConfig() {
  return loadJsonSafe(CONFIG_FILE, {});
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object") return null;

  const username = String(profile.username ?? "").trim();
  if (!username) return null;

  const parsedAddress = parseHostAndPort(profile.ip, profile.port);
  const config = loadConfig();
  const preferred = Array.isArray(config?.launcher?.preferredVersions)
    ? config.launcher.preferredVersions.map((v) => String(v).trim()).filter(Boolean)
    : [];

  const requestedVersion = String(profile.version ?? "").trim();
  const version = requestedVersion || preferred[0] || "1.20.1";

  return {
    username,
    ip: parsedAddress.ip,
    port: Number.parseInt(profile.port ?? parsedAddress.port ?? "25565", 10) || parsedAddress.port || 25565,
    version,
    mode: "nogui",
  };
}

function loadProfile() {
  return normalizeProfile(loadJsonSafe(PROFILE_FILE, null));
}

function saveProfile(profile) {
  saveJson(PROFILE_FILE, { ...profile, mode: "nogui" });
}

async function stopBotSession() {
  if (!botRunner) return;
  try {
    if (typeof botRunner.stop === "function") {
      await botRunner.stop();
    }
  } catch (error) {
    console.log("[Main] stopBotSession error:", error && error.message ? error.message : String(error));
  } finally {
    botRunner = null;
  }
}

async function startBot(profile) {
  if (botRunner && typeof botRunner.stop === "function") {
    await stopBotSession();
  }
  console.log("[Main] startBot() solicitado", {
    username: profile?.username,
    ip: profile?.ip,
    port: profile?.port,
    version: profile?.version,
  });
  botRunner = require("./minelight")(profile);
  console.log("[Main] minelight inicializado");
  return { ok: true };
}

function appInfo() {
  return {
    name: "MC-BETA",
    version: app.getVersion(),
    credits: ["MC-BETA Launcher", "Mineflayer + Electron", "Discord RPC opcional"],
    about:
      "Cliente offline/no premium para conectar un bot de Minecraft con panel local. Usa configuracion persistente en config.json y perfiles en profiles.json.",
  };
}

function createWindow() {
  const win = new BrowserWindow({
    show: false,
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#08080b",
    autoHideMenuBar: app.isPackaged,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow = win;

  win.loadFile(path.join(__dirname, "launcher.html"));

  if (!app.isPackaged) {
    const devMenu = Menu.buildFromTemplate([
      {
        label: "Desarrollo",
        submenu: [
          { role: "reload", label: "Reload" },
          { role: "forceReload", label: "Force Reload" },
          { type: "separator" },
          { role: "toggleDevTools", label: "Debug / DevTools" },
        ],
      },
      {
        label: "Ventana",
        submenu: [
          { role: "togglefullscreen", label: "Pantalla completa (F11)", accelerator: "F11" },
          { type: "separator" },
          { role: "minimize" },
          { role: "close" },
        ],
      },
    ]);
    Menu.setApplicationMenu(devMenu);
    win.setMenuBarVisibility(true);
  } else {
    Menu.setApplicationMenu(null);
  }
}

function getMainWindow() {
  return BrowserWindow.getAllWindows()[0] || null;
}

ipcMain.handle("launcher:getLastProfile", () => loadProfile());

ipcMain.handle("launcher:startContinue", async () => {
  console.log("[Main] IPC launcher:startContinue");
  const profile = loadProfile();
  if (!profile) {
    console.log("[Main] startContinue cancelado: no hay perfil guardado");
    return { ok: false, error: "No existe perfil guardado." };
  }
  saveProfile(profile);
  console.log("[Main] startContinue profile listo", {
    username: profile.username,
    ip: profile.ip,
    port: profile.port,
    version: profile.version,
  });
  await startBot(profile);
  return { ok: true, profile };
});

ipcMain.handle("launcher:startNew", async (_, profileInput) => {
  console.log("[Main] IPC launcher:startNew", {
    username: profileInput?.username,
    ip: profileInput?.ip,
    port: profileInput?.port,
    version: profileInput?.version,
  });
  const normalized = normalizeProfile(profileInput);
  if (!normalized) {
    console.log("[Main] startNew cancelado: perfil inválido");
    return { ok: false, error: "Perfil invalido. Verifica nickname y servidor." };
  }

  saveProfile(normalized);
  console.log("[Main] startNew profile normalizado", {
    username: normalized.username,
    ip: normalized.ip,
    port: normalized.port,
    version: normalized.version,
  });
  await startBot(normalized);
  return { ok: true, profile: normalized };
});

ipcMain.handle("launcher:getConfig", () => loadConfig());
ipcMain.handle("launcher:saveConfig", (_, config) => {
  try {
    saveJson(CONFIG_FILE, config && typeof config === "object" ? config : {});
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo guardar config.json" };
  }
});
ipcMain.handle("launcher:getInfo", () => appInfo());
ipcMain.handle("launcher:menuReady", () => {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
    mainWindow.show();
  }
  return { ok: true };
});
ipcMain.handle("window:toggleFullscreen", () => {
  const win = getMainWindow();
  if (!win) return { ok: false, isFullscreen: false };
  const next = !win.isFullScreen();
  win.setFullScreen(next);
  return { ok: true, isFullscreen: win.isFullScreen() };
});
ipcMain.handle("window:getFullscreen", () => {
  const win = getMainWindow();
  return { ok: true, isFullscreen: win ? win.isFullScreen() : false };
});
ipcMain.handle("app:quit", () => {
  console.log("[Main] app:quit solicitado");
  app.quit();
  return { ok: true };
});
ipcMain.handle("app:returnToLauncher", () => {
  console.log("[Main] app:returnToLauncher solicitado");
  return stopBotSession()
    .then(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        return mainWindow.loadFile(path.join(__dirname, "launcher.html")).then(() => ({ ok: true }));
      }
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        return win.loadFile(path.join(__dirname, "launcher.html")).then(() => ({ ok: true }));
      }
      return { ok: false, error: "No hay ventana activa." };
    })
    .catch((error) => ({ ok: false, error: error && error.message ? error.message : String(error) }));
});

app.whenReady().then(() => {
  console.log("[Main] app.whenReady()");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
