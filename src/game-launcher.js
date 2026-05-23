const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const http = require("http");
const https = require("https");
const { spawn, spawnSync } = require("child_process");
const { URL } = require("url");
const { shell, safeStorage } = require("electron");
const { PublicClientApplication } = require("@azure/msal-node");
const {
  FABRIC_GAMES_URL,
  FABRIC_LOADERS_URL,
  FORGE_PROMOS_URL,
  MC_MANIFEST_URL,
  MS_DEFAULT_TENANT,
  MS_SCOPES,
} = require("./game-launcher/constants");
const {
  detectJavaMajorFromPathOrLabel,
  recommendedJavaMajorForVersion,
} = require("./game-launcher/version-java");

function httpsGetBuffer(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { timeout: timeoutMs, headers: { "User-Agent": "MC-BETA/1.0" } },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          return resolve(httpsGetBuffer(res.headers.location, timeoutMs));
        }
        if (res.statusCode !== 200) {
          const chunks = [];
          res.on("data", (d) => chunks.push(d));
          res.on("end", () =>
            reject(
              new Error(
                `HTTP ${res.statusCode} for ${url}: ${Buffer.concat(chunks).toString("utf8")}`,
              ),
            ),
          );
          return;
        }
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error(`Timeout fetching ${url}`)));
  });
}

const fetchJson = async (url, timeoutMs = 30000) =>
  JSON.parse((await httpsGetBuffer(url, timeoutMs)).toString("utf8"));

const MODRINTH_API = "https://api.modrinth.com/v2";
const FABRIC_PERFORMANCE_PROFILE_ID = "fabric_performance_v1";
const VANILLA_FABRIC_PROFILE_ID = "vanilla_fabric";
const CORE_MODS = ["sodium", "lithium", "ferrite-core"];
const FABRIC_PERFORMANCE_MODS = [
  { modId: "sodium", projects: ["sodium"], displayName: "Sodium" },
  { modId: "lithium", projects: ["lithium"], displayName: "Lithium" },
  {
    modId: "entity-culling",
    projects: ["entityculling", "entity-culling"],
    displayName: "Entity Culling",
  },
  {
    modId: "ferrite-core",
    projects: ["ferrite-core", "ferritecore"],
    displayName: "FerriteCore",
  },
  { modId: "krypton", projects: ["krypton"], displayName: "Krypton" },

  {
    modId: "dynamic-fps",
    projects: ["dynamic-fps", "dynamicfps"],
    displayName: "Dynamic FPS",
  },
  {
    modId: "immediatelyfast",
    projects: ["immediatelyfast"],
    displayName: "ImmediatelyFast",
  },
  { modId: "debugify", projects: ["debugify"], displayName: "Debugify" },
  { modId: "iris", projects: ["iris"], displayName: "Iris" },
  {
    modId: "lambdynamiclights",
    projects: ["lambdynamiclights"],
    displayName: "LambDynamicLights",
  },
  { modId: "modmenu", projects: ["modmenu"], displayName: "Mod Menu" },
  { modId: "fabric-api", projects: ["fabric-api"], displayName: "Fabric API" },
  {
    modId: "third-person-camera",
    projects: [
      "leawind-third-person",
      "better-third-person",
    ],
    displayName: "Third Person Camera",
  },
];

async function httpsRequestJson(
  url,
  { method = "GET", headers = {}, body = null, timeoutMs = 30000 } = {},
) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        timeout: timeoutMs,
        headers: { "User-Agent": "MC-BETA/1.0", ...headers },
      },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf8");
            if (res.statusCode < 200 || res.statusCode >= 300)
              return reject(
                new Error(`HTTP ${res.statusCode} for ${url}: ${raw}`),
              );
            return resolve(raw ? JSON.parse(raw) : {});
          } catch (error) {
            return reject(error);
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error(`Timeout calling ${url}`)));
    if (body !== null && body !== undefined) req.write(body);
    req.end();
  });
}

const ensureDir = (dir) => fsp.mkdir(dir, { recursive: true });

const sha1Hex = (buffer) =>
  crypto.createHash("sha1").update(buffer).digest("hex");

const fileExists = async (filePath) =>
  fsp
    .access(filePath, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);

async function isNonEmptyFile(filePath) {
  try {
    const st = await fsp.stat(filePath);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

async function isReadableJsonFile(filePath) {
  if (!(await isNonEmptyFile(filePath))) return false;
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Boolean(parsed && typeof parsed === "object");
  } catch {
    return false;
  }
}

async function verifyFile(filePath, expectedSha1, expectedSize) {
  if (!(await fileExists(filePath))) return false;
  const stat = await fsp.stat(filePath);
  if (
    Number.isFinite(expectedSize) &&
    expectedSize > -1 &&
    stat.size !== expectedSize
  )
    return false;
  if (!expectedSha1) return true;
  const data = await fsp.readFile(filePath);
  return sha1Hex(data) === String(expectedSha1).toLowerCase();
}

async function downloadFileWithVerify(
  url,
  destPath,
  { sha1 = "", size = -1, retries = 3, onProgress = null, signal = null } = {},
) {
  await ensureDir(path.dirname(destPath));

  if (await verifyFile(destPath, sha1, size)) {
    if (typeof onProgress === "function")
      onProgress({ skipped: true, bytes: size > -1 ? size : 0 });
    return;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    if (signal && signal.aborted) throw new Error("Installation cancelled.");
    try {
      await new Promise((resolve, reject) => {
        const req = https.get(
          url,
          { headers: { "User-Agent": "MC-BETA/1.0" } },
          (res) => {
            if (
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              res.resume();
              downloadFileWithVerify(res.headers.location, destPath, {
                sha1,
                size,
                retries: 1,
                onProgress,
                signal,
              })
                .then(resolve)
                .catch(reject);
              return;
            }
            if (res.statusCode !== 200) {
              res.resume();
              reject(new Error(`HTTP ${res.statusCode} for ${url}`));
              return;
            }

            const tmpPath = `${destPath}.part`;
            const out = fs.createWriteStream(tmpPath);
            let received = 0;
            res.on("data", (chunk) => {
              received += chunk.length;
              if (typeof onProgress === "function")
                onProgress({
                  bytes: chunk.length,
                  totalReceived: received,
                  totalExpected:
                    Number.isFinite(size) && size > -1 ? size : undefined,
                });
            });
            res.pipe(out);

            out.on("finish", async () => {
              out.close(async () => {
                try {
                  if (signal && signal.aborted) {
                    await fsp.rm(tmpPath, { force: true });
                    return reject(new Error("Instalación cancelada."));
                  }
                  if (Number.isFinite(size) && size > -1) {
                    const stat = await fsp.stat(tmpPath);
                    if (stat.size !== size)
                      throw new Error(`Size mismatch for ${destPath}`);
                  }
                  if (sha1) {
                    const data = await fsp.readFile(tmpPath);
                    if (sha1Hex(data) !== String(sha1).toLowerCase())
                      throw new Error(`SHA1 mismatch for ${destPath}`);
                  }
                  await fsp.rename(tmpPath, destPath);
                  resolve();
                } catch (err) {
                  await fsp.rm(tmpPath, { force: true }).catch(() => {});
                  reject(err);
                }
              });
            });

            out.on("error", async (err) => {
              await fsp.rm(tmpPath, { force: true }).catch(() => {});
              reject(err);
            });
          },
        );
        req.on("error", reject);
      });
      return;
    } catch (err) {
      lastError = err;
      if (attempt >= retries) break;
    }
  }
  throw lastError || new Error(`No se pudo descargar ${url}`);
}

function applyRuleSet(rules, osName = "windows", featureFlags = null) {
  if (!Array.isArray(rules) || rules.length === 0) return true;
  let allowed = false;
  for (const rule of rules) {
    const action = rule && rule.action === "disallow" ? "disallow" : "allow";
    const osRule =
      rule && rule.os ? String(rule.os.name || "").toLowerCase() : "";
    const matchesOs = !osRule || osRule === osName;
    if (!matchesOs) continue;

    const featuresRule =
      rule && rule.features && typeof rule.features === "object"
        ? rule.features
        : null;
    let matchesFeatures = true;
    if (featuresRule) {
      const flags =
        featureFlags && typeof featureFlags === "object" ? featureFlags : {};
      for (const [key, expected] of Object.entries(featuresRule)) {
        if (Boolean(flags[key]) !== Boolean(expected)) {
          matchesFeatures = false;
          break;
        }
      }
    }
    if (!matchesFeatures) continue;

    allowed = action === "allow";
    if (action === "disallow") allowed = false;
  }
  return allowed;
}

function toArtifactPath(name) {
  const parts = String(name || "").split(":");
  if (parts.length < 3) return null;
  const group = parts[0].replace(/\./g, "/");
  const artifact = parts[1];
  const version = parts[2];
  const classifier = parts[3] ? `-${parts[3]}` : "";
  return `${group}/${artifact}/${version}/${artifact}-${version}${classifier}.jar`;
}

function formatJvmRuleArg(arg, replacements) {
  let output = String(arg);
  for (const [key, value] of Object.entries(replacements))
    output = output.replaceAll(`\${${key}}`, String(value));
  return output;
}

function parseLaunchArgsString(raw) {
  const input = String(raw || "").trim();
  if (!input) return [];
  const out = [];
  let token = "",
    quote = "",
    escaped = false;
  for (const ch of input) {
    if (escaped) {
      token += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      if (!quote) {
        quote = ch;
        continue;
      }
      if (quote === ch) {
        quote = "";
        continue;
      }
    }
    if (!quote && /\s/.test(ch)) {
      if (token) {
        out.push(token);
        token = "";
      }
      continue;
    }
    token += ch;
  }
  if (token) out.push(token);
  return out;
}

function isConflictingEncodingArg(arg) {
  const value = String(arg || "")
    .trim()
    .toLowerCase();
  return (
    value.startsWith("-dfile.encoding=") ||
    value.startsWith("-dclient.encoding.override=")
  );
}

function stripConflictingEncodingArgs(args) {
  return (Array.isArray(args) ? args : []).filter(
    (arg) => !isConflictingEncodingArg(arg),
  );
}

function parseLibraryNameParts(name) {
  const [group = "", artifact = "", version = "", classifier = ""] = String(
    name || "",
  ).split(":");
  return { group, artifact, version, classifier };
}

function resolveWindowsNativeDownload(lib) {
  if (!applyRuleSet(lib?.rules, "windows")) {
    return { download: null, reason: "rules_disallow_windows" };
  }

  const archKey =
    process.arch === "arm64"
      ? "arm64"
      : process.arch === "ia32"
        ? "x86"
        : "x64";
  const classifiers = lib?.downloads?.classifiers;
  const nativePattern = String(lib?.natives?.windows || "").trim();

  if (classifiers && typeof classifiers === "object") {
    const candidates = [];
    if (nativePattern) {
      candidates.push(nativePattern);
      candidates.push(
        nativePattern.replace(
          "${arch}",
          archKey === "x64" ? "64" : archKey === "x86" ? "32" : "arm64",
        ),
      );
      candidates.push(nativePattern.replace("${arch}", "64"));
      candidates.push(nativePattern.replace("${arch}", "32"));
      candidates.push(nativePattern.replace("${arch}", "arm64"));
    }
    candidates.push("natives-windows");
    candidates.push("natives-windows-arm64");
    candidates.push("natives-windows-x86");
    candidates.push("natives-windows-64");
    candidates.push("natives-windows-32");

    for (const key of candidates) {
      const found = classifiers[key];
      if (found && found.path)
        return { download: found, classifier: key, source: "classifiers" };
    }

    const fallbackKey = Object.keys(classifiers).find((k) =>
      k.startsWith("natives-windows"),
    );
    if (fallbackKey && classifiers[fallbackKey]?.path) {
      return {
        download: classifiers[fallbackKey],
        classifier: fallbackKey,
        source: "classifiers_fallback",
      };
    }
  }

  const artifact = lib?.downloads?.artifact;
  if (artifact?.path && lib?.name) {
    const parsed = parseLibraryNameParts(lib.name);
    const c = String(parsed.classifier || "").toLowerCase();
    if (c.startsWith("natives-windows")) {
      if (c.includes("arm64") && archKey !== "arm64")
        return { download: null, reason: "arch_mismatch_arm64" };
      if ((c.includes("x86") || c.endsWith("-32")) && archKey === "x64")
        return { download: null, reason: "arch_mismatch_x86" };
      return {
        download: artifact,
        classifier: parsed.classifier || "natives-windows",
        source: "artifact_name",
      };
    }
    return { download: null, reason: "artifact_not_windows_native" };
  }

  return { download: null, reason: "no_native_descriptor" };
}

class GameLauncherService {
  constructor({
    appRoot,
    loadConfig,
    saveConfig,
    stopBotSession,
    onInstallUpdate,
  }) {
    this.appRoot = appRoot;
    this.loadConfig = loadConfig;
    this.saveConfig = saveConfig;
    this.stopBotSession = stopBotSession;
    this.onInstallUpdate = onInstallUpdate;
    this.installJobs = new Map();
    this.runningGameProcess = null;
    this.lastGameStatus = {
      running: false,
      pid: null,
      lastExitCode: null,
      lastError: "",
      lastLines: [],
      startedAt: 0,
      lastStdoutAt: 0,
      lastStderrAt: 0,
      lastOutputAt: 0,
      lineCount: 0,
      lastLifecycleEvent: "idle",
      updatedAt: Date.now(),
    };
  }

  getRuntimeStallThresholdMs() {
    const raw = Number.parseInt(
      String(
        (this.loadConfig() || {})?.launcher?.downloads
          ?.runtimeStallThresholdMs || "15000",
      ),
      10,
    );
    return Number.isFinite(raw) && raw >= 5000 ? raw : 15000;
  }

  getMinecraftDir() {
    const customDir = (this.loadConfig() || {})?.launcher?.downloads
      ?.minecraftDir;
    if (customDir && String(customDir).trim()) return String(customDir).trim();
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
      ".minecraft",
    );
  }

  getPerformanceProfileDefinitions() {
    return {
      [VANILLA_FABRIC_PROFILE_ID]: {
        id: VANILLA_FABRIC_PROFILE_ID,
        name: "Vanilla Fabric",
        enabled: true,
        mods: [],
      },
      [FABRIC_PERFORMANCE_PROFILE_ID]: {
        id: FABRIC_PERFORMANCE_PROFILE_ID,
        name: "Fabric Rendimiento",
        enabled: true,
        mods: FABRIC_PERFORMANCE_MODS,
      },
    };
  }

  getPerformanceProfileConfig(profileId) {
    const cfg = this.loadConfig() || {};
    const profiles = cfg?.launcher?.downloads?.performanceProfiles;
    return profiles && typeof profiles === "object"
      ? profiles[profileId] || {}
      : {};
  }

  getInstancePath({
    profileId = VANILLA_FABRIC_PROFILE_ID,
    gameVersion = "",
    loaderVersion = "",
  } = {}) {
    const minecraftDir = this.getMinecraftDir();
    const normalizedProfile =
      String(profileId || VANILLA_FABRIC_PROFILE_ID).trim() ||
      VANILLA_FABRIC_PROFILE_ID;
    const safeVersion = String(gameVersion || "unknown").replace(
      /[^\w.-]/g,
      "_",
    );
    const safeLoader = String(loaderVersion || "unknown").replace(
      /[^\w.-]/g,
      "_",
    );
    if (normalizedProfile === VANILLA_FABRIC_PROFILE_ID) return minecraftDir;
    const profileCfg = this.getPerformanceProfileConfig(normalizedProfile);
    const customBase = String(profileCfg?.instanceDir || "").trim();
    const base =
      customBase || path.join(minecraftDir, "instances", "fabric-performance");
    return path.join(base, `${safeVersion}-${safeLoader}`);
  }

  async resolvePerformanceMods({
    gameVersion = "",
    loaderVersion = "",
    profileId = VANILLA_FABRIC_PROFILE_ID,
  } = {}) {
    const defs = this.getPerformanceProfileDefinitions();
    const profile = defs[profileId] || defs[VANILLA_FABRIC_PROFILE_ID];
    if (!profile || !Array.isArray(profile.mods) || !profile.mods.length) {
      return { resolved: [], skipped: [] };
    }

    const resolved = [];
    const skipped = [];
    for (const mod of profile.mods) {
      const candidates =
        Array.isArray(mod.projects) && mod.projects.length
          ? mod.projects
          : [String(mod.project || "").trim()].filter(Boolean);
      let resolvedEntry = null;
      let lastError = "";
      for (const candidate of candidates) {
        try {
          const versions = await fetchJson(
            `${MODRINTH_API}/project/${encodeURIComponent(candidate)}/version?loaders=${encodeURIComponent(JSON.stringify(["fabric"]))}&game_versions=${encodeURIComponent(JSON.stringify([gameVersion]))}`,
          );
          const stable = Array.isArray(versions)
            ? versions.filter(
                (v) => String(v.version_type || "").toLowerCase() === "release",
              )
            : [];
          const sorted = stable.sort((a, b) => {
            const da = Date.parse(String(a.date_published || 0));
            const db = Date.parse(String(b.date_published || 0));
            return db - da;
          });
          const selected = sorted[0];
          if (!selected) {
            lastError = `No stable release in ${candidate}`;
            continue;
          }
          const files = Array.isArray(selected.files) ? selected.files : [];
          const file = files.find((f) => f.primary) || files[0];
          if (!file?.url || !file?.filename) {
            lastError = `No downloadable file in ${candidate}`;
            continue;
          }
          resolvedEntry = {
            modId: mod.modId,
            project: candidate,
            displayName: mod.displayName,
            versionId: String(selected.id || ""),
            versionNumber: String(selected.version_number || ""),
            filename: String(file.filename || ""),
            url: String(file.url || ""),
            sha1: String(file?.hashes?.sha1 || ""),
            size: Number(file?.size || 0),
            gameVersion: String(gameVersion || ""),
            loaderVersion: String(loaderVersion || ""),
          };
          break;
        } catch (error) {
          lastError = String(error?.message || error || "unknown_error");
        }
      }
      if (resolvedEntry) resolved.push(resolvedEntry);
      else {
        skipped.push({
          modId: mod.modId,
          displayName: mod.displayName,
          reason: lastError || "no_compatible_release",
          candidates,
        });
      }
    }
    return { resolved, skipped };
  }

  async installPerformanceMods({
    instancePath,
    profileId = VANILLA_FABRIC_PROFILE_ID,
    gameVersion = "",
    loaderVersion = "",
    signal = null,
    installId = "",
  } = {}) {
    if (profileId === VANILLA_FABRIC_PROFILE_ID) {
      return {
        profileId,
        instancePath,
        installed: [],
        skipped: [],
        coreOk: true,
        lockPath: "",
      };
    }
    const modResolution = await this.resolvePerformanceMods({
      gameVersion,
      loaderVersion,
      profileId,
    });
    const mods = Array.isArray(modResolution?.resolved)
      ? modResolution.resolved
      : [];
    const skipped = Array.isArray(modResolution?.skipped)
      ? modResolution.skipped
      : [];
    const modsDir = path.join(instancePath, "mods");
    await ensureDir(modsDir);
    const lockPath = path.join(instancePath, "mods.lock.json");
    const lock = {
      profileId,
      gameVersion,
      loaderVersion,
      channel: "stable",
      generatedAt: new Date().toISOString(),
      mods,
      skipped,
    };

    const managedPrefixes = new Set(mods.map((m) => `${m.modId}-`));
    const existing = await fsp.readdir(modsDir).catch(() => []);
    for (const fileName of existing) {
      const lower = String(fileName).toLowerCase();
      const shouldDelete =
        [...managedPrefixes].some((prefix) => lower.startsWith(prefix)) ||
        mods.some((m) => lower === m.filename.toLowerCase());
      if (shouldDelete) {
        await fsp
          .rm(path.join(modsDir, fileName), { force: true })
          .catch(() => {});
      }
    }

    if (installId) {
      this.emitInstallUpdate(installId, {
        phase: "mods",
        message: "Syncing Fabric performance mods...",
      });
    }
    for (let i = 0; i < mods.length; i += 1) {
      const mod = mods[i];
      if (signal?.aborted) throw new Error("Installation cancelled.");
      await downloadFileWithVerify(mod.url, path.join(modsDir, mod.filename), {
        sha1: mod.sha1 || "",
        size: Number(mod.size || 0) || -1,
        signal,
      });
      if (installId) {
        this.emitInstallUpdate(installId, {
          phase: "mods",
          progress: 95 + Math.round(((i + 1) / mods.length) * 5),
          message: `Installed ${mod.displayName} ${mod.versionNumber}`,
        });
      }
    }
    await fsp.writeFile(lockPath, JSON.stringify(lock, null, 2), "utf8");
    const installedIds = new Set(mods.map((m) => String(m.modId || "")));
    const coreMissing = CORE_MODS.filter((id) => !installedIds.has(id));
    return {
      profileId,
      instancePath,
      installed: mods,
      skipped,
      coreOk: coreMissing.length === 0,
      coreMissing,
      lockPath,
    };
  }

  isPerformanceLockCompatible({
    lock,
    profileId,
    gameVersion,
    loaderVersion,
  } = {}) {
    if (!lock || typeof lock !== "object") return false;
    if (String(lock.profileId || "") !== String(profileId || "")) return false;
    if (String(lock.gameVersion || "") !== String(gameVersion || "")) return false;
    if (String(lock.loaderVersion || "") !== String(loaderVersion || ""))
      return false;
    const mods = Array.isArray(lock.mods) ? lock.mods : [];
    return mods.length > 0;
  }

  getCatalogCacheFile() {
    return path.join(this.appRoot, "config", "catalog-cache.json");
  }

  async readCatalogCache() {
    const file = this.getCatalogCacheFile();
    if (!(await fileExists(file))) return null;
    try {
      return JSON.parse(await fsp.readFile(file, "utf8"));
    } catch {
      return null;
    }
  }

  async writeCatalogCache(cache) {
    const file = this.getCatalogCacheFile();
    await ensureDir(path.dirname(file));
    await fsp.writeFile(file, JSON.stringify(cache, null, 2), "utf8");
  }

  normalizeCatalog(vanilla, forge, fabric) {
    return {
      generatedAt: new Date().toISOString(),
      vanilla: Array.isArray(vanilla) ? vanilla : [],
      forge: Array.isArray(forge) ? forge : [],
      fabric: Array.isArray(fabric) ? fabric : [],
    };
  }

  async fetchVanillaCatalog() {
    const manifest = await fetchJson(MC_MANIFEST_URL);
    const versions = Array.isArray(manifest?.versions) ? manifest.versions : [];
    return versions
      .map((v) => ({
        id: String(v.id || ""),
        type: String(v.type || "release"),
        releaseTime: v.releaseTime || "",
        url: v.url || "",
        source: "vanilla",
      }))
      .filter((v) => v.id && v.url);
  }

  async fetchFabricCatalog() {
    const [games, loaders] = await Promise.all([
      fetchJson(FABRIC_GAMES_URL),
      fetchJson(FABRIC_LOADERS_URL),
    ]);
    const recentLoaders = Array.isArray(loaders) ? loaders.slice(0, 12) : [];
    const releaseGames = Array.isArray(games)
      ? games.filter((g) => g.stable).slice(0, 25)
      : [];
    const entries = [];
    for (const game of releaseGames) {
      for (const loader of recentLoaders.slice(0, 4)) {
        entries.push({
          id: `fabric-${game.version}-${loader.version}`,
          gameVersion: game.version,
          loaderVersion: loader.version,
          stable: Boolean(game.stable),
          source: "fabric",
          type: "release",
        });
      }
    }
    return entries;
  }

  async fetchForgeCatalog() {
    const promos = await fetchJson(FORGE_PROMOS_URL);
    const promoMap = promos && promos.promos ? promos.promos : {};
    const entries = Object.entries(promoMap)
      .filter(
        ([key]) => key.endsWith("-latest") || key.endsWith("-recommended"),
      )
      .map(([key, forgeVersion]) => {
        const gameVersion = key.replace(/-(latest|recommended)$/, "");
        return {
          id: `forge-${gameVersion}-${forgeVersion}`,
          gameVersion,
          forgeVersion,
          channel: key.endsWith("-recommended") ? "recommended" : "latest",
          source: "forge",
          type: "release",
        };
      });
    return entries.sort((a, b) => b.gameVersion.localeCompare(a.gameVersion));
  }

  async getVersionCatalog({ forceRefresh = false } = {}) {
    const cfg = this.loadConfig() || {};
    const ttlMs =
      Number.parseInt(cfg?.launcher?.catalogCache?.ttlMs || "21600000", 10) ||
      21600000;
    const cache = await this.readCatalogCache();
    const cacheTime = cache?.generatedAt
      ? new Date(cache.generatedAt).getTime()
      : 0;
    const stillFresh = cacheTime > 0 && Date.now() - cacheTime < ttlMs;
    if (!forceRefresh && cache && stillFresh)
      return { ok: true, catalog: cache, fromCache: true };

    try {
      const [vanilla, forge, fabric] = await Promise.all([
        this.fetchVanillaCatalog(),
        this.fetchForgeCatalog().catch(() => []),
        this.fetchFabricCatalog().catch(() => []),
      ]);
      const catalog = this.normalizeCatalog(vanilla, forge, fabric);
      await this.writeCatalogCache(catalog);
      return { ok: true, catalog, fromCache: false };
    } catch (error) {
      if (cache)
        return {
          ok: true,
          catalog: cache,
          fromCache: true,
          warning: String(error.message || error),
        };
      return { ok: false, error: String(error.message || error) };
    }
  }

  async detectJavaRuntimes() {
    const candidates = [];
    const seen = new Set();
    const add = (label, p) => {
      if (!p) return;
      const normalized = path.normalize(p);
      if (seen.has(normalized)) return;
      seen.add(normalized);
      candidates.push({ label, path: normalized });
    };

    const javaHome = process.env.JAVA_HOME;
    if (javaHome) {
      add("JAVA_HOME javaw", path.join(javaHome, "bin", "javaw.exe"));
      add("JAVA_HOME java", path.join(javaHome, "bin", "java.exe"));
    }

    const pf = process.env.ProgramFiles || "C:\\Program Files";
    const pfx86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const scanRoots = [path.join(pf, "Java"), path.join(pfx86, "Java")];
    for (const root of scanRoots) {
      if (!fs.existsSync(root)) continue;
      for (const entry of await fsp.readdir(root, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        add(
          `${entry.name} javaw`,
          path.join(root, entry.name, "bin", "javaw.exe"),
        );
        add(
          `${entry.name} java`,
          path.join(root, entry.name, "bin", "java.exe"),
        );
      }
    }

    const available = [];
    for (const cand of candidates)
      if (await fileExists(cand.path)) available.push(cand);
    return available;
  }

  async resolveJavaPath(preferredPath = "") {
    if (preferredPath && (await fileExists(preferredPath)))
      return preferredPath;
    const runtimes = await this.detectJavaRuntimes();
    return runtimes.length > 0 ? runtimes[0].path : "java";
  }

  async buildJavaCandidates({ preferredPath = "", versionId = "" } = {}) {
    const candidates = [];
    const push = (p) => {
      const clean = String(p || "").trim();
      if (!clean) return;
      if (!candidates.includes(clean)) candidates.push(clean);
    };

    if (preferredPath) push(preferredPath);
    const runtimes = await this.detectJavaRuntimes();
    const recommendedMajor = recommendedJavaMajorForVersion(versionId);
    const matching = runtimes.filter(
      (r) =>
        detectJavaMajorFromPathOrLabel(`${r.label} ${r.path}`) ===
        recommendedMajor,
    );
    matching.forEach((r) => push(r.path));
    runtimes.forEach((r) => push(r.path));
    push("java");
    return { recommendedMajor, candidates };
  }

  async resolveVersionRuntime(cleanVersion) {
    const minecraftDir = this.getMinecraftDir();
    const versionsDir = path.join(minecraftDir, "versions");
    const chain = [];
    const visited = new Set();
    let cursor = cleanVersion;
    let depth = 0;
    while (cursor && depth < 8 && !visited.has(cursor)) {
      visited.add(cursor);
      const folder = path.join(versionsDir, cursor);
      const jsonPath = path.join(folder, `${cursor}.json`);
      if (!(await fileExists(jsonPath))) {
        if (depth === 0)
          throw new Error(`Version metadata does not exist: ${cursor}`);
        break;
      }
      const meta = JSON.parse(await fsp.readFile(jsonPath, "utf8"));
      chain.push({ id: cursor, folder, jsonPath, meta });
      cursor = meta.inheritsFrom ? String(meta.inheritsFrom).trim() : "";
      depth += 1;
    }
    if (chain.length === 0)
      throw new Error(`Could not resolve version ${cleanVersion}.`);

    const merged = {
      id: cleanVersion,
      mainClass: "",
      type: "",
      assetIndex: null,
      arguments: null,
      minecraftArguments: "",
      libraries: [],
    };
    const libMap = new Map();
    for (const entry of [...chain].reverse()) {
      const m = entry.meta || {};
      if (!merged.mainClass && m.mainClass) merged.mainClass = m.mainClass;
      if (!merged.assetIndex && m.assetIndex) merged.assetIndex = m.assetIndex;
      if (!merged.arguments && m.arguments) merged.arguments = m.arguments;
      if (!merged.minecraftArguments && m.minecraftArguments)
        merged.minecraftArguments = m.minecraftArguments;
      if (!merged.type && m.type) merged.type = m.type;
      const libs = Array.isArray(m.libraries) ? m.libraries : [];
      for (const lib of libs) {
        const key = String(
          lib?.name || lib?.downloads?.artifact?.path || JSON.stringify(lib),
        );
        libMap.set(key, lib);
      }
    }
    merged.libraries = [...libMap.values()];

    const primary = chain[0];
    const primaryJarPath = path.join(primary.folder, `${primary.id}.jar`);
    let clientJarPath = primaryJarPath;
    if (!(await fileExists(clientJarPath)) && chain.length > 1) {
      for (let i = 1; i < chain.length; i += 1) {
        const candidate = path.join(chain[i].folder, `${chain[i].id}.jar`);
        if (await fileExists(candidate)) {
          clientJarPath = candidate;
          break;
        }
      }
    }

    return {
      minecraftDir,
      cleanVersion,
      mergedMeta: merged,
      chain,
      clientJarPath,
    };
  }

  emitInstallUpdate(installId, patch) {
    const job = this.installJobs.get(installId);
    if (!job) return;
    job.status = { ...job.status, ...patch, updatedAt: Date.now() };
    if (typeof this.onInstallUpdate === "function")
      this.onInstallUpdate(installId, job.status);
  }

  buildInstallId(source, versionId) {
    return `${source}:${versionId}`;
  }

  async installVersion({
    source = "vanilla",
    versionId = "",
    authMode = "offline",
    loaderVersion = "",
    performanceProfileId = VANILLA_FABRIC_PROFILE_ID,
    instanceMode = "dedicated",
  } = {}) {
    const cleanSource = String(source || "vanilla").toLowerCase();
    const cleanVersion = String(versionId || "").trim();
    if (!cleanVersion) return { ok: false, error: "Version required." };
    const installId = this.buildInstallId(cleanSource, cleanVersion);
    if (
      this.installJobs.has(installId) &&
      this.installJobs.get(installId).status.busy
    ) {
      return {
        ok: false,
        error: "An installation is already in progress for that version.",
      };
    }

    const controller = new AbortController();
    const job = {
      id: installId,
      controller,
      status: {
        installId,
        source: cleanSource,
        versionId: cleanVersion,
        busy: true,
        phase: "queued",
        progress: 0,
        message: "Preparing installation...",
        bytesDone: 0,
        bytesTotal: 0,
        startedAt: Date.now(),
        updatedAt: Date.now(),
      },
    };
    this.installJobs.set(installId, job);

    const run = async () => {
      try {
        if (cleanSource === "vanilla") {
          await this.installVanillaVersion(
            cleanVersion,
            installId,
            controller.signal,
          );
        } else if (cleanSource === "fabric") {
          await this.installFabricProfile(
            cleanVersion,
            loaderVersion,
            installId,
            controller.signal,
          );
          const profileId =
            String(performanceProfileId || VANILLA_FABRIC_PROFILE_ID).trim() ||
            VANILLA_FABRIC_PROFILE_ID;
          if (
            profileId !== VANILLA_FABRIC_PROFILE_ID &&
            String(instanceMode || "dedicated") === "dedicated"
          ) {
            const instancePath = this.getInstancePath({
              profileId,
              gameVersion: cleanVersion,
              loaderVersion,
            });
            await this.installPerformanceMods({
              instancePath,
              profileId,
              gameVersion: cleanVersion,
              loaderVersion,
              signal: controller.signal,
              installId,
            });
          }
        } else if (cleanSource === "forge") {
          throw new Error(
            "Automatic Forge installation not yet implemented in this build.",
          );
        } else {
          throw new Error(`Unsupported source: ${cleanSource}`);
        }

        this.emitInstallUpdate(installId, {
          busy: false,
          progress: 100,
          phase: "done",
          message: `Installation ready (${cleanSource}:${cleanVersion}).`,
        });
      } catch (error) {
        this.emitInstallUpdate(installId, {
          busy: false,
          phase: "error",
          message: String(error.message || error),
          error: String(error.message || error),
        });
      }
    };

    run();
    return { ok: true, installId };
  }

  getInstallStatus(installId = "") {
    if (installId) {
      const job = this.installJobs.get(installId);
      return job
        ? { ok: true, status: job.status }
        : { ok: false, error: "Installation not found." };
    }
    return {
      ok: true,
      statuses: [...this.installJobs.values()].map((j) => j.status),
    };
  }

  cancelInstall(installId) {
    const job = this.installJobs.get(String(installId || ""));
    if (!job) return { ok: false, error: "Installation not found." };
    if (!job.status.busy) return { ok: true };
    job.controller.abort();
    this.emitInstallUpdate(job.id, {
      busy: false,
      phase: "cancelled",
      message: "Installation cancelled by user.",
    });
    return { ok: true };
  }

  async installFabricProfile(gameVersion, loaderVersion, installId, signal) {
    const minecraftDir = this.getMinecraftDir();
    const versionsDir = path.join(minecraftDir, "versions");
    await ensureDir(versionsDir);

    this.emitInstallUpdate(installId, {
      phase: "metadata",
      progress: 10,
      message: "Resolving Fabric metadata...",
    });
    let resolvedLoader = String(loaderVersion || "").trim();
    if (!resolvedLoader) {
      const loaders = await fetchJson(FABRIC_LOADERS_URL);
      resolvedLoader = loaders?.[0]?.version;
    }
    if (!resolvedLoader)
      throw new Error("Fabric loader could not be resolved.");

    const profileJson = await fetchJson(
      `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(gameVersion)}/${encodeURIComponent(resolvedLoader)}/profile/json`,
    );
    const versionId = String(
      profileJson.id || `fabric-loader-${resolvedLoader}-${gameVersion}`,
    );
    const versionFolder = path.join(versionsDir, versionId);
    await ensureDir(versionFolder);
    await fsp.writeFile(
      path.join(versionFolder, `${versionId}.json`),
      JSON.stringify(profileJson, null, 2),
      "utf8",
    );

    this.emitInstallUpdate(installId, {
      phase: "vanilla-base",
      progress: 25,
      message: `Installing vanilla ${gameVersion} base for Fabric...`,
    });
    await this.installVanillaVersion(gameVersion, installId, signal, 25, 95);

    this.emitInstallUpdate(installId, {
      phase: "finalizing",
      progress: 98,
      message: "Fabric profile ready.",
    });
  }

  async installVanillaVersion(
    versionId,
    installId,
    signal,
    baseProgress = 0,
    maxProgress = 100,
  ) {
    const minecraftDir = this.getMinecraftDir();
    const versionsDir = path.join(minecraftDir, "versions");
    const librariesDir = path.join(minecraftDir, "libraries");
    const assetsDir = path.join(minecraftDir, "assets");
    const indexesDir = path.join(assetsDir, "indexes");
    const objectsDir = path.join(assetsDir, "objects");

    await Promise.all([
      ensureDir(versionsDir),
      ensureDir(librariesDir),
      ensureDir(indexesDir),
      ensureDir(objectsDir),
    ]);

    this.emitInstallUpdate(installId, {
      phase: "metadata",
      progress: baseProgress + 2,
      message: "Downloading official manifest...",
    });
    const manifest = await fetchJson(MC_MANIFEST_URL);
    const versions = Array.isArray(manifest?.versions) ? manifest.versions : [];
    const target = versions.find((v) => String(v.id) === String(versionId));
    if (!target || !target.url)
      throw new Error(`Version ${versionId} not found in official manifest.`);

    const versionMeta = await fetchJson(target.url);
    const versionFolder = path.join(versionsDir, versionId);
    await ensureDir(versionFolder);
    const versionJsonPath = path.join(versionFolder, `${versionId}.json`);
    await fsp.writeFile(
      versionJsonPath,
      JSON.stringify(versionMeta, null, 2),
      "utf8",
    );

    const byteCounter = { done: 0, total: 0 };
    const trackChunk = (delta) => {
      if (!delta || !Number.isFinite(delta)) return;
      byteCounter.done += delta;
      const fraction =
        byteCounter.total > 0
          ? Math.min(1, byteCounter.done / byteCounter.total)
          : 0;
      const progress =
        baseProgress + Math.round((maxProgress - baseProgress) * fraction);
      this.emitInstallUpdate(installId, {
        progress: Math.min(maxProgress, Math.max(baseProgress, progress)),
        bytesDone: byteCounter.done,
        bytesTotal: byteCounter.total,
      });
    };

    const tasks = [];

    if (versionMeta?.downloads?.client?.url) {
      const client = versionMeta.downloads.client;
      const clientPath = path.join(versionFolder, `${versionId}.jar`);
      byteCounter.total += Number(client.size || 0);
      tasks.push({
        phase: "client",
        message: "Downloading client.jar...",
        run: () =>
          downloadFileWithVerify(client.url, clientPath, {
            sha1: client.sha1,
            size: client.size,
            onProgress: (p) => trackChunk(p.bytes || 0),
            signal,
          }),
      });
    }

    const libraries = Array.isArray(versionMeta.libraries)
      ? versionMeta.libraries
      : [];
    for (const lib of libraries) {
      if (!applyRuleSet(lib.rules, "windows")) continue;
      const artifact = lib.downloads?.artifact;
      if (artifact?.url && artifact?.path) {
        const dest = path.join(librariesDir, artifact.path);
        byteCounter.total += Number(artifact.size || 0);
        tasks.push({
          phase: "libraries",
          message: "Downloading libraries...",
          run: () =>
            downloadFileWithVerify(artifact.url, dest, {
              sha1: artifact.sha1,
              size: artifact.size,
              onProgress: (p) => trackChunk(p.bytes || 0),
              signal,
            }),
        });
      } else if (lib.name) {
        const rel = toArtifactPath(lib.name);
        if (rel) {
          const url = `https://libraries.minecraft.net/${rel}`;
          const dest = path.join(librariesDir, rel);
          tasks.push({
            phase: "libraries",
            message: "Downloading libraries...",
            run: () =>
              downloadFileWithVerify(url, dest, {
                onProgress: (p) => trackChunk(p.bytes || 0),
                signal,
              }),
          });
        }
      }

      const nativeInfo = resolveWindowsNativeDownload(lib);
      const n = nativeInfo?.download;
      if (n) {
        const dest = path.join(librariesDir, n.path);
        byteCounter.total += Number(n.size || 0);
        tasks.push({
          phase: "natives",
          message: "Descargando nativos...",
          run: () =>
            downloadFileWithVerify(n.url, dest, {
              sha1: n.sha1,
              size: n.size,
              onProgress: (p) => trackChunk(p.bytes || 0),
              signal,
            }),
        });
      }
    }

    if (versionMeta?.assetIndex?.url) {
      const assetIndex = versionMeta.assetIndex;
      const assetIndexPath = path.join(indexesDir, `${assetIndex.id}.json`);
      byteCounter.total += Number(assetIndex.size || 0);
      tasks.push({
        phase: "assets-index",
        message: "Descargando índice de assets...",
        run: async () => {
          await downloadFileWithVerify(assetIndex.url, assetIndexPath, {
            sha1: assetIndex.sha1,
            size: assetIndex.size,
            onProgress: (p) => trackChunk(p.bytes || 0),
            signal,
          });
          const indexJson = JSON.parse(
            await fsp.readFile(assetIndexPath, "utf8"),
          );
          const objects =
            indexJson && indexJson.objects ? indexJson.objects : {};
          const entries = Object.entries(objects);
          for (const [, obj] of entries) {
            const hash = String(obj.hash || "");
            if (!hash || hash.length < 2) continue;
            const sub = hash.slice(0, 2);
            const url = `https://resources.download.minecraft.net/${sub}/${hash}`;
            const dest = path.join(objectsDir, sub, hash);
            byteCounter.total += Number(obj.size || 0);
            await downloadFileWithVerify(url, dest, {
              sha1: hash,
              size: obj.size,
              onProgress: (p) => trackChunk(p.bytes || 0),
              signal,
              retries: 2,
            });
          }
        },
      });
    }

    for (let i = 0; i < tasks.length; i += 1) {
      if (signal && signal.aborted) throw new Error("Installation cancelled.");
      const t = tasks[i];
      const ratio = tasks.length > 0 ? i / tasks.length : 0;
      const p = baseProgress + Math.round((maxProgress - baseProgress) * ratio);
      this.emitInstallUpdate(installId, {
        phase: t.phase,
        progress: p,
        message: t.message,
      });
      await t.run();
    }

    this.emitInstallUpdate(installId, {
      phase: "finalizing",
      progress: maxProgress,
      message: `Installation ${versionId} completed.`,
    });
  }

  async launchGame({
    versionId = "",
    source = "vanilla",
    gameVersion = "",
    loaderVersion = "",
    username = "Player",
    authMode = "offline",
    javaPath = "",
    minMemoryMb = 0,
    maxMemoryMb = 0,
    extraJvmArgs = "",
    extraGameArgs = "",
    performanceProfileId = VANILLA_FABRIC_PROFILE_ID,
    instanceMode = "dedicated",
  } = {}) {
    const cleanVersion = String(versionId || "").trim();
    if (!cleanVersion)
      return { ok: false, error: "Version required to launch." };
    const isMsAuth = String(authMode || "").toLowerCase() === "microsoft";
    let authProfile = {
      username,
      uuid: "00000000000000000000000000000000",
      accessToken: "0",
      userType: "legacy",
    };
    if (isMsAuth) {
      const msRes = await this.resolveMicrosoftLaunchProfile();
      if (!msRes.ok) return msRes;
      authProfile = msRes.profile;
    }

    if (typeof this.stopBotSession === "function") {
      await this.stopBotSession();
    }

    if (this.runningGameProcess && !this.runningGameProcess.killed) {
      this.runningGameProcess.kill();
      this.runningGameProcess = null;
    }

    const resolved = await this.resolveVersionRuntime(cleanVersion);
    const minecraftDir = resolved.minecraftDir;
    const cleanSource = String(source || "vanilla").toLowerCase();
    const effectiveGameVersion =
      String(gameVersion || "").trim() || cleanVersion;
    const cleanLoaderVersion = String(loaderVersion || "").trim();
    const cleanProfileId =
      String(performanceProfileId || VANILLA_FABRIC_PROFILE_ID).trim() ||
      VANILLA_FABRIC_PROFILE_ID;
    let runtimeGameDir = minecraftDir;
    let modsReport = null;
    if (
      cleanSource === "fabric" &&
      String(instanceMode || "dedicated") === "dedicated"
    ) {
      runtimeGameDir = this.getInstancePath({
        profileId: cleanProfileId,
        gameVersion: effectiveGameVersion,
        loaderVersion: cleanLoaderVersion,
      });
      await ensureDir(runtimeGameDir);
      const lockPath = path.join(runtimeGameDir, "mods.lock.json");
      let existingLock = null;
      try {
        existingLock = JSON.parse(await fsp.readFile(lockPath, "utf8"));
      } catch {
        existingLock = null;
      }
      const lockCompatible = this.isPerformanceLockCompatible({
        lock: existingLock,
        profileId: cleanProfileId,
        gameVersion: effectiveGameVersion,
        loaderVersion: cleanLoaderVersion,
      });
      if (lockCompatible) {
        modsReport = {
          profileId: cleanProfileId,
          instancePath: runtimeGameDir,
          installed: Array.isArray(existingLock.mods) ? existingLock.mods : [],
          skipped: Array.isArray(existingLock.skipped) ? existingLock.skipped : [],
          lockPath,
        };
      } else {
        modsReport = await this.installPerformanceMods({
          instancePath: runtimeGameDir,
          profileId: cleanProfileId,
          gameVersion: effectiveGameVersion,
          loaderVersion: cleanLoaderVersion,
          signal: null,
        });
      }

      if (cleanProfileId === FABRIC_PERFORMANCE_PROFILE_ID) {
        const installedIds = new Set(
          (modsReport?.installed || []).map((m) => String(m.modId || "")),
        );
        const coreMissing = CORE_MODS.filter((id) => !installedIds.has(id));
        const skippedById = new Map(
          (modsReport?.skipped || []).map((s) => [String(s.modId || ""), s]),
        );
        if (coreMissing.length > 0) {
          const details = coreMissing
            .map((id) => {
              const sk = skippedById.get(id);
              return sk
                ? `${id}: ${String(sk.reason || "not_installed")}`
                : `${id}: not_installed`;
            })
            .join(" | ");
          return {
            ok: false,
            error: `Fabric rendimiento no aplicado (mods núcleo faltantes): ${coreMissing.join(", ")}. Detalle: ${details}. Reintenta instalación.`,
            mods: {
              installed: modsReport?.installed || [],
              skipped: modsReport?.skipped || [],
              coreOk: false,
              coreMissing,
              instancePath: runtimeGameDir,
              profileId: cleanProfileId,
            },
          };
        }
        modsReport.coreOk = true;
      }
    }
    const versionMeta = resolved.mergedMeta;
    const libraries = Array.isArray(versionMeta.libraries)
      ? versionMeta.libraries
      : [];
    const librariesDir = path.join(minecraftDir, "libraries");

    const classpathEntries = [];
    const nativeJarPaths = [];
    const nativeSkipped = [];
    for (const lib of libraries) {
      if (!applyRuleSet(lib.rules, "windows")) continue;
      if (lib.downloads?.artifact?.path) {
        classpathEntries.push(
          path.join(librariesDir, lib.downloads.artifact.path),
        );
      } else if (lib.name) {
        const rel = toArtifactPath(lib.name);
        if (rel) classpathEntries.push(path.join(librariesDir, rel));
      }
      const nativeInfo = resolveWindowsNativeDownload(lib);
      const nativeDownload = nativeInfo?.download;
      if (nativeDownload?.path)
        nativeJarPaths.push(path.join(librariesDir, nativeDownload.path));
      else if (nativeInfo?.reason)
        nativeSkipped.push({
          name: String(lib?.name || "unknown"),
          reason: nativeInfo.reason,
        });
    }
    if (!(await fileExists(resolved.clientJarPath))) {
      return {
        ok: false,
        error: `Client.jar not found for ${cleanVersion} or its inheritsFrom chain.`,
      };
    }
    classpathEntries.push(resolved.clientJarPath);

    const assetIndexId = versionMeta?.assetIndex?.id || cleanVersion;
    const versionFolder = resolved.chain[0].folder;
    const nativesDir = path.join(versionFolder, `natives-${Date.now()}`);
    await ensureDir(nativesDir);
    const nativeExtraction = await this.extractNativeJars(
      nativeJarPaths,
      nativesDir,
      nativeSkipped,
    );
    if (!nativeExtraction.ok) return nativeExtraction;

    const replacements = {
      natives_directory: nativesDir,
      launcher_name: "MC-BETA",
      launcher_version: "1.0.0",
      classpath: classpathEntries.join(path.delimiter),
      classpath_separator: path.delimiter,
      library_directory: librariesDir,
      auth_player_name: username,
      version_name: cleanVersion,
      game_directory: runtimeGameDir,
      assets_root: path.join(minecraftDir, "assets"),
      assets_index_name: assetIndexId,
      auth_uuid: authProfile.uuid,
      auth_access_token: authProfile.accessToken,
      user_type: authProfile.userType,
      version_type: String(versionMeta.type || "release"),
      user_properties: "{}",
      resolution_width: "1280",
      resolution_height: "720",
    };
    replacements.auth_player_name = authProfile.username;
    const launchFeatures = {
      has_custom_resolution: true,
      is_demo_user: false,
      has_quick_plays_support: false,
      is_quick_play_singleplayer: false,
      is_quick_play_multiplayer: false,
      is_quick_play_realms: false,
    };

    const cfg = this.loadConfig() || {};
    const cfgDownloads =
      cfg?.launcher?.downloads && typeof cfg.launcher.downloads === "object"
        ? cfg.launcher.downloads
        : {};
    const effectiveMinMemory = Math.max(
      512,
      Number(minMemoryMb) || Number(cfgDownloads.minMemoryMb) || 1024,
    );
    const effectiveMaxMemory = Math.max(
      effectiveMinMemory,
      Number(maxMemoryMb) || Number(cfgDownloads.maxMemoryMb) || 2048,
    );
    const effectiveExtraJvmArgs = String(
      extraJvmArgs || cfgDownloads.extraJvmArgs || "",
    ).trim();
    const effectiveExtraGameArgs = String(
      extraGameArgs || cfgDownloads.extraGameArgs || "",
    ).trim();
    const jvmArgs = [
      `-Xms${effectiveMinMemory}M`,
      `-Xmx${effectiveMaxMemory}M`,
    ];
    if (Array.isArray(versionMeta.arguments?.jvm)) {
      for (const entry of versionMeta.arguments.jvm) {
        if (typeof entry === "string") {
          jvmArgs.push(formatJvmRuleArg(entry, replacements));
        } else if (
          entry &&
          applyRuleSet(entry.rules, "windows", launchFeatures)
        ) {
          const val = entry.value;
          if (Array.isArray(val)) {
            for (const v of val)
              jvmArgs.push(formatJvmRuleArg(v, replacements));
          } else if (typeof val === "string") {
            jvmArgs.push(formatJvmRuleArg(val, replacements));
          }
        }
      }
    } else {
      jvmArgs.push("-Djava.library.path=${natives_directory}");
      jvmArgs.push("-cp", "${classpath}");
    }

    const mainClass = versionMeta.mainClass;
    if (!mainClass)
      return { ok: false, error: "mainClass not found in version." };

    const gameArgs = [];
    if (Array.isArray(versionMeta.arguments?.game)) {
      for (const entry of versionMeta.arguments.game) {
        if (typeof entry === "string") {
          gameArgs.push(formatJvmRuleArg(entry, replacements));
        } else if (
          entry &&
          applyRuleSet(entry.rules, "windows", launchFeatures)
        ) {
          const val = entry.value;
          if (Array.isArray(val)) {
            for (const v of val)
              gameArgs.push(formatJvmRuleArg(v, replacements));
          } else if (typeof val === "string") {
            gameArgs.push(formatJvmRuleArg(val, replacements));
          }
        }
      }
    } else if (typeof versionMeta.minecraftArguments === "string") {
      gameArgs.push(
        ...versionMeta.minecraftArguments
          .split(" ")
          .map((x) => formatJvmRuleArg(x, replacements)),
      );
    }

    if (effectiveExtraJvmArgs) {
      const parsedExtraJvmArgs = stripConflictingEncodingArgs(
        parseLaunchArgsString(effectiveExtraJvmArgs),
      );
      jvmArgs.push(...parsedExtraJvmArgs);
    }
    if (effectiveExtraGameArgs) {
      gameArgs.push(...parseLaunchArgsString(effectiveExtraGameArgs));
    }

    const finalJvmArgs = jvmArgs.map((x) => formatJvmRuleArg(x, replacements));
    const args = [...finalJvmArgs, mainClass, ...gameArgs];
    const javaStrategy = await this.buildJavaCandidates({
      preferredPath: javaPath,
      versionId: cleanVersion,
    });
    const tried = [];

    for (const javaExec of javaStrategy.candidates) {
      tried.push(javaExec);
      const started = await this.tryLaunchProcess({
        javaExec,
        args,
        minecraftDir: runtimeGameDir,
      });
      if (started.ok) {
        this.lastGameStatus.javaPathTried = [...tried];
        this.lastGameStatus.javaPathSelected = javaExec;
        this.lastGameStatus.updatedAt = Date.now();
        return {
          ok: true,
          status: "started",
          pid: started.pid,
          javaPath: javaExec,
          javaPathTried: tried,
          mods: modsReport
            ? {
                installed: modsReport.installed || [],
                skipped: modsReport.skipped || [],
                coreOk:
                  typeof modsReport.coreOk === "boolean"
                    ? modsReport.coreOk
                    : true,
                instancePath: modsReport.instancePath || runtimeGameDir,
                profileId: modsReport.profileId || cleanProfileId,
              }
            : null,
        };
      }
      this.lastGameStatus.lastError = started.error || "Failed to start.";
      this.lastGameStatus.updatedAt = Date.now();
    }

    const recent = this.lastGameStatus.lastLines.slice(-12).join("\n");
    return {
      ok: false,
      error: `Could not start Minecraft. Recommended Java: ${javaStrategy.recommendedMajor}.`,
      javaPathTried: tried,
      lastErrorLines: recent,
      lastError: this.lastGameStatus.lastError || "",
    };
  }

  stopGame() {
    if (!this.runningGameProcess) return { ok: true };
    try {
      this.runningGameProcess.kill();
    } catch {}
    this.runningGameProcess = null;
    this.lastGameStatus.running = false;
    this.lastGameStatus.updatedAt = Date.now();
    return { ok: true };
  }

  async extractNativeJars(nativeJarPaths, nativesDir, nativeSkipped = []) {
    const jars = Array.isArray(nativeJarPaths) ? nativeJarPaths : [];
    const attempted = [];
    for (const jarPath of jars) {
      if (!(await fileExists(jarPath))) continue;
      attempted.push(jarPath);
      const tmpZipPath = `${jarPath}.tmp-native.zip`;
      try {
        await fsp.copyFile(jarPath, tmpZipPath);
        const psCommand = [
          "$ErrorActionPreference='Stop'",
          `Add-Type -AssemblyName System.IO.Compression.FileSystem`,
          `$zip=[System.IO.Compression.ZipFile]::OpenRead('${tmpZipPath.replace(/'/g, "''")}')`,
          "foreach($entry in $zip.Entries){",
          "  if ($entry.FullName -like 'META-INF/*' -or $entry.FullName -like 'META-INF\\\\*'){ continue }",
          "  if ([string]::IsNullOrWhiteSpace($entry.Name)){ continue }",
          "  $safePath = ($entry.FullName -replace '/', '\\\\')",
          "  $safePath = $safePath.TrimStart('\\\\')",
          `  $target = Join-Path '${nativesDir.replace(/'/g, "''")}' $safePath`,
          "  $targetDir = Split-Path -Parent $target",
          "  if (-not [string]::IsNullOrWhiteSpace($targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }",
          "  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)",
          "}",
          "$zip.Dispose()",
        ].join("; ");
        const ps = spawnSync(
          "powershell",
          ["-NoProfile", "-Command", psCommand],
          { encoding: "utf8" },
        );
        if (ps.status !== 0) {
          const stderr = String(ps.stderr || "").trim();
          throw new Error(
            `Could not extract natives from ${jarPath}. ${stderr || ""}`.trim(),
          );
        }
      } finally {
        await fsp.rm(tmpZipPath, { force: true }).catch(() => {});
      }
    }
    const dllCount = await this.countDllsInDirectory(nativesDir);
    if (dllCount <= 0) {
      const detail = attempted.length
        ? ` Detected native JARs=${attempted.length}; attempted: ${attempted.slice(-6).join(" | ")}`
        : " No native JARs detected for extraction.";
      const skippedTop =
        Array.isArray(nativeSkipped) && nativeSkipped.length > 0
          ? ` Skipped (top 3): ${nativeSkipped
              .slice(0, 3)
              .map((x) => `${x.name}=>${x.reason}`)
              .join(" | ")}`
          : "";
      return {
        ok: false,
        error: `Natives not extracted: no DLLs found in native runtime.${detail}${skippedTop}`,
      };
    }
    return { ok: true, dllCount, detectedNativeJars: attempted.length };
  }

  async directoryHasDll(rootDir) {
    const stack = [rootDir];
    while (stack.length > 0) {
      const dir = stack.pop();
      let entries = [];
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (
          entry.isFile() &&
          String(entry.name).toLowerCase().endsWith(".dll")
        )
          return true;
      }
    }
    return false;
  }

  async countDllsInDirectory(rootDir) {
    let count = 0;
    const stack = [rootDir];
    while (stack.length > 0) {
      const dir = stack.pop();
      let entries = [];
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (
          entry.isFile() &&
          String(entry.name).toLowerCase().endsWith(".dll")
        )
          count += 1;
      }
    }
    return count;
  }

  async tryLaunchProcess({ javaExec, args, minecraftDir }) {
    const child = spawn(javaExec, args, {
      cwd: minecraftDir,
      detached: false,
      windowsHide: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.runningGameProcess = child;
    this.lastGameStatus = {
      running: true,
      pid: child.pid || null,
      lastExitCode: null,
      lastError: "",
      lastLines: [],
      startedAt: Date.now(),
      lastStdoutAt: 0,
      lastStderrAt: 0,
      lastOutputAt: Date.now(),
      lineCount: 0,
      lastLifecycleEvent: "spawned",
      javaPathSelected: javaExec,
      javaPathTried: this.lastGameStatus?.javaPathTried || [],
      updatedAt: Date.now(),
    };

    const pushLine = (prefix, raw) => {
      const now = Date.now();
      const lines = String(raw || "")
        .split(/\r?\n/)
        .map((x) => x.trim())
        .filter(Boolean);
      for (const ln of lines) {
        this.lastGameStatus.lastLines.push(`${prefix}${ln}`);
        this.lastGameStatus.lineCount += 1;
      }
      if (lines.length > 0) {
        this.lastGameStatus.lastOutputAt = now;
        if (prefix) {
          this.lastGameStatus.lastStderrAt = now;
          this.lastGameStatus.lastLifecycleEvent = "stderr_data";
        } else {
          this.lastGameStatus.lastStdoutAt = now;
          this.lastGameStatus.lastLifecycleEvent = "stdout_data";
        }
      }
      if (this.lastGameStatus.lastLines.length > 120) {
        this.lastGameStatus.lastLines.splice(
          0,
          this.lastGameStatus.lastLines.length - 120,
        );
      }
      this.lastGameStatus.updatedAt = now;
    };

    if (child.stdout)
      child.stdout.on("data", (d) => pushLine("", d.toString("utf8")));
    if (child.stderr)
      child.stderr.on("data", (d) => pushLine("[ERR] ", d.toString("utf8")));

    child.on("close", (code) => {
      this.runningGameProcess = null;
      this.lastGameStatus.running = false;
      this.lastGameStatus.lastExitCode = Number.isFinite(code) ? code : null;
      this.lastGameStatus.lastLifecycleEvent = "closed";
      this.lastGameStatus.updatedAt = Date.now();
    });

    child.on("error", (error) => {
      this.runningGameProcess = null;
      this.lastGameStatus.running = false;
      this.lastGameStatus.lastError = String(
        error?.message || error || "Error starting Java.",
      );
      this.lastGameStatus.lastLifecycleEvent = "error";
      this.lastGameStatus.updatedAt = Date.now();
    });

    return new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      child.once("error", (err) =>
        finish({
          ok: false,
          error: String(err?.message || err || "Error starting Java."),
        }),
      );
      child.once("close", (code) => {
        const recent = this.lastGameStatus.lastLines.slice(-12).join("\n");
        finish({
          ok: false,
          error:
            `The Java process terminated with code ${code}. ${recent}`.trim(),
        });
      });
      setTimeout(() => {
        this.lastGameStatus.lastLifecycleEvent = "stable_6_5s";
        this.lastGameStatus.updatedAt = Date.now();
        finish({ ok: true, pid: child.pid, status: "stable" });
      }, 6500);
    });
  }

  getGameRuntimeStatus() {
    const now = Date.now();
    const thresholdMs = this.getRuntimeStallThresholdMs();
    const lastOutputAt = Number(this.lastGameStatus?.lastOutputAt || 0);
    const silenceMs = lastOutputAt > 0 ? Math.max(0, now - lastOutputAt) : 0;
    const stalled =
      Boolean(this.lastGameStatus?.running) && silenceMs >= thresholdMs;
    return {
      ok: true,
      running: Boolean(this.lastGameStatus?.running),
      pid: this.lastGameStatus?.pid || null,
      lastExitCode: this.lastGameStatus?.lastExitCode ?? null,
      lastError: this.lastGameStatus?.lastError || "",
      lastErrorLines: Array.isArray(this.lastGameStatus?.lastLines)
        ? this.lastGameStatus.lastLines.slice(-12).join("\n")
        : "",
      startedAt: this.lastGameStatus?.startedAt || 0,
      lastStdoutAt: this.lastGameStatus?.lastStdoutAt || 0,
      lastStderrAt: this.lastGameStatus?.lastStderrAt || 0,
      lastOutputAt,
      lineCount: Number(this.lastGameStatus?.lineCount || 0),
      lastLifecycleEvent: this.lastGameStatus?.lastLifecycleEvent || "",
      stallThresholdMs: thresholdMs,
      silenceMs,
      stalled,
      javaPathTried: Array.isArray(this.lastGameStatus?.javaPathTried)
        ? this.lastGameStatus.javaPathTried
        : [],
      javaPathSelected: this.lastGameStatus?.javaPathSelected || "",
      updatedAt: this.lastGameStatus?.updatedAt || Date.now(),
    };
  }

  async isVersionInstalled({
    source = "vanilla",
    versionId = "",
    loaderVersion = "",
  } = {}) {
    const cleanSource = String(source || "vanilla").toLowerCase();
    const cleanVersion = String(versionId || "").trim();
    const cleanLoader = String(loaderVersion || "").trim();
    if (!cleanVersion)
      return { ok: false, installed: false, error: "Version requerida." };

    const minecraftDir = this.getMinecraftDir();
    const versionsDir = path.join(minecraftDir, "versions");

    if (cleanSource === "vanilla") {
      const versionFolder = path.join(versionsDir, cleanVersion);
      const versionJsonPath = path.join(versionFolder, `${cleanVersion}.json`);
      const versionJarPath = path.join(versionFolder, `${cleanVersion}.jar`);
      const installedMeta = await isReadableJsonFile(versionJsonPath);
      const installedJar = await isNonEmptyFile(versionJarPath);
      let installedAssetsIndex = true;
      if (installedMeta) {
        try {
          const versionMeta = JSON.parse(
            await fsp.readFile(versionJsonPath, "utf8"),
          );
          const assetIndexId = String(versionMeta?.assetIndex?.id || "").trim();
          if (assetIndexId) {
            const assetIndexPath = path.join(
              minecraftDir,
              "assets",
              "indexes",
              `${assetIndexId}.json`,
            );
            installedAssetsIndex = await isReadableJsonFile(assetIndexPath);
          }
        } catch {
          installedAssetsIndex = false;
        }
      }
      const installed = installedMeta && installedJar && installedAssetsIndex;
      return { ok: true, installed };
    }

    if (cleanSource === "fabric") {
      if (!cleanLoader)
        return { ok: true, installed: false, reason: "missing_loader_version" };
      const profileId = `fabric-loader-${cleanLoader}-${cleanVersion}`;
      const profileFolder = path.join(versionsDir, profileId);
      const profileJsonPath = path.join(profileFolder, `${profileId}.json`);
      const baseFolder = path.join(versionsDir, cleanVersion);
      const baseJsonPath = path.join(baseFolder, `${cleanVersion}.json`);
      const baseJarPath = path.join(baseFolder, `${cleanVersion}.jar`);
      const installed =
        (await isReadableJsonFile(profileJsonPath)) &&
        (await isReadableJsonFile(baseJsonPath)) &&
        (await isNonEmptyFile(baseJarPath));
      return { ok: true, installed, profileId };
    }

    if (cleanSource === "forge") {
      return { ok: true, installed: false, reason: "forge_not_supported_yet" };
    }

    return {
      ok: false,
      installed: false,
      error: `Source not supported: ${cleanSource}`,
    };
  }

  getAuthSession() {
    const state = this.getMicrosoftState();
    const active = state.activeAccountId
      ? state.accounts.find((a) => a.id === state.activeAccountId) || null
      : null;
    return {
      ok: true,
      session: active,
      activeAccountId: state.activeAccountId,
      count: state.accounts.length,
    };
  }

  listAuthSessions() {
    const state = this.getMicrosoftState();
    return {
      ok: true,
      accounts: state.accounts,
      activeAccountId: state.activeAccountId,
    };
  }

  setActiveAuthSession(accountId) {
    const id = String(accountId || "").trim();
    if (!id) return { ok: false, error: "Account required." };
    const state = this.getMicrosoftState();
    if (!state.accounts.find((a) => a.id === id))
      return { ok: false, error: "Account not found." };
    state.activeAccountId = id;
    this.saveMicrosoftState(state);
    return { ok: true, activeAccountId: id };
  }

  removeAuthSession(accountId) {
    const id = String(accountId || "").trim();
    if (!id) return { ok: false, error: "Account required." };
    const state = this.getMicrosoftState();
    const next = state.accounts.filter((a) => a.id !== id);
    state.accounts = next;
    if (!next.length) state.activeAccountId = null;
    else if (state.activeAccountId === id) state.activeAccountId = next[0].id;
    this.saveMicrosoftState(state);
    return {
      ok: true,
      accounts: state.accounts,
      activeAccountId: state.activeAccountId,
    };
  }

  async msLogin() {
    try {
      const msCfg = this.getMicrosoftState();
      if (!msCfg.clientId) {
        return {
          ok: false,
          error: "Missing auth.microsoft.clientId in config.json.",
        };
      }

      const callback = await this.startMicrosoftLoopbackServer(
        msCfg.loginTimeoutMs,
      );
      const redirectUri = callback.redirectUri;
      const pca = new PublicClientApplication({
        auth: {
          clientId: msCfg.clientId,
          authority: `https://login.microsoftonline.com/${msCfg.tenant || MS_DEFAULT_TENANT}`,
        },
      });
      const tokenCache = pca.getTokenCache();
      const authCodeUrl = await pca.getAuthCodeUrl({
        scopes: MS_SCOPES,
        redirectUri,
        prompt: "select_account",
      });
      await shell.openExternal(authCodeUrl);
      const authCode = await callback.waitForCode();
      const tokenRes = await pca.acquireTokenByCode({
        code: authCode,
        scopes: MS_SCOPES,
        redirectUri,
      });
      if (!tokenRes?.accessToken || !tokenRes?.account) {
        return { ok: false, error: "Could not obtain Microsoft token." };
      }

      const mcAuth = await this.exchangeMicrosoftToMinecraft(
        tokenRes.accessToken,
      );
      const cacheBlob = tokenCache.serialize();
      const account = this.buildMicrosoftAccountRecord(
        tokenRes,
        mcAuth,
        cacheBlob,
      );
      const next = this.upsertMicrosoftAccount(msCfg, account);
      this.saveMicrosoftState(next);
      return { ok: true, account, activeAccountId: next.activeAccountId };
    } catch (error) {
      return {
        ok: false,
        error: String(
          error?.message || error || "Could not start Microsoft session.",
        ),
      };
    }
  }

  msLogout() {
    const state = this.getMicrosoftState();
    state.accounts = [];
    state.activeAccountId = null;
    this.saveMicrosoftState(state);
    return { ok: true };
  }

  getMicrosoftState() {
    const cfg = this.loadConfig() || {};
    if (!cfg.auth || typeof cfg.auth !== "object") cfg.auth = {};
    const msRaw =
      cfg.auth.microsoft && typeof cfg.auth.microsoft === "object"
        ? cfg.auth.microsoft
        : {};
    const state = {
      tenant:
        String(msRaw.tenant || MS_DEFAULT_TENANT).trim() || MS_DEFAULT_TENANT,
      clientId: String(msRaw.clientId || "").trim(),
      redirectStrategy: "loopback",
      loginTimeoutMs:
        Number.parseInt(String(msRaw.loginTimeoutMs || "180000"), 10) || 180000,
      accounts: Array.isArray(msRaw.accounts)
        ? msRaw.accounts.filter((a) => a && typeof a === "object")
        : [],
      activeAccountId: String(msRaw.activeAccountId || "").trim() || null,
    };
    if (!state.activeAccountId && state.accounts.length)
      state.activeAccountId = state.accounts[0].id;
    return state;
  }

  saveMicrosoftState(state) {
    const cfg = this.loadConfig() || {};
    if (!cfg.auth || typeof cfg.auth !== "object") cfg.auth = {};
    cfg.auth.microsoft = {
      tenant:
        String(state.tenant || MS_DEFAULT_TENANT).trim() || MS_DEFAULT_TENANT,
      clientId: String(state.clientId || "").trim(),
      redirectStrategy: "loopback",
      loginTimeoutMs:
        Number.parseInt(String(state.loginTimeoutMs || "180000"), 10) || 180000,
      accounts: Array.isArray(state.accounts) ? state.accounts : [],
      activeAccountId: String(state.activeAccountId || "").trim() || null,
    };
    this.saveConfig(cfg);
  }

  buildMicrosoftAccountRecord(tokenRes, mcAuth, rawCacheBlob) {
    const account = tokenRes.account || {};
    const homeAccountId = String(account.homeAccountId || "").trim();
    const localAccountId = String(account.localAccountId || "").trim();
    const id = homeAccountId || localAccountId || crypto.randomUUID();
    const cacheEncrypted = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(String(rawCacheBlob || "")).toString("base64")
      : Buffer.from(String(rawCacheBlob || ""), "utf8").toString("base64");
    return {
      id,
      homeAccountId,
      localAccountId,
      username: String(account.username || "").trim(),
      displayName: String(account.name || account.username || "").trim(),
      minecraftUuid: String(mcAuth.uuid || "").trim(),
      minecraftUsername: String(mcAuth.username || "").trim(),
      expiresOn: tokenRes.expiresOn
        ? new Date(tokenRes.expiresOn).toISOString()
        : null,
      cacheEncrypted,
      updatedAt: new Date().toISOString(),
    };
  }

  upsertMicrosoftAccount(state, account) {
    const next = {
      ...state,
      accounts: Array.isArray(state.accounts) ? [...state.accounts] : [],
    };
    const idx = next.accounts.findIndex((a) => a.id === account.id);
    if (idx >= 0) next.accounts[idx] = account;
    else next.accounts.push(account);
    next.activeAccountId = account.id;
    return next;
  }

  async startMicrosoftLoopbackServer(timeoutMs) {
    const server = http.createServer();
    const loginTimeoutMs = Math.max(60000, Number(timeoutMs) || 180000);
    let settle;
    const done = new Promise((resolve, reject) => {
      settle = { resolve, reject };
    });

    server.on("request", (req, res) => {
      const reqUrl = new URL(req.url || "/", "http://127.0.0.1");
      const code = reqUrl.searchParams.get("code");
      const err = reqUrl.searchParams.get("error");
      if (err) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Microsoft authentication error. You can close this tab.");
        settle.reject(
          new Error(reqUrl.searchParams.get("error_description") || err),
        );
        return;
      }
      if (code) {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(
          "Authentication completed. You can now return to the launcher.",
        );
        settle.resolve(code);
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Invalid path.");
    });

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const addr = server.address();
    const port = addr && typeof addr === "object" ? addr.port : 0;
    const redirectUri = `http://127.0.0.1:${port}`;
    const timer = setTimeout(() => {
      settle.reject(new Error("Timeout waiting for Microsoft callback."));
    }, loginTimeoutMs);

    return {
      redirectUri,
      waitForCode: async () => {
        try {
          const code = await done;
          return code;
        } finally {
          clearTimeout(timer);
          server.close();
        }
      },
    };
  }

  async exchangeMicrosoftToMinecraft(msAccessToken) {
    const userAuth = await httpsRequestJson(
      "https://user.auth.xboxlive.com/user/authenticate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          Properties: {
            AuthMethod: "RPS",
            SiteName: "user.auth.xboxlive.com",
            RpsTicket: `d=${msAccessToken}`,
          },
          RelyingParty: "http://auth.xboxlive.com",
          TokenType: "JWT",
        }),
      },
    );
    const userToken = String(userAuth?.Token || "");
    const uhs = String(userAuth?.DisplayClaims?.xui?.[0]?.uhs || "");
    if (!userToken || !uhs) throw new Error("No Xbox Live token was obtained.");

    const xstsAuth = await httpsRequestJson(
      "https://xsts.auth.xboxlive.com/xsts/authorize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          Properties: { SandboxId: "RETAIL", UserTokens: [userToken] },
          RelyingParty: "rp://api.minecraftservices.com/",
          TokenType: "JWT",
        }),
      },
    );
    const xstsToken = String(xstsAuth?.Token || "");
    if (!xstsToken) throw new Error("No XSTS token was obtained.");

    const mcLogin = await httpsRequestJson(
      "https://api.minecraftservices.com/authentication/login_with_xbox",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          identityToken: `XBL3.0 x=${uhs};${xstsToken}`,
        }),
      },
    );
    const mcAccessToken = String(mcLogin?.access_token || "");
    if (!mcAccessToken)
      throw new Error("No Minecraft access token was obtained.");

    const profile = await httpsRequestJson(
      "https://api.minecraftservices.com/minecraft/profile",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${mcAccessToken}`,
          Accept: "application/json",
        },
      },
    );
    const uuid = String(profile?.id || "").trim();
    const username = String(profile?.name || "").trim();
    if (!uuid || !username)
      throw new Error(
        "Could not resolve Minecraft profile. Check Java license in account.",
      );
    return { uuid, username, mcAccessToken };
  }

  decodeCacheBlob(account) {
    const blobB64 = String(account?.cacheEncrypted || "");
    if (!blobB64)
      throw new Error("Token cache missing for the selected account.");
    const raw = Buffer.from(blobB64, "base64");
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(raw);
    }
    return raw.toString("utf8");
  }

  async resolveMicrosoftLaunchProfile() {
    const state = this.getMicrosoftState();
    const active = state.activeAccountId
      ? state.accounts.find((a) => a.id === state.activeAccountId)
      : null;
    if (!active)
      return {
        ok: false,
        error: "There is no active Microsoft account. Tap 'Sign in'.",
      };
    if (!state.clientId)
      return {
        ok: false,
        error: "Microsoft clientId is missing from config.json.",
      };
    try {
      const pca = new PublicClientApplication({
        auth: {
          clientId: state.clientId,
          authority: `https://login.microsoftonline.com/${state.tenant || MS_DEFAULT_TENANT}`,
        },
      });
      const cache = pca.getTokenCache();
      cache.deserialize(this.decodeCacheBlob(active));
      const all = await cache.getAllAccounts();
      const msAccount = all.find(
        (a) =>
          String(a.homeAccountId || "") === String(active.homeAccountId || ""),
      );
      if (!msAccount)
        return {
          ok: false,
          error: "Microsoft local session expired. Please log in again.",
        };

      const tokenRes = await pca.acquireTokenSilent({
        account: msAccount,
        scopes: MS_SCOPES,
        forceRefresh: false,
      });
      if (!tokenRes?.accessToken)
        return { ok: false, error: "Failed to refresh Microsoft token." };
      const mcAuth = await this.exchangeMicrosoftToMinecraft(
        tokenRes.accessToken,
      );
      const updated = this.buildMicrosoftAccountRecord(
        tokenRes,
        mcAuth,
        cache.serialize(),
      );
      const next = this.upsertMicrosoftAccount(state, updated);
      this.saveMicrosoftState(next);
      return {
        ok: true,
        profile: {
          username: mcAuth.username,
          uuid: mcAuth.uuid,
          accessToken: mcAuth.mcAccessToken,
          userType: "msa",
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: `Invalid or revoked Microsoft session: ${String(error?.message || error)}. Please log in again.`,
      };
    }
  }
}

module.exports = { GameLauncherService };
