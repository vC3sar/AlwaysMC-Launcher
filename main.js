const fs = require("fs");
const path = require("path");
const https = require("https");
const readline = require("readline");

const CONFIG_FILE = path.join(__dirname, "profiles.json");
const MANIFEST_URL = "https://launchermeta.mojang.com/mc/game/version_manifest.json";
const DEFAULT_SERVER = "mc.haliacraft.com";

// Versions that Mineflayer can handle in this launcher.
const MINEFLAYER_VERSIONS = [
  "1.16.5",
  "1.17.1",
  "1.18.2",
  "1.19.4",
  "1.20.1",
  "1.21.1",
  "1.21.4",
  "1.21.8",
];

// --- Helpers ---
function fetchManifest() {
  return new Promise((resolve, reject) => {
    https
      .get(MANIFEST_URL, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          reject(new Error(`Failed to fetch manifest: HTTP ${res.statusCode}`));
          return;
        }

        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function getSupportedVersions() {
  try {
    const manifest = await fetchManifest();
    const officialReleases = manifest.versions
      .filter(v => v.type === "release")
      .map(v => v.id);
    const compatible = officialReleases.filter(id => MINEFLAYER_VERSIONS.includes(id));

    return compatible.length > 0 ? compatible : [...MINEFLAYER_VERSIONS];
  } catch (error) {
    console.warn("⚠️ No se pudo leer el manifiesto de Mojang, usando versiones locales.");
    return [...MINEFLAYER_VERSIONS];
  }
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function loadProfile() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (error) {
    console.warn("⚠️ profiles.json no se pudo leer. Se creará un perfil nuevo.");
    return null;
  }
}

function saveProfile(profile) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...profile, mode: "nogui" }, null, 2));
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const username = String(profile.username ?? "").trim();
  const ip = String(profile.ip ?? DEFAULT_SERVER).trim() || DEFAULT_SERVER;
  const version = String(profile.version ?? "").trim() || "1.20.1";

  if (!username) {
    return null;
  }

  return {
    username,
    ip,
    version,
    mode: "nogui",
  };
}

// --- Lanzadores ---
function launchMineflayer(profile) {
  console.log(
    `🤖 Iniciando Minecraft offline/no premium con usuario ${profile.username} en versión ${profile.version}. Servidor: ${profile.ip}`
  );
  require("./minelight")(profile);
}

// --- Crear o modificar perfil ---
async function createProfile() {
  console.log("⚙️ Creación / modificación de perfil offline");

  let username = "";
  while (!username) {
    username = await prompt("Introduce un nickname de Minecraft (offline/no premium): ");
    if (!username) {
      console.log("⚠️ El nickname no puede estar vacío.");
    }
  }

  const ip = (await prompt(`Introduce la IP del servidor (default: ${DEFAULT_SERVER}): `)) || DEFAULT_SERVER;

  const versions = await getSupportedVersions();
  console.log("\n=== Versiones compatibles con este launcher ===");
  versions.slice(0, 15).forEach((v, i) => console.log(`${i + 1}. ${v}`));

  const choice = parseInt(await prompt("Elige el número de la versión: "), 10);
  const version = versions[choice - 1] || versions[0] || "1.20.1";

  const profile = { username, ip, version, mode: "nogui" };
  saveProfile(profile);
  console.log(`✅ Perfil actualizado: ${JSON.stringify(profile, null, 2)}`);

  return profile;
}

// --- Main ---
(async () => {
  let profile = normalizeProfile(loadProfile());

  if (profile) {
    console.log(
      `⚙️ Perfil actual encontrado: ${profile.username} | offline/no premium | ${profile.version} | ${profile.ip}`
    );
    const ans = (await prompt("¿Quieres continuar con este perfil? (S/N): ")).toLowerCase();

    if (ans === "n" || ans === "no") {
      profile = await createProfile();
    } else {
      saveProfile(profile);
    }
  } else {
    profile = await createProfile();
  }

  launchMineflayer(profile);
})();
