(function(){
  const NS = (window.MCBetaLauncher = window.MCBetaLauncher || {});
  NS.init = function initLauncherApp(){
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
const msAuthPanel = document.getElementById("ms-auth-panel");
const msAccountSelect = document.getElementById("ms-account-select");
const msLoginBtn = document.getElementById("ms-login-btn");
const msLogoutBtn = document.getElementById("ms-logout-btn");
const msRemoveBtn = document.getElementById("ms-remove-btn");
const msAuthStatus = document.getElementById("ms-auth-status");
const gameJavaPathInput = document.getElementById("game-java-path");
const gameMinMemoryInput = document.getElementById("game-min-memory-mb");
const gameMaxMemoryInput = document.getElementById("game-max-memory-mb");
const gameExtraJvmArgsInput = document.getElementById("game-extra-jvm-args");
const gameExtraGameArgsInput = document.getElementById("game-extra-game-args");
const gameAdvancedSection = document.getElementById("game-advanced-section");
const gameLaunchBtn = document.getElementById("game-launch-btn");
const gameStopBtn = document.getElementById("game-stop-btn");
const gameScanJavaBtn = document.getElementById("game-scan-java-btn");
const gameShowDiagnosticsBtn = document.getElementById("game-show-diagnostics-btn");
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
let javaSectionCatalogLoaded = false;
let msAuthState = { accounts: [], activeAccountId: null };
let catalogRequestSeq = 0;
let lastAppliedCatalogRequest = 0;
const versionTypeFilters = {
  release: true,
  snapshot: false,
  old_beta: false,
  old_alpha: false,
};
const MENU_AUDIO_MUTED_STORAGE_KEY = "launcher.menuAudioMuted";
const GAME_LAST_SELECTIONS_STORAGE_KEY = "launcher.gameLastSelections.v1";
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

function setMsAuthStatus(text, isError = false) {
  if (!msAuthStatus) return;
  msAuthStatus.textContent = text || "";
  msAuthStatus.dataset.kind = isError ? "error" : "ok";
}

function getSelectedMsAccount() {
  const id = String(msAccountSelect?.value || "").trim();
  if (!id) return null;
  return (msAuthState.accounts || []).find((a) => String(a.id) === id) || null;
}

function renderMsAccounts() {
  if (!msAccountSelect) return;
  const accounts = Array.isArray(msAuthState.accounts) ? msAuthState.accounts : [];
  msAccountSelect.innerHTML = "";
  if (!accounts.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Sin cuentas";
    msAccountSelect.appendChild(option);
    msAccountSelect.disabled = true;
    setMsAuthStatus("No hay sesión Microsoft activa.", true);
    return;
  }
  accounts.forEach((a) => {
    const option = document.createElement("option");
    option.value = String(a.id || "");
    option.textContent = `${a.minecraftUsername || a.displayName || a.username || "Cuenta"} (${a.username || "sin correo"})`;
    msAccountSelect.appendChild(option);
  });
  const target = String(msAuthState.activeAccountId || "");
  if (target && Array.from(msAccountSelect.options).some((o) => o.value === target)) msAccountSelect.value = target;
  msAccountSelect.disabled = false;
  const active = getSelectedMsAccount();
  setMsAuthStatus(active ? `Activa: ${active.minecraftUsername || active.displayName || active.username}` : "Cuenta activa no encontrada.", !active);
}

async function refreshMsSessions() {
  if (!launcherAPI || typeof launcherAPI.listAuthSessions !== "function") return;
  const res = await launcherAPI.listAuthSessions();
  if (!res?.ok) {
    setMsAuthStatus(res?.error || "No se pudieron cargar cuentas Microsoft.", true);
    return;
  }
  msAuthState = {
    accounts: Array.isArray(res.accounts) ? res.accounts : [],
    activeAccountId: String(res.activeAccountId || "").trim() || null,
  };
  renderMsAccounts();
}

function updateAuthModeUI() {
  let authMode = String(gameAuthModeSelect?.value || "offline");
  if (authMode === "microsoft" && gameAuthModeSelect) {
    gameAuthModeSelect.value = "offline";
    authMode = "offline";
  }
  const isMs = authMode === "microsoft";
  if (gameUsernameInput) {
    gameUsernameInput.disabled = isMs;
    gameUsernameInput.placeholder = isMs ? "Se usa el usuario de tu cuenta Microsoft" : "JugadorOffline";
  }
  if (msAuthPanel) msAuthPanel.classList.toggle("hidden", !isMs);
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

function loadLaunchOptionsFromConfig(cfg) {
  const downloads = cfg?.launcher?.downloads && typeof cfg.launcher.downloads === "object" ? cfg.launcher.downloads : {};
  if (gameJavaPathInput) gameJavaPathInput.value = String(downloads.javaPath || "").trim();
  if (gameMinMemoryInput) gameMinMemoryInput.value = String(downloads.minMemoryMb ?? 1024);
  if (gameMaxMemoryInput) gameMaxMemoryInput.value = String(downloads.maxMemoryMb ?? 2048);
  if (gameExtraJvmArgsInput) gameExtraJvmArgsInput.value = String(downloads.extraJvmArgs || "");
  if (gameExtraGameArgsInput) gameExtraGameArgsInput.value = String(downloads.extraGameArgs || "");
}

function buildLaunchOptionsFromInputs() {
  return {
    javaPath: String(gameJavaPathInput?.value || "").trim(),
    minMemoryMb: Number.parseInt(String(gameMinMemoryInput?.value || "1024"), 10) || 1024,
    maxMemoryMb: Number.parseInt(String(gameMaxMemoryInput?.value || "2048"), 10) || 2048,
    extraJvmArgs: String(gameExtraJvmArgsInput?.value || "").trim(),
    extraGameArgs: String(gameExtraGameArgsInput?.value || "").trim(),
  };
}

async function persistLaunchOptionsToConfig() {
  if (!launcherAPI || typeof launcherAPI.getConfig !== "function" || typeof launcherAPI.saveConfig !== "function") return;
  const cfg = await launcherAPI.getConfig();
  const next = cfg && typeof cfg === "object" ? cfg : {};
  if (!next.launcher || typeof next.launcher !== "object") next.launcher = {};
  if (!next.launcher.downloads || typeof next.launcher.downloads !== "object") next.launcher.downloads = {};
  const launchOptions = buildLaunchOptionsFromInputs();
  next.launcher.downloads.javaPath = launchOptions.javaPath;
  next.launcher.downloads.minMemoryMb = Math.max(512, launchOptions.minMemoryMb);
  next.launcher.downloads.maxMemoryMb = Math.max(next.launcher.downloads.minMemoryMb, launchOptions.maxMemoryMb);
  next.launcher.downloads.extraJvmArgs = launchOptions.extraJvmArgs;
  next.launcher.downloads.extraGameArgs = launchOptions.extraGameArgs;
  await launcherAPI.saveConfig(next);
}

function loadLastGameSelections() {
  try {
    const raw = window.localStorage.getItem(GAME_LAST_SELECTIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLastGameSelections(nextSelections) {
  try {
    const safe = nextSelections && typeof nextSelections === "object" ? nextSelections : {};
    window.localStorage.setItem(GAME_LAST_SELECTIONS_STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // Ignorar errores de almacenamiento.
  }
}

function getCurrentVersionSelectionPayload() {
  const selected = gameVersionSelect?.selectedOptions?.[0];
  if (!selected) return null;
  return {
    distribution: String(gameDistributionSelect?.value || "vanilla"),
    versionId: String(selected.value || ""),
    source: String(selected.dataset.source || gameDistributionSelect?.value || "vanilla"),
    loaderVersion: String(selected.dataset.loaderVersion || ""),
    type: String(selected.dataset.type || ""),
    label: String(selected.textContent || "").trim(),
    updatedAt: Date.now(),
  };
}

function persistCurrentVersionSelection() {
  const payload = getCurrentVersionSelectionPayload();
  if (!payload || !payload.versionId) return;
  const all = loadLastGameSelections();
  all[payload.distribution] = payload;
  all.__last = payload;
  saveLastGameSelections(all);
}

function restoreRememberedDistribution() {
  const rememberedAll = loadLastGameSelections();
  const last = rememberedAll?.__last || null;
  if (!last || !gameDistributionSelect) return;
  const dist = String(last.distribution || "").trim();
  if (!dist) return;
  const allowed = ["vanilla", "fabric", "forge"];
  if (!allowed.includes(dist)) return;
  gameDistributionSelect.value = dist;
}

function refreshVersionSelect() {
  if (!gameVersionSelect) return;
  const entries = applyVersionFilters(getDistributionEntries(), String(gameDistributionSelect?.value || "vanilla"), versionTypeFilters);
  const previous = gameVersionSelect.value;
  const currentDistribution = String(gameDistributionSelect?.value || "vanilla");
  const remembered = loadLastGameSelections()?.[currentDistribution] || null;
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
  const hasOption = (value) => Array.from(gameVersionSelect.options).some((opt) => opt.value === String(value));
  if (remembered?.versionId && hasOption(remembered.versionId)) {
    gameVersionSelect.value = String(remembered.versionId);
  } else if (previous && hasOption(previous)) {
    gameVersionSelect.value = String(previous);
  } else if (gameVersionSelect.options.length > 0) {
    gameVersionSelect.selectedIndex = 0;
  }
  if (gameVersionSelect.options.length === 0) {
    setGameStatus("Sin resultados para los filtros seleccionados.", true);
  }
}

function applyVersionFilters(entries, distribution, filters) {
  if (!Array.isArray(entries)) return [];
  const dist = String(distribution || "vanilla");
  if (dist !== "vanilla") return entries;
  return entries.filter((entry) => {
    const type = String(entry.type || "release");
    if (!Boolean(filters[type])) return false;
    const id = String(entry.id || "");
    const match = id.match(/^1\.(\d+)(?:\.(\d+))?$/);
    if (!match) return true;
    const minor = Number.parseInt(match[1], 10);
    return Number.isFinite(minor) ? minor >= 8 : true;
  });
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

async function launchSelectedGameFromUI() {
  if (!launcherAPI) return;
  const selected = gameVersionSelect?.selectedOptions?.[0];
  if (!selected) return setGameStatus("Selecciona una versión para lanzar.", true);
  const authMode = String(gameAuthModeSelect?.value || "offline");
  const source = selected.dataset.source || "vanilla";
  const versionId = selected.value;
  const loaderVersion = selected.dataset.loaderVersion || "";
  const launchOptions = buildLaunchOptionsFromInputs();
  const javaPath = launchOptions.javaPath;
  persistCurrentVersionSelection();
  await persistLaunchOptionsToConfig();
  if (javaPath) await launcherAPI.setJavaPath(javaPath);
  const result = await ensureInstalledThenLaunch({
    source,
    versionId,
    loaderVersion,
    authMode,
    username: authMode === "microsoft"
      ? (getSelectedMsAccount()?.minecraftUsername || "MicrosoftPlayer")
      : (String(gameUsernameInput?.value || "JugadorOffline").trim() || "JugadorOffline"),
    javaPath: launchOptions.javaPath,
    minMemoryMb: launchOptions.minMemoryMb,
    maxMemoryMb: Math.max(launchOptions.minMemoryMb, launchOptions.maxMemoryMb),
    extraJvmArgs: launchOptions.extraJvmArgs,
    extraGameArgs: launchOptions.extraGameArgs,
  });
  if (!result.ok) return setGameStatus(result.error || "No se pudo lanzar.", true);
  setGameStatus(`Juego iniciado (PID ${result.pid || "?"})`);
}

function switchPlayTab(tab) {
  const normalized = tab === "java" ? "java" : "bot";
  activePlayTab = normalized;
  const launcherShell = document.querySelector(".launcher-shell");
  if (launcherShell) launcherShell.classList.toggle("java-expanded", normalized === "java");
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

async function ensureJavaCatalogLoadedOnce() {
  if (javaSectionCatalogLoaded) return;
  await loadGameCatalog(true);
  refreshVersionSelect();
  javaSectionCatalogLoaded = true;
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

async function ensureInstalledThenLaunch({ source, versionId, loaderVersion, authMode, username, javaPath, minMemoryMb, maxMemoryMb, extraJvmArgs, extraGameArgs }) {
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
  const launchRes = await launcherAPI.launchGame({
    versionId: launchVersionId,
    authMode,
    username,
    javaPath,
    minMemoryMb,
    maxMemoryMb,
    extraJvmArgs,
    extraGameArgs,
  });
  if (!launchRes?.ok) return { ok: false, error: launchRes?.error || "No se pudo lanzar el juego." };
  const runtimeCheck = await waitForRuntimeStable(8000, 4500);
  if (!runtimeCheck.ok) return runtimeCheck;
  return { ok: true, pid: runtimeCheck.pid || launchRes.pid };
}

function formatRuntimeDiagnostics(st) {
  const lines = [];
  lines.push("Diagnóstico runtime:");
  lines.push(`- running: ${Boolean(st?.running)}`);
  lines.push(`- pid: ${st?.pid ?? "n/a"}`);
  lines.push(`- java seleccionado: ${st?.javaPathSelected || "n/a"}`);
  lines.push(`- java probados: ${Array.isArray(st?.javaPathTried) ? st.javaPathTried.join(" | ") || "n/a" : "n/a"}`);
  lines.push(`- lastExitCode: ${st?.lastExitCode ?? "n/a"}`);
  lines.push(`- lastLifecycleEvent: ${st?.lastLifecycleEvent || "n/a"}`);
  lines.push(`- lineCount: ${Number(st?.lineCount || 0)}`);
  if (Number(st?.silenceMs || 0) > 0) lines.push(`- silenceMs: ${st.silenceMs} (threshold ${st?.stallThresholdMs || "n/a"})`);
  if (st?.lastError) lines.push(`- lastError: ${st.lastError}`);
  if (st?.lastErrorLines) {
    lines.push("- últimas líneas:");
    lines.push(st.lastErrorLines);
  }
  return lines.join("\n");
}

async function waitForRuntimeStable(timeoutMs = 8000, healthWindowMs = 4500) {
  if (!launcherAPI || typeof launcherAPI.getGameRuntimeStatus !== "function") return { ok: true };
  const start = Date.now();
  let firstRunning = null;
  while (Date.now() - start <= timeoutMs) {
    const st = await launcherAPI.getGameRuntimeStatus();
    if (!st?.ok) return { ok: false, error: st?.error || "No se pudo validar estado del juego." };
    if (st.running) {
      if (!firstRunning) firstRunning = Date.now();
      const healthElapsed = Date.now() - firstRunning;
      if (st.stalled && healthElapsed >= 1500) {
        return { ok: false, error: `Proceso Java activo pero sin progreso.\n${formatRuntimeDiagnostics(st)}` };
      }
      if (healthElapsed >= healthWindowMs) {
        return { ok: true, pid: st.pid };
      }
    }
    if (st.lastExitCode !== null || st.lastError) {
      const details = [st.lastError || `Proceso cerrado con código ${st.lastExitCode}.`, st.lastErrorLines || ""].filter(Boolean).join("\n");
      return { ok: false, error: details || "El juego cerró antes de iniciar." };
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return { ok: false, error: "Timeout esperando que el juego quede en ejecución." };
}

async function showRuntimeDiagnostics() {
  if (!launcherAPI || typeof launcherAPI.getGameRuntimeStatus !== "function") return;
  const st = await launcherAPI.getGameRuntimeStatus();
  if (!st?.ok) return setGameStatus(st?.error || "No se pudo obtener diagnóstico runtime.", true);
  const text = formatRuntimeDiagnostics(st);
  const isWarn = Boolean(st?.stalled || st?.lastError || st?.lastExitCode !== null);
  setGameStatus(text, isWarn);
}

async function loadGameCatalog(forceRefresh = false) {
  if (!launcherAPI) return;
  const requestId = ++catalogRequestSeq;
  setGameStatus(forceRefresh ? "Actualizando catálogo..." : "Cargando catálogo...");
  const result = forceRefresh ? await launcherAPI.refreshVersionCatalog() : await launcherAPI.getVersionCatalog();
  if (requestId < lastAppliedCatalogRequest) return;
  lastAppliedCatalogRequest = requestId;
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
  if (launcherShell) {
    launcherShell.classList.toggle("main-compact", view === "main");
    if (view !== "play") launcherShell.classList.remove("java-expanded");
  }
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
      loadLaunchOptionsFromConfig(cfg);
      if (!gameUsernameInput.value) gameUsernameInput.value = String(last?.username || "JugadorOffline");
      restoreRememberedDistribution();
      syncVersionTypeFiltersUI();
      updateFilterVisibilityByDistribution();
      await refreshMsSessions();
      updateAuthModeUI();
      if (activePlayTab === "java") await ensureJavaCatalogLoadedOnce();
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
  bindClick("game-launch-btn", async () => {
    await launchSelectedGameFromUI();
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
    await persistLaunchOptionsToConfig();
    await launcherAPI.setJavaPath(runtime.path);
    setGameStatus(`Java detectado: ${runtime.path}`);
  });
  bindClick("game-show-diagnostics-btn", async () => {
    await showRuntimeDiagnostics();
  });
  bindClick("ms-login-btn", async () => {
    if (!launcherAPI || typeof launcherAPI.msLogin !== "function") return;
    setMsAuthStatus("Abriendo Microsoft Login...", false);
    const res = await launcherAPI.msLogin();
    if (!res?.ok) return setMsAuthStatus(res?.error || "No se pudo iniciar sesión Microsoft.", true);
    await refreshMsSessions();
    setGameStatus("Sesión Microsoft iniciada.");
    updateAuthModeUI();
  });
  bindClick("ms-logout-btn", async () => {
    if (!launcherAPI || typeof launcherAPI.msLogout !== "function") return;
    const res = await launcherAPI.msLogout();
    if (!res?.ok) return setMsAuthStatus(res?.error || "No se pudo cerrar sesión.", true);
    await refreshMsSessions();
    setGameStatus("Sesiones Microsoft cerradas.");
    updateAuthModeUI();
  });
  bindClick("ms-remove-btn", async () => {
    if (!launcherAPI || typeof launcherAPI.removeAuthSession !== "function") return;
    const active = getSelectedMsAccount();
    if (!active) return setMsAuthStatus("Selecciona una cuenta para quitar.", true);
    const res = await launcherAPI.removeAuthSession(active.id);
    if (!res?.ok) return setMsAuthStatus(res?.error || "No se pudo quitar cuenta.", true);
    await refreshMsSessions();
    setGameStatus("Cuenta Microsoft eliminada.");
    updateAuthModeUI();
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
  if (playTabJavaBtn) playTabJavaBtn.addEventListener("click", async () => {
    switchPlayTab("java");
    await ensureJavaCatalogLoadedOnce();
  });
  if (gameDistributionSelect) gameDistributionSelect.addEventListener("change", async () => {
    updateFilterVisibilityByDistribution();
    refreshVersionSelect();
    await loadGameCatalog(true);
  });
  if (gameVersionSelect) gameVersionSelect.addEventListener("change", () => {
    persistCurrentVersionSelection();
  });
  if (gameVersionSelect) gameVersionSelect.addEventListener("dblclick", async () => {
    await launchSelectedGameFromUI();
  });
  if (filterRelease) filterRelease.addEventListener("change", async () => { versionTypeFilters.release = Boolean(filterRelease.checked); refreshVersionSelect(); await loadGameCatalog(true); });
  if (filterSnapshot) filterSnapshot.addEventListener("change", async () => { versionTypeFilters.snapshot = Boolean(filterSnapshot.checked); refreshVersionSelect(); await loadGameCatalog(true); });
  if (filterOldBeta) filterOldBeta.addEventListener("change", async () => { versionTypeFilters.old_beta = Boolean(filterOldBeta.checked); refreshVersionSelect(); await loadGameCatalog(true); });
  if (filterOldAlpha) filterOldAlpha.addEventListener("change", async () => { versionTypeFilters.old_alpha = Boolean(filterOldAlpha.checked); refreshVersionSelect(); await loadGameCatalog(true); });
  if (gameAuthModeSelect) gameAuthModeSelect.addEventListener("change", () => {
    if (String(gameAuthModeSelect.value || "offline") === "microsoft") {
      gameAuthModeSelect.value = "offline";
      setGameStatus("Microsoft/Premium está deshabilitado temporalmente.", true);
    }
    updateAuthModeUI();
  });
  if (msAccountSelect) msAccountSelect.addEventListener("change", async () => {
    if (!launcherAPI || typeof launcherAPI.setActiveAuthSession !== "function") return;
    const id = String(msAccountSelect.value || "");
    if (!id) return;
    const res = await launcherAPI.setActiveAuthSession(id);
    if (!res?.ok) return setMsAuthStatus(res?.error || "No se pudo cambiar cuenta activa.", true);
    msAuthState.activeAccountId = id;
    renderMsAccounts();
  });
  if (gameJavaPathInput) gameJavaPathInput.addEventListener("change", async () => { await persistLaunchOptionsToConfig(); });
  if (gameMinMemoryInput) gameMinMemoryInput.addEventListener("change", async () => { await persistLaunchOptionsToConfig(); });
  if (gameMaxMemoryInput) gameMaxMemoryInput.addEventListener("change", async () => { await persistLaunchOptionsToConfig(); });
  if (gameExtraJvmArgsInput) gameExtraJvmArgsInput.addEventListener("change", async () => { await persistLaunchOptionsToConfig(); });
  if (gameExtraGameArgsInput) gameExtraGameArgsInput.addEventListener("change", async () => { await persistLaunchOptionsToConfig(); });
  switchPlayTab("bot");
  if (gameAuthModeSelect) gameAuthModeSelect.value = "offline";
  updateAuthModeUI();
  showLauncherView("main");
}

const moduleCtx = {
  launcherAPI,
  dom: {
    gameVersionSelect,
    gameDistributionSelect,
    bgVideoModeSelect,
  },
  applyVersionFilters: (entries, distribution, filters) => applyVersionFilters(entries, distribution, filters),
  getDistributionEntries: () => getDistributionEntries(),
  getEntryVersionId: (entry) => getEntryVersionId(entry),
  getVersionTypeFilters: () => versionTypeFilters,
  loadLastGameSelections: () => loadLastGameSelections(),
  setGameStatus: (text, isError) => setGameStatus(text, isError),
  setCatalogRequestSeq: (value) => { catalogRequestSeq = value; },
  getCatalogRequestSeq: () => catalogRequestSeq,
  getLastAppliedCatalogRequest: () => lastAppliedCatalogRequest,
  setLastAppliedCatalogRequest: (value) => { lastAppliedCatalogRequest = value; },
  setGameCatalog: (value) => { gameCatalog = value; },
  getGameCatalog: () => gameCatalog,
  refreshVersionSelect: () => refreshVersionSelect(),
};

if (NS.catalog && typeof NS.catalog.refreshVersionSelect === "function") {
  refreshVersionSelect = NS.catalog.refreshVersionSelect.bind(null, moduleCtx);
}
if (NS.catalog && typeof NS.catalog.applyVersionFilters === "function") {
  applyVersionFilters = NS.catalog.applyVersionFilters.bind(null, moduleCtx);
}
if (NS.catalog && typeof NS.catalog.loadGameCatalog === "function") {
  loadGameCatalog = NS.catalog.loadGameCatalog.bind(null, moduleCtx);
}
if (NS.runtime && typeof NS.runtime.waitInstallCompletion === "function") {
  waitInstallCompletion = NS.runtime.waitInstallCompletion.bind(null, moduleCtx);
}
if (NS.runtime && typeof NS.runtime.formatRuntimeDiagnostics === "function") {
  formatRuntimeDiagnostics = NS.runtime.formatRuntimeDiagnostics.bind(null, moduleCtx);
}
if (NS.configForm && typeof NS.configForm.loadConfigIntoForm === "function") {
  loadConfigIntoForm = NS.configForm.loadConfigIntoForm.bind(null, moduleCtx);
}
const navigationCtx = {
  MAIN_MENU_BUTTON_IDS,
  dom: { launcherControlsHint, launcherConfigView, launcherPlayView, launcherInfoView, launcherMainMenu },
  getCurrentLauncherView: () => currentLauncherView,
  setCurrentLauncherView: (v) => { currentLauncherView = v; },
  getLauncherViewHistory: () => [...launcherViewHistory],
  setLauncherViewHistory: (history) => { launcherViewHistory = Array.isArray(history) ? [...history] : ["main"]; },
  getActiveMainMenuIndex: () => activeMainMenuIndex,
  setActiveMainMenuIndex: (v) => { activeMainMenuIndex = v; },
  getActiveConfigIndex: () => activeConfigIndex,
  setActiveConfigIndex: (v) => { activeConfigIndex = v; },
  getActivePlayIndex: () => activePlayIndex,
  setActivePlayIndex: (v) => { activePlayIndex = v; },
  getActiveInfoIndex: () => activeInfoIndex,
  setActiveInfoIndex: (v) => { activeInfoIndex = v; },
  startMenuAudio: () => startMenuAudio(),
  setLauncherStatus: (text, isError) => setLauncherStatus(text, isError),
  toggleFullscreenMode: () => toggleFullscreenMode(),
};
if (NS.navigation && typeof NS.navigation.showLauncherView === "function") {
  showLauncherView = NS.navigation.showLauncherView.bind(null, navigationCtx);
}
if (NS.navigation && typeof NS.navigation.goBackLauncherView === "function") {
  goBackLauncherView = NS.navigation.goBackLauncherView.bind(null, navigationCtx);
}

const actionsCtx = {
  launcherAPI,
  dom: {
    bgVideoModeSelect, playTabBotBtn, playTabJavaBtn, gameDistributionSelect, gameVersionSelect, gameAuthModeSelect,
    msAccountSelect, gameJavaPathInput, gameMinMemoryInput, gameMaxMemoryInput, gameExtraJvmArgsInput, gameExtraGameArgsInput,
    filterRelease, filterSnapshot, filterOldBeta, filterOldAlpha, gameUsernameInput,
  },
  versionTypeFilters,
  getActivePlayTab: () => activePlayTab,
  switchPlayTab: (tab) => switchPlayTab(tab),
  showLauncherView: (view) => showLauncherView(view),
  loadLaunchOptionsFromConfig: (cfg) => loadLaunchOptionsFromConfig(cfg),
  restoreRememberedDistribution: () => restoreRememberedDistribution(),
  syncVersionTypeFiltersUI: () => syncVersionTypeFiltersUI(),
  updateFilterVisibilityByDistribution: () => updateFilterVisibilityByDistribution(),
  refreshMsSessions: () => refreshMsSessions(),
  updateAuthModeUI: () => updateAuthModeUI(),
  ensureJavaCatalogLoadedOnce: () => ensureJavaCatalogLoadedOnce(),
  openConfigView: () => openConfigView(),
  openInfoView: () => openInfoView(),
  toggleFullscreenMode: () => toggleFullscreenMode(),
  quitApplication: () => quitApplication(),
  bootContinue: () => bootContinue(),
  bootNewProfile: () => bootNewProfile(),
  launchSelectedGameFromUI: () => launchSelectedGameFromUI(),
  setGameStatus: (text, isError) => setGameStatus(text, isError),
  persistLaunchOptionsToConfig: () => persistLaunchOptionsToConfig(),
  showRuntimeDiagnostics: () => showRuntimeDiagnostics(),
  buildMergedConfig: (cfg) => buildMergedConfig(cfg),
  setLauncherStatus: (text, isError) => setLauncherStatus(text, isError),
  setCurrentBgVideoMode: (v) => { currentBgVideoMode = v; },
  getCurrentBgVideoMode: () => currentBgVideoMode,
  applyLauncherBackgroundVideo: (v) => applyLauncherBackgroundVideo(v),
  persistCurrentVersionSelection: () => persistCurrentVersionSelection(),
  loadGameCatalog: (force) => loadGameCatalog(force),
  refreshVersionSelect: () => refreshVersionSelect(),
  setMsAuthStatus: (text, isError) => setMsAuthStatus(text, isError),
  setMsActiveAccountId: (id) => { msAuthState.activeAccountId = id; },
  renderMsAccounts: () => renderMsAccounts(),
};

if (NS.actions && typeof NS.actions.init === "function") NS.actions.init(actionsCtx);
else initLauncherMenu();
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

if (NS.navigation && typeof NS.navigation.setupKeyboard === "function") {
  NS.navigation.setupKeyboard(navigationCtx);
}

if (launcherAPI && typeof launcherAPI.getFullscreen === "function") {
  launcherAPI.getFullscreen().then((state) => {
    const btn = document.getElementById("menu-fullscreen-btn");
    if (btn && state?.ok) btn.textContent = state.isFullscreen ? "Salir de pantalla completa (F11)" : "Pantalla completa (F11)";
  }).catch(() => { });
}

revealWindowWhenMenuReady();

  };
})();

