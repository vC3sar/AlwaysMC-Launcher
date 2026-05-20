"use strict";
const RPC = require("discord-rpc");

const PLACEHOLDER_IDS = new Set(["your_discord_app_client_id_here", "TU_CLIENT_ID_AQUÍ"]);
const RETRY_DELAY_MS = 5000;

const state = {
  rpc: null,
  isReady: false,
  isConnecting: false,
  lastActivityPayload: null,
  lastError: null,
  currentClientId: "",
  warnedInvalidClientId: false,
  reconnectTimer: null,
  active: false,
  verboseMode: "app",
  debugLifecycle: false,
  lifecycleStartAt: 0,
};

// ── Logging ───────────────────────────────────────────────────────────────────
function _elapsed() {
  return state.debugLifecycle && state.lifecycleStartAt ? ` +${Date.now() - state.lifecycleStartAt}ms` : "";
}

function _log(tag, message) {
  console.log(`[DiscordRPC${tag}]${_elapsed()} ${message}`);
}

const logInfo = (msg) => _log("", msg);
const logDebug = (msg) => state.verboseMode === "all" && _log(":debug", msg);
const logError = (phase, error) => _log(":error",
  `phase=${phase} code=${error?.code ?? "unknown"} message=${_errMsg(error)}`);

function _errMsg(error) {
  return error?.message ?? String(error ?? "unknown error");
}

function maskClientId(clientId) {
  const id = String(clientId || "");
  if (!id) return "empty";
  if (id.length <= 4) return "*".repeat(id.length);
  return `${"*".repeat(id.length - 4)}${id.slice(-4)}`;
}

function logStateDebug(label) {
  if (state.verboseMode !== "all") return;
  logDebug(`${label} state=${JSON.stringify({
    active: state.active,
    isReady: state.isReady,
    isConnecting: state.isConnecting,
    hasRpc: Boolean(state.rpc),
    hasPendingActivity: Boolean(state.lastActivityPayload),
    hasLastError: Boolean(state.lastError),
    hasReconnectTimer: Boolean(state.reconnectTimer),
    clientIdSet: Boolean(state.currentClientId),
  })}`);
}

// ── State helpers ─────────────────────────────────────────────────────────────
// Centralises the pair that was duplicated in 3 event handlers.
function _resetConnectFlags() {
  state.isReady = false;
  state.isConnecting = false;
}

function clearReconnectTimer() {
  if (!state.reconnectTimer) return;
  clearTimeout(state.reconnectTimer);
  state.reconnectTimer = null;
}

function isValidClientId(clientId) {
  const id = typeof clientId === "string" ? clientId.trim() : "";
  if (!id) return { ok: false, normalized: id, reason: "clientId vacío" };
  if (PLACEHOLDER_IDS.has(id)) return { ok: false, normalized: id, reason: "clientId placeholder" };
  return { ok: true, normalized: id, reason: "" };
}

// ── Activity ──────────────────────────────────────────────────────────────────
function buildActivityPayload({ serverIp, version, username }) {
  const server = (String(serverIp || "").trim()) || "Esperando servidor...";
  const ver = String(version || "").trim();
  const user = String(username || "Usuario").trim();
  return {
    details: `${user} burlando el AFK 🗿`,
    state: `Jugando en: ${ver ? `${server} | ${ver}` : server}`,
    startTimestamp: new Date(),
    largeImageKey: "logo",
    largeImageText: "MC-BETA",
    smallImageKey: "mc",
    smallImageText: "Minecraft",
    instance: false,
  };
}

function flushPendingActivity() {
  if (!state.rpc || !state.isReady || !state.lastActivityPayload) return;
  const payload = state.lastActivityPayload;
  state.rpc.setActivity(payload)
    .then(() => {
      logInfo("activity enviada a Discord");
      logDebug(`activity payload=${JSON.stringify({ details: payload.details, state: payload.state })}`);
      logStateDebug("activity-sent");
    })
    .catch((err) => { state.lastError = err; logError("setActivity", err); });
}

// ── RPC lifecycle ─────────────────────────────────────────────────────────────
function clearRpcClient() {
  if (!state.rpc) return;
  const rpc = state.rpc;
  state.rpc = null;
  _resetConnectFlags();
  try {
    rpc.removeAllListeners?.();
    if (rpc.transport?.socket) {
      const p = rpc.destroy?.();
      p?.catch?.((e) => logDebug(`destroy async ignored: ${_errMsg(e)}`));
    } else {
      logDebug("destroy skipped: transport/socket no disponible");
    }
  } catch (e) {
    logDebug(`destroy ignored: ${_errMsg(e)}`);
  }
  logStateDebug("rpc-cleared");
}

function scheduleReconnect() {
  if (!state.active || !state.currentClientId) return;
  if (state.reconnectTimer || state.isConnecting || state.isReady) return;
  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    logStateDebug("reconnect-timer-fired");
    connectRpc();
  }, RETRY_DELAY_MS);
  logDebug(`reconnect scheduled in ${RETRY_DELAY_MS}ms`);
  logStateDebug("reconnect-scheduled");
}

function connectRpc() {
  if (!state.active || !state.currentClientId) return;
  if (state.isConnecting || state.isReady) {
    logDebug("login skip: already connecting/ready");
    logStateDebug("connect-skip");
    return;
  }

  clearReconnectTimer();
  clearRpcClient();
  state.isConnecting = true;

  RPC.register(state.currentClientId);
  state.rpc = new RPC.Client({ transport: "ipc" });
  logStateDebug("rpc-client-created");

  // Consolidated: all three failure paths share _resetConnectFlags + scheduleReconnect.
  const onFailure = (phase, err) => {
    if (err) { state.lastError = err; logError(phase, err); }
    _resetConnectFlags();
    logStateDebug(`${phase}-failed`);
    scheduleReconnect();
  };

  state.rpc.on("ready", () => {
    state.isReady = true;
    state.isConnecting = false;
    logInfo("conectado a Discord");
    logStateDebug("rpc-ready");
    flushPendingActivity();
  });

  state.rpc.on("disconnected", () => {
    logInfo("desconectado de Discord");
    onFailure("rpc-disconnected", null);
  });

  state.rpc.on("error", (err) => onFailure("rpc-error-event", err));

  state.rpc.login({ clientId: state.currentClientId })
    .then(() => { logDebug("login ok"); logStateDebug("login-ok"); })
    .catch((err) => onFailure("login", err));
}

// ── Public API ────────────────────────────────────────────────────────────────
function initDiscordPresence({ clientId, verboseMode, debugLifecycle } = {}) {
  state.verboseMode = String(verboseMode || "app").toLowerCase() === "all" ? "all" : "app";
  state.debugLifecycle = Boolean(debugLifecycle);
  state.lifecycleStartAt = Date.now();
  state.active = true;

  logInfo(`init requested verboseMode=${state.verboseMode} debugLifecycle=${state.debugLifecycle ? "1" : "0"} clientId=${maskClientId(clientId)} len=${String(clientId || "").trim().length}`);
  logInfo("canal de salida: consola del proceso Node/Electron main (no UI del launcher)");

  const validation = isValidClientId(clientId);
  if (!validation.ok) {
    state.currentClientId = "";
    const already = state.warnedInvalidClientId;
    state.warnedInvalidClientId = true;
    already ? logDebug(`desactivado (ya informado): ${validation.reason}`)
      : logInfo(`desactivado: ${validation.reason}`);
    logStateDebug("init-invalid-clientId");
    return false;
  }

  state.warnedInvalidClientId = false;
  if (state.currentClientId !== validation.normalized) {
    state.currentClientId = validation.normalized;
    logDebug(`clientId aplicado (len=${state.currentClientId.length})`);
  }

  logInfo("inicializando cliente RPC");
  logStateDebug("init-valid-clientId");
  connectRpc();
  return true;
}

function updateDiscordPresence({ serverIp, version, username } = {}) {
  state.lastActivityPayload = buildActivityPayload({ serverIp, version, username });
  if (!state.active || !state.currentClientId) {
    logDebug("activity cacheada: RPC inactivo o sin clientId");
    logStateDebug("update-cached-inactive");
    return false;
  }
  if (!state.isReady) {
    logDebug("activity cacheada: RPC no listo");
    logStateDebug("update-cached-not-ready");
    return false;
  }
  flushPendingActivity();
  return true;
}

function shutdownDiscordPresence() {
  state.active = false;
  clearReconnectTimer();
  clearRpcClient();
  logInfo("shutdown completado");
  logStateDebug("shutdown");
}

module.exports = { initDiscordPresence, updateDiscordPresence, shutdownDiscordPresence };