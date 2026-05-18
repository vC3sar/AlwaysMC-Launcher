var launcherAPI = window.launcherAPI || null;

const launcherBgVideo = document.getElementById("launcher-bg-video");
const bgVideoModeSelect = document.getElementById("bg-video-mode-select");
const launcherMenuAudio = document.getElementById("launcher-menu-audio");
const launcherAudioToggle = document.getElementById("launcher-audio-toggle");
const launcherStatus = document.getElementById("launcher-status");
const launcherMainMenu = document.getElementById("launcher-main-menu");
const launcherPlayView = document.getElementById("launcher-play-view");
const launcherConfigView = document.getElementById("launcher-config-view");
const launcherInfoView = document.getElementById("launcher-info-view");

let gameStarted = false;
let menuAudioMuted = false;
let menuAudioPlayPromise = null;
let menuAudioUnlockBound = false;
let currentBgVideoMode = "auto";
let currentBgVideoSrc = "";

const BG_1080_SRC = "mp4/menu-main.mp4";
const BG_2K_SRC = "mp4/2k-menu-main.mp4";
const BG_4K_SRC = "mp4/4k-main-menu.mp4";

function revealWindowWhenMenuReady() {
  document.body.style.visibility = "visible";
  if (launcherAPI && typeof launcherAPI.menuReady === "function") {
    launcherAPI.menuReady().catch(() => {});
  }
}

function chooseBackgroundSource(mode) {
  if (mode === "1080p") return BG_1080_SRC;
  if (mode === "2k") return BG_2K_SRC;
  if (mode === "4k") return BG_4K_SRC;

  const fullScreen = Boolean(document.fullscreenElement) || Boolean(window.matchMedia("(display-mode: fullscreen)").matches);
  const width = Math.max(window.innerWidth || 0, window.screen?.width || 0);
  const height = Math.max(window.innerHeight || 0, window.screen?.height || 0);
  if (fullScreen || width > 2560 || height > 1440) return BG_4K_SRC;
  if (width > 1920 || height > 1080) return BG_2K_SRC;
  return BG_1080_SRC;
}

function applyLauncherBackgroundVideo(mode = currentBgVideoMode) {
  if (!launcherBgVideo) return;
  const normalized = ["auto", "1080p", "2k", "4k"].includes(String(mode)) ? String(mode) : "auto";
  currentBgVideoMode = normalized;
  const selected = chooseBackgroundSource(normalized);
  if (selected === currentBgVideoSrc) return;
  currentBgVideoSrc = selected;
  launcherBgVideo.src = selected;
  launcherBgVideo.load();
  launcherBgVideo.play().catch(() => {});
}

function startMenuAudio(force = false) {
  if (!launcherMenuAudio || gameStarted) return;
  if (!force && menuAudioMuted) return;
  if (menuAudioPlayPromise) return;

  launcherMenuAudio.muted = menuAudioMuted;
  launcherMenuAudio.volume = 0.35;
  menuAudioPlayPromise = launcherMenuAudio.play()
    .catch((error) => {
      console.warn("[Launcher Audio] autoplay bloqueado:", error?.message || error);
    })
    .finally(() => {
      menuAudioPlayPromise = null;
    });
}

function setupMenuAudioUnlockListeners() {
  if (menuAudioUnlockBound) return;
  menuAudioUnlockBound = true;

  const events = ["pointerdown", "click", "keydown", "touchstart"];
  const unlock = () => {
    startMenuAudio(true);
    events.forEach((eventName) => document.removeEventListener(eventName, unlock, true));
  };

  events.forEach((eventName) => document.addEventListener(eventName, unlock, true));
}

function updateMenuAudioToggle() {
  if (!launcherAudioToggle || !launcherMenuAudio) return;
  launcherMenuAudio.muted = menuAudioMuted;
  launcherAudioToggle.innerHTML = `<i data-lucide="${menuAudioMuted ? "volume-x" : "volume-2"}"></i>`;
  launcherAudioToggle.setAttribute("aria-label", menuAudioMuted ? "Activar música" : "Silenciar música");
  launcherAudioToggle.setAttribute("title", menuAudioMuted ? "Activar música" : "Silenciar música");
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons({ icons: window.lucide.icons, attrs: { width: 17, height: 17, "stroke-width": 2.2 } });
  }
}

function setLauncherStatus(text, isError = false) {
  launcherStatus.textContent = text || "";
  launcherStatus.dataset.kind = isError ? "error" : "ok";
}

function showLauncherView(view) {
  startMenuAudio();
  launcherMainMenu.style.display = view === "main" ? "flex" : "none";
  launcherPlayView.classList.toggle("visible", view === "play");
  launcherConfigView.classList.toggle("visible", view === "config");
  launcherInfoView.classList.toggle("visible", view === "info");
  setLauncherStatus("");
}

function loadConfigIntoForm(cfg) {
  const config = cfg && typeof cfg === "object" ? cfg : {};
  const launcher = config.launcher && typeof config.launcher === "object" ? config.launcher : {};
  const versions = Array.isArray(launcher.preferredVersions) ? launcher.preferredVersions : [];

  document.getElementById("cfg-client-id").value = String(config.clientId || "");
  const versionsSet = new Set(versions.map((v) => String(v).trim()).filter(Boolean));
  const versionsSelect = document.getElementById("cfg-preferred-versions");
  Array.from(versionsSelect.options).forEach((option) => { option.selected = versionsSet.has(option.value); });

  document.getElementById("cfg-reconnect-delay").value = String(launcher.reconnectDelayMs ?? 650);
  document.getElementById("cfg-velocity-compat").checked = Boolean(launcher.velocityCompatMode);
  document.getElementById("cfg-debug-lifecycle").checked = Boolean(launcher.debugLifecycle);
  document.getElementById("cfg-verbose-mode").value = String(launcher.verboseMode || "app").toLowerCase() === "all" ? "all" : "app";
  document.getElementById("cfg-auth-recovery-window").value = String(launcher.authRecoveryWindowMs ?? 30000);
  document.getElementById("cfg-max-reconnect-attempts").value = String(launcher.maxReconnectAttempts ?? 6);
  document.getElementById("cfg-reconnect-backoff-max").value = String(launcher.reconnectBackoffMaxMs ?? 4000);
  document.getElementById("cfg-reconnect-jitter").value = String(launcher.reconnectJitterRatio ?? 0.2);
}

function buildConfigFromForm() {
  const versionsSelect = document.getElementById("cfg-preferred-versions");
  const preferredVersions = Array.from(versionsSelect.selectedOptions).map((opt) => String(opt.value).trim()).filter(Boolean);

  return {
    clientId: String(document.getElementById("cfg-client-id").value || "").trim(),
    launcher: {
      preferredVersions,
      velocityCompatMode: Boolean(document.getElementById("cfg-velocity-compat").checked),
      debugLifecycle: Boolean(document.getElementById("cfg-debug-lifecycle").checked),
      verboseMode: String(document.getElementById("cfg-verbose-mode").value || "app").toLowerCase() === "all" ? "all" : "app",
      reconnectDelayMs: Number.parseInt(document.getElementById("cfg-reconnect-delay").value || "650", 10) || 650,
      authRecoveryWindowMs: Number.parseInt(document.getElementById("cfg-auth-recovery-window").value || "30000", 10) || 30000,
      maxReconnectAttempts: Number.parseInt(document.getElementById("cfg-max-reconnect-attempts").value || "6", 10) || 6,
      reconnectBackoffMaxMs: Number.parseInt(document.getElementById("cfg-reconnect-backoff-max").value || "4000", 10) || 4000,
      reconnectJitterRatio: Number.parseFloat(document.getElementById("cfg-reconnect-jitter").value || "0.2") || 0.2,
      menuBackgroundMode: bgVideoModeSelect ? bgVideoModeSelect.value : "auto",
    },
  };
}

async function openConfigView() {
  showLauncherView("config");
  if (!launcherAPI) return;
  const cfg = await launcherAPI.getConfig();
  const configuredMode = String(cfg?.launcher?.menuBackgroundMode || "auto").toLowerCase();
  currentBgVideoMode = ["auto", "1080p", "2k", "4k"].includes(configuredMode) ? configuredMode : "auto";
  if (bgVideoModeSelect) bgVideoModeSelect.value = currentBgVideoMode;
  loadConfigIntoForm(cfg || {});
}

async function openInfoView() {
  showLauncherView("info");
  if (!launcherAPI) return;
  const info = await launcherAPI.getInfo();
  const text = [`App: ${info.name}`, `Version: ${info.version}`, "", "Creditos:", ...(Array.isArray(info.credits) ? info.credits.map((line) => `- ${line}`) : []), "", "Funcionamiento:", info.about || ""].join("\n");
  document.getElementById("info-content").textContent = text;
}

async function toggleFullscreenMode() {
  if (!launcherAPI || typeof launcherAPI.toggleFullscreen !== "function") return;
  const state = await launcherAPI.toggleFullscreen();
  const btn = document.getElementById("menu-fullscreen-btn");
  if (btn && state?.ok) btn.textContent = state.isFullscreen ? "Salir de pantalla completa (F11)" : "Pantalla completa (F11)";
}

function startPanelSession() {
  if (gameStarted) return;
  gameStarted = true;
  if (launcherMenuAudio) {
    launcherMenuAudio.pause();
    launcherMenuAudio.currentTime = 0;
  }
  window.location.href = "app.html";
}

async function bootContinue() {
  if (!launcherAPI) return startPanelSession();
  setLauncherStatus("Iniciando ultima sesion...");
  const result = await launcherAPI.startContinue();
  if (!result?.ok) return setLauncherStatus(result?.error || "No se pudo iniciar.", true);
  startPanelSession();
}

async function bootNewProfile() {
  if (!launcherAPI) return startPanelSession();
  const payload = {
    username: document.getElementById("new-username").value.trim(),
    ip: document.getElementById("new-ip").value.trim(),
    port: document.getElementById("new-port").value.trim(),
    version: document.getElementById("new-version").value.trim(),
  };
  setLauncherStatus("Creando perfil y arrancando bot...");
  const result = await launcherAPI.startNew(payload);
  if (!result?.ok) return setLauncherStatus(result?.error || "No se pudo crear el perfil.", true);
  startPanelSession();
}

function bindClick(id, handler) {
  const node = document.getElementById(id);
  if (!node) return;
  node.addEventListener("click", handler);
}

function initLauncherMenu() {
  bindClick("menu-play-btn", async () => {
    showLauncherView("play");
    if (launcherAPI) {
      const last = await launcherAPI.getLastProfile();
      if (last) {
        document.getElementById("new-username").value = last.username || "";
        document.getElementById("new-ip").value = last.ip || "";
        document.getElementById("new-port").value = String(last.port || 25565);
        document.getElementById("new-version").value = last.version || "";
      }
    }
  });

  bindClick("menu-config-btn", openConfigView);
  bindClick("menu-info-btn", openInfoView);
  bindClick("menu-fullscreen-btn", toggleFullscreenMode);
  bindClick("play-back-btn", () => showLauncherView("main"));
  bindClick("config-back-btn", () => showLauncherView("main"));
  bindClick("info-back-btn", () => showLauncherView("main"));
  bindClick("continue-last-btn", bootContinue);
  bindClick("create-new-btn", () => document.getElementById("new-profile-form").classList.remove("hidden"));
  bindClick("start-new-profile-btn", bootNewProfile);
  bindClick("save-config-btn", async () => {
    if (!launcherAPI) return;
    try {
      const parsed = buildConfigFromForm();
      const result = await launcherAPI.saveConfig(parsed);
      if (!result?.ok) return setLauncherStatus(result?.error || "No se pudo guardar.", true);
      currentBgVideoMode = String(parsed.launcher.menuBackgroundMode || "auto").toLowerCase();
      applyLauncherBackgroundVideo(currentBgVideoMode);
      setLauncherStatus("config.json guardado.");
    } catch {
      setLauncherStatus("JSON invalido en configuracion.", true);
    }
  });

  if (bgVideoModeSelect) bgVideoModeSelect.addEventListener("change", () => applyLauncherBackgroundVideo(bgVideoModeSelect.value));
  showLauncherView("main");
}

initLauncherMenu();

if (launcherAudioToggle) {
  launcherAudioToggle.addEventListener("click", () => {
    menuAudioMuted = !menuAudioMuted;
    updateMenuAudioToggle();
    if (!menuAudioMuted) startMenuAudio(true);
  });
}
updateMenuAudioToggle();
startMenuAudio();
setupMenuAudioUnlockListeners();

if (launcherAPI) {
  launcherAPI.getConfig().then((cfg) => {
    const mode = String(cfg?.launcher?.menuBackgroundMode || "auto").toLowerCase();
    currentBgVideoMode = ["auto", "1080p", "2k", "4k"].includes(mode) ? mode : "auto";
    if (bgVideoModeSelect) bgVideoModeSelect.value = currentBgVideoMode;
    applyLauncherBackgroundVideo(currentBgVideoMode);
  }).catch(() => applyLauncherBackgroundVideo("auto"));
} else {
  applyLauncherBackgroundVideo("auto");
}

if (launcherBgVideo) {
  window.addEventListener("resize", () => { if (currentBgVideoMode === "auto") applyLauncherBackgroundVideo("auto"); });
  document.addEventListener("fullscreenchange", () => { if (currentBgVideoMode === "auto") applyLauncherBackgroundVideo("auto"); });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "F11") {
    event.preventDefault();
    toggleFullscreenMode();
  }
});

if (launcherAPI && typeof launcherAPI.getFullscreen === "function") {
  launcherAPI.getFullscreen().then((state) => {
    const btn = document.getElementById("menu-fullscreen-btn");
    if (btn && state?.ok) btn.textContent = state.isFullscreen ? "Salir de pantalla completa (F11)" : "Pantalla completa (F11)";
  }).catch(() => {});
}

revealWindowWhenMenuReady();
