const fs = require("fs");
const path = require("path");
const https = require("https");
const readline = require("readline");

const CONFIG_FILE = path.join(__dirname, "profiles.json");
const MANIFEST_URL = "https://launchermeta.mojang.com/mc/game/version_manifest.json";

// LIST VERIONS SUPPORTED BY MINEFLAYER
const MINEFLAYER_VERSIONS = ["1.16.5", "1.17.1", "1.18.2", "1.19.4", "1.20.1", "1.21.1","1.21.1", "1.21.4", "1.21.8"];

// --- Helpers ---
function fetchManifest() {
  return new Promise((resolve, reject) => {
    https.get(MANIFEST_URL, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

async function getReleases() {
  const manifest = await fetchManifest();
  return manifest.versions.filter(v =>
    v.type === "release" && parseFloat(v.id) >= 1.16
  );
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function loadProfile() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  }
  return null;
}

function saveProfile(profile) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(profile, null, 2));
}

// --- Lanzadores ---
function launchMinecraft(profile) {
  console.log(`🎮 Iniciando Minecraft GUI versión ${profile.version} con usuario ${profile.username}...`);
  // Aquí iría tu código de descarga de JAR + spawn con Java
}

function launchMineflayer(profile) {
  console.log(`🤖 Iniciando Mineflayer versión ${profile.version} con usuario ${profile.username} conectando al servidor: ${profile.ip}`);
  require("./minelight")(profile); // tu implementación
}

// --- Crear o modificar perfil ---
async function createProfile() {
  console.log("⚙️ Creación / modificación de perfil");

  const username = await prompt("Introduce un nombre de usuario (offline): ");
  const ip = await prompt("Introduce la IP del servidor (default: mc.haliacraft.com): ") || "mc.haliacraft.com";
  let mode;
  while (!["gui", "nogui"].includes(mode)) {
    mode = await prompt("¿Quieres usar 'gui' (Minecraft oficial) o 'nogui' (Mineflayer)? ");
  }

  let version;
  if (mode === "gui") {
    const releases = await getReleases();
    console.log("\n=== Versiones oficiales disponibles ===");
    releases.slice(0, 15).forEach((v, i) => console.log(`${i + 1}. ${v.id}`));

    let choice = parseInt(await prompt("Elige el número de la versión: "));
    version = releases[choice - 1]?.id || "1.20.1";
  } else {
    console.log("\n=== Versiones soportadas por Mineflayer ===");
    MINEFLAYER_VERSIONS.forEach((v, i) => console.log(`${i + 1}. ${v}`));

    let choice = parseInt(await prompt("Elige el número de la versión: "));
    version = MINEFLAYER_VERSIONS[choice - 1] || "1.20.1";
  }

  const profile = { username, mode, version, ip };
  saveProfile(profile);
  console.log(`✅ Perfil actualizado: ${JSON.stringify(profile, null, 2)}`);

  return profile;
}

// --- Main ---
(async () => {
  let profile = loadProfile();

  if (profile) {
    console.log(`⚙️ Perfil actual encontrado: ${profile.username} | ${profile.mode} | ${profile.version} | ${profile.ip}`);
    let ans = (await prompt("¿Quieres continuar con este perfil? (S/N): ")).toLowerCase();

    if (ans === "n" || ans === "no") {
      profile = await createProfile();
    }
  } else {
    profile = await createProfile();
  }

  // Lanzar según el modo
  if (profile.mode === "gui") {
    launchMinecraft(profile);
  } else {
    launchMineflayer(profile);
  }
})();
