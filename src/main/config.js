const path = require("path");
const { app } = require("electron");
const fs = require("fs");
const { loadJsonSafe, saveJson, parseHostAndPort } = require("./utils");

const APP_ROOT = path.join(__dirname, "../../");
const LEGACY_PROFILE_FILE = path.join(APP_ROOT, "profiles.json");
const LEGACY_CONFIG_FILE = path.join(APP_ROOT, "config.json");
const DEFAULT_SERVER = "mc.haliacraft.com";

function getStorageDir() {
  return app.isPackaged
    ? path.join(app.getPath("userData"), "data")
    : APP_ROOT;
}

function getProfileFile() {
  return path.join(getStorageDir(), "profiles.json");
}

function getConfigFile() {
  return path.join(getStorageDir(), "config.json");
}

function migrateLegacyFileIfNeeded(legacyPath, currentPath) {
  try {
    if (!app.isPackaged) return;
    if (fs.existsSync(currentPath)) return;
    if (!fs.existsSync(legacyPath)) return;
    fs.mkdirSync(path.dirname(currentPath), { recursive: true });
    fs.copyFileSync(legacyPath, currentPath);
  } catch (error) {
    console.warn("[Config] Legacy migration failed:", error?.message || error);
  }
}

function loadConfig() {
  const file = getConfigFile();
  migrateLegacyFileIfNeeded(LEGACY_CONFIG_FILE, file);
  return loadJsonSafe(file, {});
}

function mergeLauncherDefaults(raw) {
  const cfg = raw && typeof raw === "object" ? raw : {};
  const launcher = cfg.launcher && typeof cfg.launcher === "object" ? cfg.launcher : {};
  cfg.launcher = {
    preferredVersions: Array.isArray(launcher.preferredVersions) ? launcher.preferredVersions : ["1.20.1"],
    velocityCompatMode: Boolean(launcher.velocityCompatMode),
    debugLifecycle: Boolean(launcher.debugLifecycle),
    verboseMode: String(launcher.verboseMode || "app").toLowerCase() === "all" ? "all" : "app",
    reconnectDelayMs: Number.parseInt(launcher.reconnectDelayMs || "650", 10) || 650,
    authRecoveryWindowMs: Number.parseInt(launcher.authRecoveryWindowMs || "30000", 10) || 30000,
    maxReconnectAttempts: Number.parseInt(launcher.maxReconnectAttempts || "6", 10) || 6,
    reconnectBackoffMaxMs: Number.parseInt(launcher.reconnectBackoffMaxMs || "4000", 10) || 4000,
    reconnectJitterRatio: Number.parseFloat(launcher.reconnectJitterRatio || "0.2") || 0.2,
    menuBackgroundMode: launcher.menuBackgroundMode || "auto",
    language: ["es", "en"].includes(String(launcher.language || "").toLowerCase()) ? String(launcher.language).toLowerCase() : "es",
    catalogCache: {
      ttlMs: Number.parseInt(launcher?.catalogCache?.ttlMs || "21600000", 10) || 21600000,
    },
    downloads: {
      minecraftDir: String(launcher?.downloads?.minecraftDir || "").trim(),
      javaPath: String(launcher?.downloads?.javaPath || "").trim(),
      minMemoryMb: Number.parseInt(String(launcher?.downloads?.minMemoryMb || "1024"), 10) || 1024,
      maxMemoryMb: Number.parseInt(String(launcher?.downloads?.maxMemoryMb || "2048"), 10) || 2048,
      extraJvmArgs: String(launcher?.downloads?.extraJvmArgs || "").trim(),
      extraGameArgs: String(launcher?.downloads?.extraGameArgs || "").trim(),
      performanceProfileId: String(launcher?.downloads?.performanceProfileId || "vanilla_fabric").trim() || "vanilla_fabric",
      instanceMode: String(launcher?.downloads?.instanceMode || "dedicated").trim() || "dedicated",
      performanceProfiles: {
        fabric_performance_v1: {
          enabled: launcher?.downloads?.performanceProfiles?.fabric_performance_v1?.enabled !== false,
          channel: "stable",
          instanceDir: String(launcher?.downloads?.performanceProfiles?.fabric_performance_v1?.instanceDir || "").trim(),
        },
      },
    },
  };
  if (!cfg.auth || typeof cfg.auth !== "object") cfg.auth = {};
  const ms = cfg.auth.microsoft && typeof cfg.auth.microsoft === "object" ? cfg.auth.microsoft : {};
  cfg.auth.microsoft = {
    tenant: String(ms.tenant || "consumers").trim() || "consumers",
    clientId: String(ms.clientId || "").trim(),
    redirectStrategy: "loopback",
    loginTimeoutMs: Number.parseInt(String(ms.loginTimeoutMs || "180000"), 10) || 180000,
    accounts: Array.isArray(ms.accounts) ? ms.accounts : [],
    activeAccountId: String(ms.activeAccountId || "").trim() || null,
  };
  return cfg;
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object") return null;

  const username = String(profile.username ?? "").trim();
  if (!username) return null;

  const parsedAddress = parseHostAndPort(profile.ip, profile.port, DEFAULT_SERVER);
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
  const file = getProfileFile();
  migrateLegacyFileIfNeeded(LEGACY_PROFILE_FILE, file);
  return normalizeProfile(loadJsonSafe(file, null));
}

function saveProfile(profile) {
  saveJson(getProfileFile(), { ...profile, mode: "nogui" });
}

function saveConfig(config) {
  saveJson(getConfigFile(), mergeLauncherDefaults(config));
}

module.exports = {
  APP_ROOT,
  getConfigFile,
  getProfileFile,
  loadConfig,
  saveConfig,
  mergeLauncherDefaults,
  normalizeProfile,
  loadProfile,
  saveProfile,
};



