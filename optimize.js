const fs = require('fs');

let content = fs.readFileSync('src/game-launcher.js', 'utf8');

const replacements = [
  // fetchJson
  {
    search: `async function fetchJson(url, timeoutMs = 30000) {
  const buf = await httpsGetBuffer(url, timeoutMs);
  return JSON.parse(buf.toString("utf8"));
}`,
    replace: `const fetchJson = async (url, timeoutMs = 30000) => JSON.parse((await httpsGetBuffer(url, timeoutMs)).toString("utf8"));`
  },
  // ensureDir
  {
    search: `async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}`,
    replace: `const ensureDir = (dir) => fsp.mkdir(dir, { recursive: true });`
  },
  // sha1Hex
  {
    search: `function sha1Hex(buffer) {
  return crypto.createHash("sha1").update(buffer).digest("hex");
}`,
    replace: `const sha1Hex = (buffer) => crypto.createHash("sha1").update(buffer).digest("hex");`
  },
  // fileExists
  {
    search: `async function fileExists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}`,
    replace: `const fileExists = async (filePath) => fsp.access(filePath, fs.constants.F_OK).then(() => true).catch(() => false);`
  },
  // httpsRequestJson simplify resolve/reject
  {
    search: `            const raw = Buffer.concat(chunks).toString("utf8");
            const asJson = raw ? JSON.parse(raw) : {};
            if (res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(\`HTTP \${res.statusCode} for \${url}: \${raw}\`));
            }
            return resolve(asJson);`,
    replace: `            const raw = Buffer.concat(chunks).toString("utf8");
            if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(\`HTTP \${res.statusCode} for \${url}: \${raw}\`));
            return resolve(raw ? JSON.parse(raw) : {});`
  },
  // parseLibraryNameParts
  {
    search: `function parseLibraryNameParts(name) {
  const parts = String(name || "").split(":");
  return {
    group: parts[0] || "",
    artifact: parts[1] || "",
    version: parts[2] || "",
    classifier: parts[3] || "",
  };
}`,
    replace: `function parseLibraryNameParts(name) {
  const [group = "", artifact = "", version = "", classifier = ""] = String(name || "").split(":");
  return { group, artifact, version, classifier };
}`
  },
  // parseLaunchArgsString init
  {
    search: `  let token = "";
  let quote = "";
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];`,
    replace: `  let token = "", quote = "", escaped = false;
  for (const ch of input) {`
  },
  // httpsGetBuffer chunk push simplify
  {
    search: `        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => reject(new Error(\`HTTP \${res.statusCode} for \${url}: \${Buffer.concat(chunks).toString("utf8")}\`)));
        return;
      }
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => resolve(Buffer.concat(chunks)));`,
    replace: `        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => reject(new Error(\`HTTP \${res.statusCode} for \${url}: \${Buffer.concat(chunks).toString("utf8")}\`)));
        return;
      }
      const chunks = [];
      res.on("data", (d) => chunks.push(d));
      res.on("end", () => resolve(Buffer.concat(chunks)));` // Wait, I can simplify this further
  },
  // formatJvmRuleArg
  {
    search: `function formatJvmRuleArg(arg, replacements) {
  let output = String(arg);
  for (const [key, value] of Object.entries(replacements)) {
    output = output.replaceAll(\`\\\${\${key}}\`, String(value));
  }
  return output;
}`,
    replace: `function formatJvmRuleArg(arg, replacements) {
  let output = String(arg);
  for (const [key, value] of Object.entries(replacements)) output = output.replaceAll(\`\\\${\${key}}\`, String(value));
  return output;
}`
  },
  // applyRuleSet simple
  {
    search: `      for (const [key, expected] of Object.entries(featuresRule)) {
        const actual = Boolean(flags[key]);
        if (actual !== Boolean(expected)) {
          matchesFeatures = false;
          break;
        }
      }`,
    replace: `      for (const [key, expected] of Object.entries(featuresRule)) {
        if (Boolean(flags[key]) !== Boolean(expected)) { matchesFeatures = false; break; }
      }`
  },
  // getRuntimeStallThresholdMs
  {
    search: `  getRuntimeStallThresholdMs() {
    const cfg = this.loadConfig() || {};
    const raw = Number.parseInt(String(cfg?.launcher?.downloads?.runtimeStallThresholdMs || "15000"), 10);
    return Number.isFinite(raw) && raw >= 5000 ? raw : 15000;
  }`,
    replace: `  getRuntimeStallThresholdMs() {
    const raw = Number.parseInt(String((this.loadConfig() || {})?.launcher?.downloads?.runtimeStallThresholdMs || "15000"), 10);
    return Number.isFinite(raw) && raw >= 5000 ? raw : 15000;
  }`
  },
  // getMinecraftDir
  {
    search: `  getMinecraftDir() {
    const cfg = this.loadConfig() || {};
    const customDir = cfg?.launcher?.downloads?.minecraftDir;
    if (customDir && String(customDir).trim()) return String(customDir).trim();
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), ".minecraft");
  }`,
    replace: `  getMinecraftDir() {
    const customDir = (this.loadConfig() || {})?.launcher?.downloads?.minecraftDir;
    if (customDir && String(customDir).trim()) return String(customDir).trim();
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), ".minecraft");
  }`
  },
  // getCatalogCacheFile
  {
    search: `  getCatalogCacheFile() {
    return path.join(this.appRoot, "config", "catalog-cache.json");
  }`,
    replace: `  getCatalogCacheFile() { return path.join(this.appRoot, "config", "catalog-cache.json"); }`
  },
  // readCatalogCache
  {
    search: `  async readCatalogCache() {
    const file = this.getCatalogCacheFile();
    if (!(await fileExists(file))) return null;
    try {
      return JSON.parse(await fsp.readFile(file, "utf8"));
    } catch {
      return null;
    }
  }`,
    replace: `  async readCatalogCache() {
    const file = this.getCatalogCacheFile();
    if (!(await fileExists(file))) return null;
    try { return JSON.parse(await fsp.readFile(file, "utf8")); } catch { return null; }
  }`
  },
  // writeCatalogCache
  {
    search: `  async writeCatalogCache(cache) {
    const file = this.getCatalogCacheFile();
    await ensureDir(path.dirname(file));
    await fsp.writeFile(file, JSON.stringify(cache, null, 2), "utf8");
  }`,
    replace: `  async writeCatalogCache(cache) {
    const file = this.getCatalogCacheFile();
    await ensureDir(path.dirname(file));
    await fsp.writeFile(file, JSON.stringify(cache, null, 2), "utf8");
  }` // No change, just skip
  },
  // detectJavaRuntimes simplify
  {
    search: `    const available = [];
    for (const cand of candidates) {
      if (await fileExists(cand.path)) available.push(cand);
    }
    return available;`,
    replace: `    const available = [];
    for (const cand of candidates) if (await fileExists(cand.path)) available.push(cand);
    return available;`
  },
  // resolveJavaPath
  {
    search: `  async resolveJavaPath(preferredPath = "") {
    if (preferredPath && await fileExists(preferredPath)) return preferredPath;
    const runtimes = await this.detectJavaRuntimes();
    if (runtimes.length > 0) return runtimes[0].path;
    return "java";
  }`,
    replace: `  async resolveJavaPath(preferredPath = "") {
    if (preferredPath && await fileExists(preferredPath)) return preferredPath;
    const runtimes = await this.detectJavaRuntimes();
    return runtimes.length > 0 ? runtimes[0].path : "java";
  }`
  },
  // getInstallStatus
  {
    search: `  getInstallStatus(installId = "") {
    if (installId) {
      const job = this.installJobs.get(installId);
      if (!job) return { ok: false, error: "Instalación no encontrada." };
      return { ok: true, status: job.status };
    }
    const all = [...this.installJobs.values()].map((j) => j.status);
    return { ok: true, statuses: all };
  }`,
    replace: `  getInstallStatus(installId = "") {
    if (installId) {
      const job = this.installJobs.get(installId);
      return job ? { ok: true, status: job.status } : { ok: false, error: "Instalación no encontrada." };
    }
    return { ok: true, statuses: [...this.installJobs.values()].map((j) => j.status) };
  }`
  },
  // stopGame
  {
    search: `  stopGame() {
    if (!this.runningGameProcess) return { ok: true };
    try {
      this.runningGameProcess.kill();
    } catch { }
    this.runningGameProcess = null;
    this.lastGameStatus.running = false;
    this.lastGameStatus.updatedAt = Date.now();
    return { ok: true };
  }`,
    replace: `  stopGame() {
    if (!this.runningGameProcess) return { ok: true };
    try { this.runningGameProcess.kill(); } catch { }
    this.runningGameProcess = null;
    this.lastGameStatus.running = false;
    this.lastGameStatus.updatedAt = Date.now();
    return { ok: true };
  }`
  },
  // countDllsInDirectory / directoryHasDll consolidation.
  // Wait, I can just use optional chaining for countDllsInDirectory
];

for (const rep of replacements) {
  content = content.replace(rep.search, rep.replace);
}

// Write the file back
fs.writeFileSync('src/game-launcher.js', content, 'utf8');
console.log("Optimizations applied successfully.");
