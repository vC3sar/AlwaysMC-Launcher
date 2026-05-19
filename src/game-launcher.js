const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const https = require("https");
const { spawn, spawnSync } = require("child_process");

const MC_MANIFEST_URL = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
const FABRIC_GAMES_URL = "https://meta.fabricmc.net/v2/versions/game";
const FABRIC_LOADERS_URL = "https://meta.fabricmc.net/v2/versions/loader";
const FORGE_PROMOS_URL = "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json";

function httpsGetBuffer(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: timeoutMs, headers: { "User-Agent": "MC-BETA/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(httpsGetBuffer(res.headers.location, timeoutMs));
      }
      if (res.statusCode !== 200) {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => reject(new Error(`HTTP ${res.statusCode} for ${url}: ${Buffer.concat(chunks).toString("utf8")}`)));
        return;
      }
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error(`Timeout fetching ${url}`)));
  });
}

async function fetchJson(url, timeoutMs = 30000) {
  const buf = await httpsGetBuffer(url, timeoutMs);
  return JSON.parse(buf.toString("utf8"));
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

function sha1Hex(buffer) {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function verifyFile(filePath, expectedSha1, expectedSize) {
  if (!(await fileExists(filePath))) return false;
  const stat = await fsp.stat(filePath);
  if (Number.isFinite(expectedSize) && expectedSize > -1 && stat.size !== expectedSize) return false;
  if (!expectedSha1) return true;
  const data = await fsp.readFile(filePath);
  return sha1Hex(data) === String(expectedSha1).toLowerCase();
}

async function downloadFileWithVerify(url, destPath, { sha1 = "", size = -1, retries = 3, onProgress = null, signal = null } = {}) {
  await ensureDir(path.dirname(destPath));

  if (await verifyFile(destPath, sha1, size)) {
    if (typeof onProgress === "function") onProgress({ skipped: true, bytes: size > -1 ? size : 0 });
    return;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    if (signal && signal.aborted) throw new Error("Instalación cancelada.");
    try {
      await new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { "User-Agent": "MC-BETA/1.0" } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            downloadFileWithVerify(res.headers.location, destPath, { sha1, size, retries: 1, onProgress, signal }).then(resolve).catch(reject);
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
            if (typeof onProgress === "function") onProgress({ bytes: chunk.length, totalReceived: received, totalExpected: Number.isFinite(size) && size > -1 ? size : undefined });
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
                  if (stat.size !== size) throw new Error(`Size mismatch for ${destPath}`);
                }
                if (sha1) {
                  const data = await fsp.readFile(tmpPath);
                  if (sha1Hex(data) !== String(sha1).toLowerCase()) throw new Error(`SHA1 mismatch for ${destPath}`);
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
        });
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

function applyRuleSet(rules, osName = "windows") {
  if (!Array.isArray(rules) || rules.length === 0) return true;
  let allowed = false;
  for (const rule of rules) {
    const action = rule && rule.action === "disallow" ? "disallow" : "allow";
    const osRule = rule && rule.os ? String(rule.os.name || "").toLowerCase() : "";
    const matchesOs = !osRule || osRule === osName;
    if (!matchesOs) continue;
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
  for (const [key, value] of Object.entries(replacements)) {
    output = output.replaceAll(`\${${key}}`, String(value));
  }
  return output;
}

function parseMinecraftVersionInfo(versionId) {
  const raw = String(versionId || "").trim();
  const m = raw.match(/^1\.(\d+)(?:\.(\d+))?/);
  if (!m) return { major: null, minor: null, patch: null, raw };
  return {
    major: 1,
    minor: Number.parseInt(m[1], 10),
    patch: Number.parseInt(m[2] || "0", 10),
    raw,
  };
}

function recommendedJavaMajorForVersion(versionId) {
  const v = parseMinecraftVersionInfo(versionId);
  if (v.minor === null) return 21;
  if (v.minor <= 16) return 8;
  if (v.minor === 17) return 16;
  if (v.minor === 18 || v.minor === 19) return 17;
  if (v.minor === 20) return v.patch >= 5 ? 21 : 17;
  if (v.minor >= 21) return 21;
  return 17;
}

function detectJavaMajorFromPathOrLabel(text) {
  const hay = String(text || "").toLowerCase();
  const jdkLike = hay.match(/jdk[-_]?([0-9]{1,2})/);
  if (jdkLike) return Number.parseInt(jdkLike[1], 10);
  if (hay.includes("1.8")) return 8;
  const javaLike = hay.match(/java[-_ ]([0-9]{1,2})/);
  if (javaLike) return Number.parseInt(javaLike[1], 10);
  return null;
}

class GameLauncherService {
  constructor({ appRoot, loadConfig, saveConfig, stopBotSession, onInstallUpdate }) {
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
      updatedAt: Date.now(),
    };
  }

  getMinecraftDir() {
    const cfg = this.loadConfig() || {};
    const customDir = cfg?.launcher?.downloads?.minecraftDir;
    if (customDir && String(customDir).trim()) return String(customDir).trim();
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), ".minecraft");
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
    return versions.map((v) => ({
      id: String(v.id || ""),
      type: String(v.type || "release"),
      releaseTime: v.releaseTime || "",
      url: v.url || "",
      source: "vanilla",
    })).filter((v) => v.id && v.url);
  }

  async fetchFabricCatalog() {
    const [games, loaders] = await Promise.all([fetchJson(FABRIC_GAMES_URL), fetchJson(FABRIC_LOADERS_URL)]);
    const recentLoaders = Array.isArray(loaders) ? loaders.slice(0, 12) : [];
    const releaseGames = Array.isArray(games) ? games.filter((g) => g.stable).slice(0, 25) : [];
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
      .filter(([key]) => key.endsWith("-latest") || key.endsWith("-recommended"))
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
    const ttlMs = Number.parseInt(cfg?.launcher?.catalogCache?.ttlMs || "21600000", 10) || 21600000;
    const cache = await this.readCatalogCache();
    const cacheTime = cache?.generatedAt ? new Date(cache.generatedAt).getTime() : 0;
    const stillFresh = cacheTime > 0 && Date.now() - cacheTime < ttlMs;
    if (!forceRefresh && cache && stillFresh) return { ok: true, catalog: cache, fromCache: true };

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
      if (cache) return { ok: true, catalog: cache, fromCache: true, warning: String(error.message || error) };
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
        add(`${entry.name} javaw`, path.join(root, entry.name, "bin", "javaw.exe"));
        add(`${entry.name} java`, path.join(root, entry.name, "bin", "java.exe"));
      }
    }

    const available = [];
    for (const cand of candidates) {
      if (await fileExists(cand.path)) available.push(cand);
    }
    return available;
  }

  async resolveJavaPath(preferredPath = "") {
    if (preferredPath && await fileExists(preferredPath)) return preferredPath;
    const runtimes = await this.detectJavaRuntimes();
    if (runtimes.length > 0) return runtimes[0].path;
    return "java";
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
    const matching = runtimes.filter((r) => detectJavaMajorFromPathOrLabel(`${r.label} ${r.path}`) === recommendedMajor);
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
        if (depth === 0) throw new Error(`No existe metadata de versión: ${cursor}`);
        break;
      }
      const meta = JSON.parse(await fsp.readFile(jsonPath, "utf8"));
      chain.push({ id: cursor, folder, jsonPath, meta });
      cursor = meta.inheritsFrom ? String(meta.inheritsFrom).trim() : "";
      depth += 1;
    }
    if (chain.length === 0) throw new Error(`No se pudo resolver la versión ${cleanVersion}.`);

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
      if (!merged.minecraftArguments && m.minecraftArguments) merged.minecraftArguments = m.minecraftArguments;
      if (!merged.type && m.type) merged.type = m.type;
      const libs = Array.isArray(m.libraries) ? m.libraries : [];
      for (const lib of libs) {
        const key = String(lib?.name || lib?.downloads?.artifact?.path || JSON.stringify(lib));
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
    if (typeof this.onInstallUpdate === "function") this.onInstallUpdate(installId, job.status);
  }

  buildInstallId(source, versionId) {
    return `${source}:${versionId}`;
  }

  async installVersion({ source = "vanilla", versionId = "", authMode = "offline", loaderVersion = "" } = {}) {
    const cleanSource = String(source || "vanilla").toLowerCase();
    const cleanVersion = String(versionId || "").trim();
    if (!cleanVersion) return { ok: false, error: "Version requerida." };
    const installId = this.buildInstallId(cleanSource, cleanVersion);
    if (this.installJobs.has(installId) && this.installJobs.get(installId).status.busy) {
      return { ok: false, error: "Ya hay una instalación en progreso para esa versión." };
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
        message: "Preparando instalación...",
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
          await this.installVanillaVersion(cleanVersion, installId, controller.signal);
        } else if (cleanSource === "fabric") {
          await this.installFabricProfile(cleanVersion, loaderVersion, installId, controller.signal);
        } else if (cleanSource === "forge") {
          throw new Error("Instalación automática Forge aún no implementada en esta build.");
        } else {
          throw new Error(`Fuente no soportada: ${cleanSource}`);
        }

        this.emitInstallUpdate(installId, { busy: false, progress: 100, phase: "done", message: `Instalación lista (${cleanSource}:${cleanVersion}).` });
      } catch (error) {
        this.emitInstallUpdate(installId, { busy: false, phase: "error", message: String(error.message || error), error: String(error.message || error) });
      }
    };

    run();
    return { ok: true, installId };
  }

  getInstallStatus(installId = "") {
    if (installId) {
      const job = this.installJobs.get(installId);
      if (!job) return { ok: false, error: "Instalación no encontrada." };
      return { ok: true, status: job.status };
    }
    const all = [...this.installJobs.values()].map((j) => j.status);
    return { ok: true, statuses: all };
  }

  cancelInstall(installId) {
    const job = this.installJobs.get(String(installId || ""));
    if (!job) return { ok: false, error: "Instalación no encontrada." };
    if (!job.status.busy) return { ok: true };
    job.controller.abort();
    this.emitInstallUpdate(job.id, { busy: false, phase: "cancelled", message: "Instalación cancelada por usuario." });
    return { ok: true };
  }

  async installFabricProfile(gameVersion, loaderVersion, installId, signal) {
    const minecraftDir = this.getMinecraftDir();
    const versionsDir = path.join(minecraftDir, "versions");
    await ensureDir(versionsDir);

    this.emitInstallUpdate(installId, { phase: "metadata", progress: 10, message: "Resolviendo metadata Fabric..." });
    let resolvedLoader = String(loaderVersion || "").trim();
    if (!resolvedLoader) {
      const loaders = await fetchJson(FABRIC_LOADERS_URL);
      resolvedLoader = loaders?.[0]?.version;
    }
    if (!resolvedLoader) throw new Error("No se pudo resolver loader de Fabric.");

    const profileJson = await fetchJson(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(gameVersion)}/${encodeURIComponent(resolvedLoader)}/profile/json`);
    const versionId = String(profileJson.id || `fabric-loader-${resolvedLoader}-${gameVersion}`);
    const versionFolder = path.join(versionsDir, versionId);
    await ensureDir(versionFolder);
    await fsp.writeFile(path.join(versionFolder, `${versionId}.json`), JSON.stringify(profileJson, null, 2), "utf8");

    this.emitInstallUpdate(installId, { phase: "vanilla-base", progress: 25, message: `Instalando base vanilla ${gameVersion} para Fabric...` });
    await this.installVanillaVersion(gameVersion, installId, signal, 25, 95);

    this.emitInstallUpdate(installId, { phase: "finalizing", progress: 98, message: "Perfil Fabric listo." });
  }

  async installVanillaVersion(versionId, installId, signal, baseProgress = 0, maxProgress = 100) {
    const minecraftDir = this.getMinecraftDir();
    const versionsDir = path.join(minecraftDir, "versions");
    const librariesDir = path.join(minecraftDir, "libraries");
    const assetsDir = path.join(minecraftDir, "assets");
    const indexesDir = path.join(assetsDir, "indexes");
    const objectsDir = path.join(assetsDir, "objects");

    await Promise.all([ensureDir(versionsDir), ensureDir(librariesDir), ensureDir(indexesDir), ensureDir(objectsDir)]);

    this.emitInstallUpdate(installId, { phase: "metadata", progress: baseProgress + 2, message: "Descargando manifest oficial..." });
    const manifest = await fetchJson(MC_MANIFEST_URL);
    const versions = Array.isArray(manifest?.versions) ? manifest.versions : [];
    const target = versions.find((v) => String(v.id) === String(versionId));
    if (!target || !target.url) throw new Error(`Versión ${versionId} no encontrada en manifest oficial.`);

    const versionMeta = await fetchJson(target.url);
    const versionFolder = path.join(versionsDir, versionId);
    await ensureDir(versionFolder);
    const versionJsonPath = path.join(versionFolder, `${versionId}.json`);
    await fsp.writeFile(versionJsonPath, JSON.stringify(versionMeta, null, 2), "utf8");

    const byteCounter = { done: 0, total: 0 };
    const trackChunk = (delta) => {
      if (!delta || !Number.isFinite(delta)) return;
      byteCounter.done += delta;
      const fraction = byteCounter.total > 0 ? Math.min(1, byteCounter.done / byteCounter.total) : 0;
      const progress = baseProgress + Math.round((maxProgress - baseProgress) * fraction);
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
        message: "Descargando client.jar...",
        run: () => downloadFileWithVerify(client.url, clientPath, {
          sha1: client.sha1,
          size: client.size,
          onProgress: (p) => trackChunk(p.bytes || 0),
          signal,
        }),
      });
    }

    const libraries = Array.isArray(versionMeta.libraries) ? versionMeta.libraries : [];
    for (const lib of libraries) {
      if (!applyRuleSet(lib.rules, "windows")) continue;
      const artifact = lib.downloads?.artifact;
      if (artifact?.url && artifact?.path) {
        const dest = path.join(librariesDir, artifact.path);
        byteCounter.total += Number(artifact.size || 0);
        tasks.push({
          phase: "libraries",
          message: "Descargando librerías...",
          run: () => downloadFileWithVerify(artifact.url, dest, {
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
            message: "Descargando librerías...",
            run: () => downloadFileWithVerify(url, dest, {
              onProgress: (p) => trackChunk(p.bytes || 0),
              signal,
            }),
          });
        }
      }

      const classifiers = lib.downloads?.classifiers;
      const natives = lib.natives?.windows;
      if (classifiers && natives && classifiers[natives]) {
        const n = classifiers[natives];
        const dest = path.join(librariesDir, n.path);
        byteCounter.total += Number(n.size || 0);
        tasks.push({
          phase: "natives",
          message: "Descargando nativos...",
          run: () => downloadFileWithVerify(n.url, dest, {
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
          const indexJson = JSON.parse(await fsp.readFile(assetIndexPath, "utf8"));
          const objects = indexJson && indexJson.objects ? indexJson.objects : {};
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
      if (signal && signal.aborted) throw new Error("Instalación cancelada.");
      const t = tasks[i];
      const ratio = tasks.length > 0 ? i / tasks.length : 0;
      const p = baseProgress + Math.round((maxProgress - baseProgress) * ratio);
      this.emitInstallUpdate(installId, { phase: t.phase, progress: p, message: t.message });
      await t.run();
    }

    this.emitInstallUpdate(installId, { phase: "finalizing", progress: maxProgress, message: `Instalación ${versionId} completada.` });
  }

  async launchGame({ versionId = "", username = "Player", authMode = "offline", javaPath = "", minMemoryMb = 1024, maxMemoryMb = 2048 } = {}) {
    const cleanVersion = String(versionId || "").trim();
    if (!cleanVersion) return { ok: false, error: "Versión requerida para lanzar." };
    if (authMode === "microsoft") {
      return { ok: false, error: "Microsoft OAuth aún no implementado en esta build." };
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
    const versionMeta = resolved.mergedMeta;
    const libraries = Array.isArray(versionMeta.libraries) ? versionMeta.libraries : [];
    const librariesDir = path.join(minecraftDir, "libraries");

    const classpathEntries = [];
    const nativeJarPaths = [];
    for (const lib of libraries) {
      if (!applyRuleSet(lib.rules, "windows")) continue;
      if (lib.downloads?.artifact?.path) {
        classpathEntries.push(path.join(librariesDir, lib.downloads.artifact.path));
      } else if (lib.name) {
        const rel = toArtifactPath(lib.name);
        if (rel) classpathEntries.push(path.join(librariesDir, rel));
      }
      const classifiers = lib.downloads?.classifiers;
      const natives = lib.natives?.windows;
      if (classifiers && natives && classifiers[natives]?.path) {
        nativeJarPaths.push(path.join(librariesDir, classifiers[natives].path));
      }
    }
    if (!(await fileExists(resolved.clientJarPath))) {
      return { ok: false, error: `No se encontró client.jar para ${cleanVersion} ni su cadena inheritsFrom.` };
    }
    classpathEntries.push(resolved.clientJarPath);

    const assetIndexId = versionMeta?.assetIndex?.id || cleanVersion;
    const versionFolder = resolved.chain[0].folder;
    const nativesDir = path.join(versionFolder, `natives-${Date.now()}`);
    await ensureDir(nativesDir);
    const nativeExtraction = await this.extractNativeJars(nativeJarPaths, nativesDir);
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
      game_directory: minecraftDir,
      assets_root: path.join(minecraftDir, "assets"),
      assets_index_name: assetIndexId,
      auth_uuid: "00000000000000000000000000000000",
      auth_access_token: "0",
      user_type: "legacy",
      version_type: String(versionMeta.type || "release"),
      user_properties: "{}",
      resolution_width: "1280",
      resolution_height: "720",
    };

    const jvmArgs = [`-Xms${Math.max(512, Number(minMemoryMb) || 1024)}M`, `-Xmx${Math.max(1024, Number(maxMemoryMb) || 2048)}M`];
    if (Array.isArray(versionMeta.arguments?.jvm)) {
      for (const entry of versionMeta.arguments.jvm) {
        if (typeof entry === "string") {
          jvmArgs.push(formatJvmRuleArg(entry, replacements));
        } else if (entry && applyRuleSet(entry.rules, "windows")) {
          const val = entry.value;
          if (Array.isArray(val)) {
            for (const v of val) jvmArgs.push(formatJvmRuleArg(v, replacements));
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
    if (!mainClass) return { ok: false, error: "mainClass no encontrado en la versión." };

    const gameArgs = [];
    if (Array.isArray(versionMeta.arguments?.game)) {
      for (const entry of versionMeta.arguments.game) {
        if (typeof entry === "string") {
          gameArgs.push(formatJvmRuleArg(entry, replacements));
        } else if (entry && applyRuleSet(entry.rules, "windows")) {
          const val = entry.value;
          if (Array.isArray(val)) {
            for (const v of val) gameArgs.push(formatJvmRuleArg(v, replacements));
          } else if (typeof val === "string") {
            gameArgs.push(formatJvmRuleArg(val, replacements));
          }
        }
      }
    } else if (typeof versionMeta.minecraftArguments === "string") {
      gameArgs.push(...versionMeta.minecraftArguments.split(" ").map((x) => formatJvmRuleArg(x, replacements)));
    }

    const finalJvmArgs = jvmArgs.map((x) => formatJvmRuleArg(x, replacements));
    const args = [...finalJvmArgs, mainClass, ...gameArgs];
    const javaStrategy = await this.buildJavaCandidates({ preferredPath: javaPath, versionId: cleanVersion });
    const tried = [];

    for (const javaExec of javaStrategy.candidates) {
      tried.push(javaExec);
      const started = await this.tryLaunchProcess({ javaExec, args, minecraftDir });
      if (started.ok) {
        this.lastGameStatus.javaPathTried = [...tried];
        this.lastGameStatus.javaPathSelected = javaExec;
        this.lastGameStatus.updatedAt = Date.now();
        return { ok: true, status: "started", pid: started.pid, javaPath: javaExec, javaPathTried: tried };
      }
      this.lastGameStatus.lastError = started.error || "Fallo de arranque.";
      this.lastGameStatus.updatedAt = Date.now();
    }

    const recent = this.lastGameStatus.lastLines.slice(-12).join("\n");
    return {
      ok: false,
      error: `No se pudo iniciar Minecraft. Java recomendado: ${javaStrategy.recommendedMajor}.`,
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

  async extractNativeJars(nativeJarPaths, nativesDir) {
    const jars = Array.isArray(nativeJarPaths) ? nativeJarPaths : [];
    for (const jarPath of jars) {
      if (!(await fileExists(jarPath))) continue;
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
          `  $target = Join-Path '${nativesDir.replace(/'/g, "''")}' $entry.Name`,
          "  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)",
          "}",
          "$zip.Dispose()",
        ].join("; ");
        const ps = spawnSync("powershell", ["-NoProfile", "-Command", psCommand], { encoding: "utf8" });
        if (ps.status !== 0) {
          const stderr = String(ps.stderr || "").trim();
          throw new Error(`No se pudieron extraer nativos desde ${jarPath}. ${stderr || ""}`.trim());
        }
      } finally {
        await fsp.rm(tmpZipPath, { force: true }).catch(() => {});
      }
    }
    const files = await fsp.readdir(nativesDir).catch(() => []);
    const hasDll = files.some((f) => String(f).toLowerCase().endsWith(".dll"));
    if (!hasDll) return { ok: false, error: "Nativos no extraídos: no se encontraron DLLs en runtime nativo." };
    return { ok: true };
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
      javaPathSelected: javaExec,
      javaPathTried: this.lastGameStatus?.javaPathTried || [],
      updatedAt: Date.now(),
    };

    const pushLine = (prefix, raw) => {
      const lines = String(raw || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
      for (const ln of lines) {
        this.lastGameStatus.lastLines.push(`${prefix}${ln}`);
      }
      if (this.lastGameStatus.lastLines.length > 120) {
        this.lastGameStatus.lastLines.splice(0, this.lastGameStatus.lastLines.length - 120);
      }
      this.lastGameStatus.updatedAt = Date.now();
    };

    if (child.stdout) child.stdout.on("data", (d) => pushLine("", d.toString("utf8")));
    if (child.stderr) child.stderr.on("data", (d) => pushLine("[ERR] ", d.toString("utf8")));

    child.on("close", (code) => {
      this.runningGameProcess = null;
      this.lastGameStatus.running = false;
      this.lastGameStatus.lastExitCode = Number.isFinite(code) ? code : null;
      this.lastGameStatus.updatedAt = Date.now();
    });

    child.on("error", (error) => {
      this.runningGameProcess = null;
      this.lastGameStatus.running = false;
      this.lastGameStatus.lastError = String(error?.message || error || "Error al iniciar Java.");
      this.lastGameStatus.updatedAt = Date.now();
    });

    return new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      child.once("error", (err) => finish({ ok: false, error: String(err?.message || err || "Error al iniciar Java.") }));
      child.once("close", (code) => {
        const recent = this.lastGameStatus.lastLines.slice(-12).join("\n");
        finish({ ok: false, error: `El proceso Java terminó con código ${code}. ${recent}`.trim() });
      });
      setTimeout(() => finish({ ok: true, pid: child.pid, status: "stable" }), 6500);
    });
  }

  getGameRuntimeStatus() {
    return {
      ok: true,
      running: Boolean(this.lastGameStatus?.running),
      pid: this.lastGameStatus?.pid || null,
      lastExitCode: this.lastGameStatus?.lastExitCode ?? null,
      lastError: this.lastGameStatus?.lastError || "",
      lastErrorLines: Array.isArray(this.lastGameStatus?.lastLines) ? this.lastGameStatus.lastLines.slice(-12).join("\n") : "",
      javaPathTried: Array.isArray(this.lastGameStatus?.javaPathTried) ? this.lastGameStatus.javaPathTried : [],
      javaPathSelected: this.lastGameStatus?.javaPathSelected || "",
      updatedAt: this.lastGameStatus?.updatedAt || Date.now(),
    };
  }

  async isVersionInstalled({ source = "vanilla", versionId = "", loaderVersion = "" } = {}) {
    const cleanSource = String(source || "vanilla").toLowerCase();
    const cleanVersion = String(versionId || "").trim();
    const cleanLoader = String(loaderVersion || "").trim();
    if (!cleanVersion) return { ok: false, installed: false, error: "Version requerida." };

    const minecraftDir = this.getMinecraftDir();
    const versionsDir = path.join(minecraftDir, "versions");

    if (cleanSource === "vanilla") {
      const versionFolder = path.join(versionsDir, cleanVersion);
      const versionJsonPath = path.join(versionFolder, `${cleanVersion}.json`);
      const versionJarPath = path.join(versionFolder, `${cleanVersion}.jar`);
      const installed = (await fileExists(versionJsonPath)) && (await fileExists(versionJarPath));
      return { ok: true, installed };
    }

    if (cleanSource === "fabric") {
      if (!cleanLoader) return { ok: true, installed: false, reason: "missing_loader_version" };
      const profileId = `fabric-loader-${cleanLoader}-${cleanVersion}`;
      const profileFolder = path.join(versionsDir, profileId);
      const profileJsonPath = path.join(profileFolder, `${profileId}.json`);
      const baseFolder = path.join(versionsDir, cleanVersion);
      const baseJsonPath = path.join(baseFolder, `${cleanVersion}.json`);
      const baseJarPath = path.join(baseFolder, `${cleanVersion}.jar`);
      const installed =
        (await fileExists(profileJsonPath)) &&
        (await fileExists(baseJsonPath)) &&
        (await fileExists(baseJarPath));
      return { ok: true, installed, profileId };
    }

    if (cleanSource === "forge") {
      return { ok: true, installed: false, reason: "forge_not_supported_yet" };
    }

    return { ok: false, installed: false, error: `Fuente no soportada: ${cleanSource}` };
  }

  getAuthSession() {
    const cfg = this.loadConfig() || {};
    return { ok: true, session: cfg?.auth?.microsoft || null };
  }

  msLogin() {
    return { ok: false, error: "Microsoft OAuth pendiente de implementación en esta build." };
  }

  msLogout() {
    const cfg = this.loadConfig() || {};
    if (!cfg.auth) cfg.auth = {};
    cfg.auth.microsoft = null;
    this.saveConfig(cfg);
    return { ok: true };
  }
}

module.exports = { GameLauncherService };
