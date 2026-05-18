const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const fs = require("fs");
const path = require("path");

const DEFAULT_SERVER = "mc.haliacraft.com";
const PROFILE_FILE = path.join(__dirname, "profiles.json");
const CONFIG_FILE = path.join(__dirname, "config.json");

let botStarted = false;

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

function startBot(profile) {
  if (botStarted) return { ok: true };
  botStarted = true;
  require("./minelight")(profile);
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

  win.loadFile(path.join(__dirname, "index.html"));

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
        submenu: [{ role: "minimize" }, { role: "close" }],
      },
    ]);
    Menu.setApplicationMenu(devMenu);
    win.setMenuBarVisibility(true);
  } else {
    Menu.setApplicationMenu(null);
  }
}

ipcMain.handle("launcher:getLastProfile", () => loadProfile());

ipcMain.handle("launcher:startContinue", () => {
  const profile = loadProfile();
  if (!profile) {
    return { ok: false, error: "No existe perfil guardado." };
  }
  saveProfile(profile);
  startBot(profile);
  return { ok: true, profile };
});

ipcMain.handle("launcher:startNew", (_, profileInput) => {
  const normalized = normalizeProfile(profileInput);
  if (!normalized) {
    return { ok: false, error: "Perfil invalido. Verifica nickname y servidor." };
  }

  saveProfile(normalized);
  startBot(normalized);
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

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
