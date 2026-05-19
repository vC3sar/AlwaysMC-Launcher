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
const launcherControlsHint = document.getElementById("launcher-controls-hint");
const gameAuthModeSelect = document.getElementById("game-auth-mode");
const gameDistributionSelect = document.getElementById("game-distribution");
const gameVersionSelect = document.getElementById("game-version-select");
const gameUsernameInput = document.getElementById("game-username");
const gameJavaPathInput = document.getElementById("game-java-path");
const gameRefreshCatalogBtn = document.getElementById("game-refresh-catalog-btn");
const gameLaunchBtn = document.getElementById("game-launch-btn");
const gameStopBtn = document.getElementById("game-stop-btn");
const gameScanJavaBtn = document.getElementById("game-scan-java-btn");
const gameInstallStatus = document.getElementById("game-install-status");
const playTabBotBtn = document.getElementById("play-tab-bot");
const playTabJavaBtn = document.getElementById("play-tab-java");
const playTabBotPanel = document.getElementById("play-tab-panel-bot");
const playTabJavaPanel = document.getElementById("play-tab-panel-java");
const filterRelease = document.getElementById("filter-release");
const filterSnapshot = document.getElementById("filter-snapshot");
const filterOldBeta = document.getElementById("filter-old-beta");
const filterOldAlpha = document.getElementById("filter-old-alpha");
const gameVersionTypeFilters = document.getElementById("game-version-type-filters");

let gameStarted = false;
let menuAudioMuted = false;
let menuAudioPlayPromise = null;
let menuAudioUnlockBound = false;
let currentBgVideoMode = "auto";
let currentBgVideoSrc = "";
let currentLauncherView = "main";
let launcherViewHistory = ["main"];
let activeMainMenuIndex = 0;
let activeConfigIndex = 0;
let activePlayIndex = 0;
let activeInfoIndex = 0;
let gameCatalog = { vanilla: [], forge: [], fabric: [] };
let activeInstallId = "";
let installPollTimer = null;
let activePlayTab = "bot";
const versionTypeFilters = {
  release: true,
  snapshot: false,
  old_beta: false,
  old_alpha: false,
};
const MENU_AUDIO_MUTED_STORAGE_KEY = "launcher.menuAudioMuted";
const MAIN_MENU_BUTTON_IDS = ["menu-play-btn", "menu-config-btn", "menu-info-btn", "menu-fullscreen-btn", "menu-exit-btn"];

const BG_1080_SRC = "mp4/menu-main.mp4";
const BG_2K_SRC = "mp4/2k-menu-main.mp4";
const BG_4K_SRC = "mp4/4k-menu-main.mp4";

function revealWindowWhenMenuReady() {
  document.body.style.visibility = "visible";
  if (launcherAPI && typeof launcherAPI.menuReady === "function") {
    launcherAPI.menuReady().catch(() => { });
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
  launcherBgVideo.play().catch(() => { });
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

function loadMenuAudioMutedPreference() {
  try {
    return window.localStorage.getItem(MENU_AUDIO_MUTED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveMenuAudioMutedPreference() {
  try {
    window.localStorage.setItem(MENU_AUDIO_MUTED_STORAGE_KEY, String(menuAudioMuted));
  } catch {
    // Ignorar errores de almacenamiento.
  }
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

function setGameStatus(text, isError = false) {
  if (!gameInstallStatus) return;
  gameInstallStatus.textContent = text || "";
  gameInstallStatus.dataset.kind = isError ? "error" : "ok";
}

function getDistributionEntries() {
  const dist = String(gameDistributionSelect?.value || "vanilla");
  if (dist === "fabric") return gameCatalog.fabric || [];
  if (dist === "forge") return gameCatalog.forge || [];
  return gameCatalog.vanilla || [];
}

function getEntryVersionId(entry) {
  if (!entry || typeof entry !== "object") return "";
  if (entry.source === "fabric") return String(entry.gameVersion || "");
  if (entry.source === "forge") return String(entry.gameVersion || "");
  return String(entry.id || "");
}

function refreshVersionSelect() {
  if (!gameVersionSelect) return;
  const entries = applyVersionFilters(getDistributionEntries(), String(gameDistributionSelect?.value || "vanilla"), versionTypeFilters);
  const current = gameVersionSelect.value;
  gameVersionSelect.innerHTML = "";
  entries.forEach((entry) => {
    const option = document.createElement("option");
    const versionId = getEntryVersionId(entry);
    option.value = versionId;
    if (entry.source === "fabric") option.textContent = `${entry.gameVersion} | loader ${entry.loaderVersion}`;
    else if (entry.source === "forge") option.textContent = `${entry.gameVersion} | forge ${entry.forgeVersion} (${entry.channel})`;
    else option.textContent = `${entry.id} (${entry.type})`;
    option.dataset.source = entry.source || String(gameDistributionSelect.value || "vanilla");
    option.dataset.loaderVersion = entry.loaderVersion || "";
    option.dataset.type = entry.type || "";
    gameVersionSelect.appendChild(option);
  });
  if (current) gameVersionSelect.value = current;
  if (!gameVersionSelect.value && gameVersionSelect.options.length > 0) gameVersionSelect.selectedIndex = 0;
  if (gameVersionSelect.options.length === 0) {
    setGameStatus("Sin resultados para los filtros seleccionados.", true);
  }
}

function applyVersionFilters(entries, distribution, filters) {
  if (!Array.isArray(entries)) return [];
  const dist = String(distribution || "vanilla");
  if (dist !== "vanilla") return entries;
  return entries.filter((entry) => Boolean(filters[String(entry.type || "release")]));  
}

function syncVersionTypeFiltersUI() {
  if (filterRelease) filterRelease.checked = Boolean(versionTypeFilters.release);
  if (filterSnapshot) filterSnapshot.checked = Boolean(versionTypeFilters.snapshot);
  if (filterOldBeta) filterOldBeta.checked = Boolean(versionTypeFilters.old_beta);
  if (filterOldAlpha) filterOldAlpha.checked = Boolean(versionTypeFilters.old_alpha);
}

function updateFilterVisibilityByDistribution() {
  const dist = String(gameDistributionSelect?.value || "vanilla");
  const vanilla = dist === "vanilla";
  if (gameVersionTypeFilters) gameVersionTypeFilters.style.display = vanilla ? "grid" : "none";
  if (!vanilla) {
    setGameStatus("Filtros de tipo aplican solo a Vanilla.", false);
  }
}

function switchPlayTab(tab) {
  const normalized = tab === "java" ? "java" : "bot";
  activePlayTab = normalized;
  if (playTabBotBtn) {
    const active = normalized === "bot";
    playTabBotBtn.classList.toggle("active", active);
    playTabBotBtn.setAttribute("aria-selected", active ? "true" : "false");
  }
  if (playTabJavaBtn) {
    const active = normalized === "java";
    playTabJavaBtn.classList.toggle("active", active);
    playTabJavaBtn.setAttribute("aria-selected", active ? "true" : "false");
  }
  if (playTabBotPanel) playTabBotPanel.hidden = normalized !== "bot";
  if (playTabJavaPanel) playTabJavaPanel.hidden = normalized !== "java";
}

async function waitInstallCompletion(installId) {
  if (!launcherAPI || !installId) return { ok: false, error: "Instalación inválida." };
  while (true) {
    const statusRes = await launcherAPI.getInstallStatus(installId);
    if (!statusRes?.ok) return { ok: false, error: statusRes?.error || "No se pudo consultar instalación." };
    const st = statusRes.status || {};
    const pct = Number.isFinite(st.progress) ? `${Math.max(0, Math.min(100, Math.round(st.progress)))}%` : "";
    const msg = st.message || "Procesando...";
    setGameStatus(`[${st.phase || "working"}] ${pct} ${msg}`.trim(), st.phase === "error");
    if (!st.busy) {
      if (st.phase === "done") return { ok: true };
      return { ok: false, error: st.error || st.message || "La instalación no finalizó correctamente." };
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function ensureInstalledThenLaunch({ source, versionId, loaderVersion, authMode, username, javaPath }) {
  if (!launcherAPI) return { ok: false, error: "API no disponible." };
  if (source === "forge") return { ok: false, error: "Forge automático aún no está soportado en esta build." };

  let check = await launcherAPI.isVersionInstalled({ source, versionId, loaderVersion });
  if (!check?.ok) return { ok: false, error: check?.error || "No se pudo validar instalación." };

  if (!check.installed) {
    setGameStatus(`Instalando ${source}:${versionId} antes de lanzar...`);
    const installRes = await launcherAPI.installVersion({ source, versionId, loaderVersion, authMode });
    if (!installRes?.ok) return { ok: false, error: installRes?.error || "No se pudo iniciar instalación." };
    activeInstallId = installRes.installId || "";
    const waitRes = await waitInstallCompletion(activeInstallId);
    if (!waitRes.ok) return waitRes;
    check = await launcherAPI.isVersionInstalled({ source, versionId, loaderVersion });
    if (!check?.ok || !check?.installed) return { ok: false, error: check?.error || "Instalación no detectada tras completar." };
  }

  const launchVersionId = source === "fabric" && check?.profileId ? check.profileId : versionId;
  setGameStatus(`Lanzando ${launchVersionId}...`);
  const launchRes = await launcherAPI.launchGame({ versionId: launchVersionId, authMode, username, javaPath });
  if (!launchRes?.ok) return { ok: false, error: launchRes?.error || "No se pudo lanzar el juego." };
  return { ok: true, pid: launchRes.pid };
}

async function loadGameCatalog(forceRefresh = false) {
  if (!launcherAPI) return;
  setGameStatus(forceRefresh ? "Actualizando catálogo..." : "Cargando catálogo...");
  const result = forceRefresh ? await launcherAPI.refreshVersionCatalog() : await launcherAPI.getVersionCatalog();
  if (!result?.ok) {
    setGameStatus(result?.error || "No se pudo cargar el catálogo.", true);
    return;
  }
  gameCatalog = result.catalog || { vanilla: [], forge: [], fabric: [] };
  refreshVersionSelect();
  const warning = result.warning ? ` (warning: ${result.warning})` : "";
  setGameStatus(`Catálogo listo: ${gameCatalog.vanilla.length} vanilla, ${gameCatalog.fabric.length} fabric, ${gameCatalog.forge.length} forge${warning}`);
}

function stopInstallPolling() {
  if (installPollTimer) {
    clearInterval(installPollTimer);
    installPollTimer = null;
  }
}

function startInstallPolling() {
  stopInstallPolling();
  if (!activeInstallId || !launcherAPI) return;
  installPollTimer = setInterval(async () => {
    const statusRes = await launcherAPI.getInstallStatus(activeInstallId);
    if (!statusRes?.ok) return;
    const st = statusRes.status || {};
    const pct = Number.isFinite(st.progress) ? `${Math.max(0, Math.min(100, Math.round(st.progress)))}%` : "";
    const msg = st.message || "Procesando...";
    setGameStatus(`[${st.phase || "working"}] ${pct} ${msg}`.trim(), st.phase === "error");
    if (!st.busy) stopInstallPolling();
  }, 1000);
}

function getMainMenuButtons() {
  return MAIN_MENU_BUTTON_IDS.map((id) => document.getElementById(id)).filter(Boolean);
}

function setMainMenuSelection(index) {
  const buttons = getMainMenuButtons();
  if (!buttons.length) return;
  const normalized = ((index % buttons.length) + buttons.length) % buttons.length;
  activeMainMenuIndex = normalized;
  buttons.forEach((button, idx) => button.classList.toggle("nav-active", idx === normalized));
  buttons[normalized].focus({ preventScroll: true });
}

function setLauncherMainMenuControlsVisible(visible) {
  if (!launcherControlsHint) return;
  launcherControlsHint.classList.toggle("visible", Boolean(visible));
}

function getConfigNavigableElements() {
  if (!launcherConfigView) return [];
  return Array.from(launcherConfigView.querySelectorAll("input, select, button")).filter((element) => {
    if (element.disabled) return false;
    if (element.type === "hidden") return false;
    return element.offsetParent !== null;
  });
}

function setConfigSelection(index) {
  const elements = getConfigNavigableElements();
  if (!elements.length) return;
  const normalized = ((index % elements.length) + elements.length) % elements.length;
  activeConfigIndex = normalized;
  elements.forEach((element, idx) => element.classList.toggle("launcher-nav-active", idx === normalized));
  const target = elements[normalized];
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

function getPlayNavigableElements() {
  if (!launcherPlayView) return [];
  return Array.from(launcherPlayView.querySelectorAll("input, select, button")).filter((element) => {
    if (element.disabled) return false;
    if (element.type === "hidden") return false;
    return element.offsetParent !== null;
  });
}

function setPlaySelection(index) {
  const elements = getPlayNavigableElements();
  if (!elements.length) return;
  const normalized = ((index % elements.length) + elements.length) % elements.length;
  activePlayIndex = normalized;
  elements.forEach((element, idx) => element.classList.toggle("launcher-nav-active", idx === normalized));
  const target = elements[normalized];
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

function getInfoNavigableElements() {
  if (!launcherInfoView) return [];
  return Array.from(launcherInfoView.querySelectorAll("button")).filter((element) => {
    if (element.disabled) return false;
    return element.offsetParent !== null;
  });
}

function setInfoSelection(index) {
  const elements = getInfoNavigableElements();
  if (!elements.length) return;
  const normalized = ((index % elements.length) + elements.length) % elements.length;
  activeInfoIndex = normalized;
  elements.forEach((element, idx) => element.classList.toggle("launcher-nav-active", idx === normalized));
  const target = elements[normalized];
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

function showLauncherView(view, options = {}) {
  const fromHistory = Boolean(options.fromHistory);
  const previousView = currentLauncherView;
  if (!fromHistory) {
    if (view === "main") {
      launcherViewHistory = ["main"];
    } else if (previousView !== view) {
      launcherViewHistory.push(view);
    }
  }
  currentLauncherView = view;
  startMenuAudio();
  launcherMainMenu.style.display = view === "main" ? "flex" : "none";
  const launcherShell = document.querySelector(".launcher-shell");
  if (launcherShell) launcherShell.classList.toggle("main-compact", view === "main");
  launcherPlayView.classList.toggle("visible", view === "play");
  launcherConfigView.classList.toggle("visible", view === "config");
  launcherInfoView.classList.toggle("visible", view === "info");
  setLauncherMainMenuControlsVisible(view === "main" || view === "play" || view === "config" || view === "info");
  if (view === "main") {
    setMainMenuSelection(0);
  } else {
    getMainMenuButtons().forEach((button) => button.classList.remove("nav-active"));
  }
  if (view === "config") {
    setConfigSelection(0);
  } else {
    getConfigNavigableElements().forEach((element) => element.classList.remove("launcher-nav-active"));
  }
  if (view === "play") {
    setPlaySelection(0);
  } else {
    getPlayNavigableElements().forEach((element) => element.classList.remove("launcher-nav-active"));
  }
  if (view === "info") {
    setInfoSelection(0);
  } else {
    getInfoNavigableElements().forEach((element) => element.classList.remove("launcher-nav-active"));
  }
  setLauncherStatus("");
}

function goBackLauncherView() {
  if (currentLauncherView === "play") {
    const newProfileForm = document.getElementById("new-profile-form");
    if (newProfileForm && !newProfileForm.classList.contains("hidden")) {
      newProfileForm.classList.add("hidden");
      return;
    }
  }

  if (launcherViewHistory.length > 1) {
    launcherViewHistory.pop();
    const previousView = launcherViewHistory[launcherViewHistory.length - 1] || "main";
    showLauncherView(previousView, { fromHistory: true });
    return;
  }

  showLauncherView("main", { fromHistory: true });
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

function buildMergedConfig(baseConfig) {
  const base = baseConfig && typeof baseConfig === "object" ? baseConfig : {};
  const next = buildConfigFromForm();
  const launcherBase = base.launcher && typeof base.launcher === "object" ? base.launcher : {};
  const launcherNext = next.launcher && typeof next.launcher === "object" ? next.launcher : {};
  return {
    ...base,
    clientId: next.clientId,
    launcher: {
      ...launcherBase,
      ...launcherNext,
      downloads: {
        ...(launcherBase.downloads && typeof launcherBase.downloads === "object" ? launcherBase.downloads : {}),
        javaPath: String(gameJavaPathInput?.value || launcherBase?.downloads?.javaPath || "").trim(),
      },
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

async function quitApplication() {
  if (!launcherAPI || typeof launcherAPI.quitApp !== "function") return;
  await launcherAPI.quitApp();
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
    switchPlayTab(activePlayTab);
    if (launcherAPI) {
      const last = await launcherAPI.getLastProfile();
      if (last) {
        document.getElementById("new-username").value = last.username || "";
        document.getElementById("new-ip").value = last.ip || "";
        document.getElementById("new-port").value = String(last.port || 25565);
        document.getElementById("new-version").value = last.version || "";
      }
      const cfg = await launcherAPI.getConfig();
      const javaPath = String(cfg?.launcher?.downloads?.javaPath || "").trim();
      if (gameJavaPathInput) gameJavaPathInput.value = javaPath;
      if (!gameUsernameInput.value) gameUsernameInput.value = String(last?.username || "JugadorOffline");
      syncVersionTypeFiltersUI();
      await loadGameCatalog(false);
      updateFilterVisibilityByDistribution();
    }
  });

  bindClick("menu-config-btn", openConfigView);
  bindClick("menu-info-btn", openInfoView);
  bindClick("menu-fullscreen-btn", toggleFullscreenMode);
  bindClick("menu-exit-btn", quitApplication);
  bindClick("play-back-btn", () => showLauncherView("main"));
  bindClick("config-back-btn", () => showLauncherView("main"));
  bindClick("info-back-btn", () => showLauncherView("main"));
  bindClick("continue-last-btn", bootContinue);
  bindClick("create-new-btn", () => document.getElementById("new-profile-form").classList.remove("hidden"));
  bindClick("start-new-profile-btn", bootNewProfile);
  bindClick("game-refresh-catalog-btn", async () => {
    await loadGameCatalog(true);
  });
  bindClick("game-launch-btn", async () => {
    if (!launcherAPI) return;
    const selected = gameVersionSelect?.selectedOptions?.[0];
    if (!selected) return setGameStatus("Selecciona una versión para lanzar.", true);
    const authMode = String(gameAuthModeSelect?.value || "offline");
    const source = selected.dataset.source || "vanilla";
    const versionId = selected.value;
    const loaderVersion = selected.dataset.loaderVersion || "";
    const javaPath = String(gameJavaPathInput?.value || "").trim();
    if (javaPath) await launcherAPI.setJavaPath(javaPath);
    const result = await ensureInstalledThenLaunch({
      source,
      versionId,
      loaderVersion,
      authMode,
      username: String(gameUsernameInput?.value || "JugadorOffline").trim() || "JugadorOffline",
      javaPath,
    });
    if (!result.ok) return setGameStatus(result.error || "No se pudo lanzar.", true);
    setGameStatus(`Juego iniciado (PID ${result.pid || "?"})`);
  });
  bindClick("game-stop-btn", async () => {
    if (!launcherAPI) return;
    const res = await launcherAPI.stopGame();
    if (!res?.ok) return setGameStatus(res?.error || "No se pudo cerrar el juego.", true);
    setGameStatus("Proceso del juego cerrado.");
  });
  bindClick("game-scan-java-btn", async () => {
    if (!launcherAPI) return;
    setGameStatus("Buscando instalaciones de Java...");
    const res = await launcherAPI.getJavaRuntimes();
    if (!res?.ok) return setGameStatus(res?.error || "No se pudo detectar Java.", true);
    const runtime = Array.isArray(res.runtimes) && res.runtimes.length ? res.runtimes[0] : null;
    if (!runtime) return setGameStatus("No se encontró Java automáticamente. Define la ruta manualmente.", true);
    if (gameJavaPathInput) gameJavaPathInput.value = runtime.path;
    await launcherAPI.setJavaPath(runtime.path);
    setGameStatus(`Java detectado: ${runtime.path}`);
  });
  bindClick("save-config-btn", async () => {
    if (!launcherAPI) return;
    try {
      const currentConfig = await launcherAPI.getConfig();
      const parsed = buildMergedConfig(currentConfig);
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
  if (playTabBotBtn) playTabBotBtn.addEventListener("click", () => switchPlayTab("bot"));
  if (playTabJavaBtn) playTabJavaBtn.addEventListener("click", () => switchPlayTab("java"));
  if (gameDistributionSelect) gameDistributionSelect.addEventListener("change", () => {
    updateFilterVisibilityByDistribution();
    refreshVersionSelect();
  });
  if (filterRelease) filterRelease.addEventListener("change", () => { versionTypeFilters.release = Boolean(filterRelease.checked); refreshVersionSelect(); });
  if (filterSnapshot) filterSnapshot.addEventListener("change", () => { versionTypeFilters.snapshot = Boolean(filterSnapshot.checked); refreshVersionSelect(); });
  if (filterOldBeta) filterOldBeta.addEventListener("change", () => { versionTypeFilters.old_beta = Boolean(filterOldBeta.checked); refreshVersionSelect(); });
  if (filterOldAlpha) filterOldAlpha.addEventListener("change", () => { versionTypeFilters.old_alpha = Boolean(filterOldAlpha.checked); refreshVersionSelect(); });
  if (gameAuthModeSelect) gameAuthModeSelect.addEventListener("change", () => {
    const authMode = String(gameAuthModeSelect.value || "offline");
    if (gameUsernameInput) gameUsernameInput.disabled = authMode !== "offline";
  });
  switchPlayTab("bot");
  showLauncherView("main");
}

initLauncherMenu();
menuAudioMuted = loadMenuAudioMutedPreference();

if (launcherAudioToggle) {
  launcherAudioToggle.addEventListener("click", () => {
    menuAudioMuted = !menuAudioMuted;
    saveMenuAudioMutedPreference();
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
    return;
  }

  if (currentLauncherView === "main") {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      setMainMenuSelection(activeMainMenuIndex - 1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      setMainMenuSelection(activeMainMenuIndex + 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const buttons = getMainMenuButtons();
      if (!buttons.length) return;
      const target = buttons[activeMainMenuIndex];
      if (target) target.click();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
    }
    return;
  }

  if (currentLauncherView === "config") {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      setConfigSelection(activeConfigIndex - 1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      setConfigSelection(activeConfigIndex + 1);
      return;
    }

    if (event.key === "Enter") {
      const elements = getConfigNavigableElements();
      if (!elements.length) return;
      const active = elements[activeConfigIndex];
      if (!active) return;
      if (active.tagName === "BUTTON") {
        event.preventDefault();
        active.click();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      goBackLauncherView();
    }
    return;
  }

  if (currentLauncherView === "play") {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      setPlaySelection(activePlayIndex - 1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      setPlaySelection(activePlayIndex + 1);
      return;
    }

    if (event.key === "Enter") {
      const elements = getPlayNavigableElements();
      if (!elements.length) return;
      const active = elements[activePlayIndex];
      if (!active) return;
      if (active.tagName === "BUTTON") {
        event.preventDefault();
        active.click();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      goBackLauncherView();
    }
    return;
  }

  if (currentLauncherView === "info") {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      setInfoSelection(activeInfoIndex - 1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      setInfoSelection(activeInfoIndex + 1);
      return;
    }

    if (event.key === "Enter") {
      const elements = getInfoNavigableElements();
      if (!elements.length) return;
      const active = elements[activeInfoIndex];
      if (!active) return;
      event.preventDefault();
      active.click();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      goBackLauncherView();
    }
  }
});

if (launcherAPI && typeof launcherAPI.getFullscreen === "function") {
  launcherAPI.getFullscreen().then((state) => {
    const btn = document.getElementById("menu-fullscreen-btn");
    if (btn && state?.ok) btn.textContent = state.isFullscreen ? "Salir de pantalla completa (F11)" : "Pantalla completa (F11)";
  }).catch(() => { });
}

revealWindowWhenMenuReady();
