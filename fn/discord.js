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

function shouldVerboseAll() {
  return state.verboseMode === "all";
}

function elapsedPrefix() {
  if (!state.debugLifecycle || !state.lifecycleStartAt) return "";
  return ` +${Date.now() - state.lifecycleStartAt}ms`;
}

function logInfo(message) {
  console.log(`[DiscordRPC]${elapsedPrefix()} ${message}`);
}

function logDebug(message) {
  if (!shouldVerboseAll()) return;
  console.log(`[DiscordRPC:debug]${elapsedPrefix()} ${message}`);
}

function logError(phase, error) {
  const code = error && error.code ? String(error.code) : "unknown";
  const message = error && error.message ? error.message : String(error || "unknown error");
  console.log(`[DiscordRPC:error]${elapsedPrefix()} phase=${phase} code=${code} message=${message}`);
}

function maskClientId(clientId) {
  const id = String(clientId || "");
  if (!id) return "empty";
  if (id.length <= 4) return "*".repeat(id.length);
  return `${"*".repeat(Math.max(0, id.length - 4))}${id.slice(-4)}`;
}

function logStateDebug(label) {
  if (!shouldVerboseAll()) return;
  logDebug(
    `${label} state=${JSON.stringify({
      active: state.active,
      isReady: state.isReady,
      isConnecting: state.isConnecting,
      hasRpc: Boolean(state.rpc),
      hasPendingActivity: Boolean(state.lastActivityPayload),
      hasLastError: Boolean(state.lastError),
      hasReconnectTimer: Boolean(state.reconnectTimer),
      clientIdSet: Boolean(state.currentClientId),
    })}`
  );
}

function clearReconnectTimer() {
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
}

function isValidClientId(clientId) {
  const id = typeof clientId === "string" ? clientId.trim() : "";
  if (!id) return { ok: false, normalized: "", reason: "clientId vacío" };
  if (PLACEHOLDER_IDS.has(id)) return { ok: false, normalized: id, reason: "clientId placeholder" };
  return { ok: true, normalized: id, reason: "" };
}

function buildActivityPayload({ serverIp, version, username }) {
  const server = String(serverIp || "Esperando servidor...").trim() || "Esperando servidor...";
  const ver = String(version || "").trim();
  const stateText = ver ? `${server} | ${ver}` : server;
  const user = String(username || "Usuario").trim();
  return {
    details: `${user} burlando el AFK 🗿`,
    state: `Jugando en: ${stateText}`,
    startTimestamp: new Date(),
    largeImageKey: "logo",
    largeImageText: "MC-BETA",
    smallImageKey: "mc",
    smallImageText: "Minecraft",
    instance: false,
  };
}

function clearRpcClient() {
  if (!state.rpc) return;
  const currentRpc = state.rpc;
  try {
    if (typeof currentRpc.removeAllListeners === "function") {
      currentRpc.removeAllListeners();
    }
    const transport = currentRpc.transport;
    const hasSocket = Boolean(transport && transport.socket);
    if (!hasSocket) {
      logDebug("destroy skipped: transport/socket no disponible");
    } else if (typeof currentRpc.destroy === "function") {
      try {
        const destroyResult = currentRpc.destroy();
        if (destroyResult && typeof destroyResult.catch === "function") {
          destroyResult.catch((error) => {
            logDebug(`destroy async ignored: ${error && error.message ? error.message : String(error)}`);
          });
        }
      } catch (error) {
        logDebug(`destroy sync ignored: ${error && error.message ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    logDebug(`destroy ignored: ${error && error.message ? error.message : String(error)}`);
  }
  state.rpc = null;
  state.isReady = false;
  state.isConnecting = false;
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

function flushPendingActivity() {
  if (!state.rpc || !state.isReady || !state.lastActivityPayload) return;
  const payload = state.lastActivityPayload;
  state.rpc.setActivity(payload)
    .then(() => {
      logInfo("activity enviada a Discord");
      logDebug(`activity payload=${JSON.stringify({ details: payload.details, state: payload.state })}`);
      logStateDebug("activity-sent");
    })
    .catch((error) => {
      state.lastError = error;
      logError("setActivity", error);
    });
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

  state.rpc.on("ready", () => {
    state.isReady = true;
    state.isConnecting = false;
    logInfo("conectado a Discord");
    logStateDebug("rpc-ready");
    flushPendingActivity();
  });

  state.rpc.on("disconnected", () => {
    state.isReady = false;
    state.isConnecting = false;
    logInfo("desconectado de Discord");
    logStateDebug("rpc-disconnected");
    scheduleReconnect();
  });

  state.rpc.on("error", (error) => {
    state.lastError = error;
    state.isReady = false;
    state.isConnecting = false;
    logError("rpc-event", error);
    logStateDebug("rpc-error-event");
    scheduleReconnect();
  });

  state.rpc.login({ clientId: state.currentClientId })
    .then(() => {
      logDebug("login ok");
      logStateDebug("login-ok");
    })
    .catch((error) => {
      state.lastError = error;
      state.isReady = false;
      state.isConnecting = false;
      logError("login", error);
      logStateDebug("login-failed");
      scheduleReconnect();
    });
}

function initDiscordPresence({ clientId, verboseMode, debugLifecycle } = {}) {
  state.verboseMode = String(verboseMode || "app").toLowerCase() === "all" ? "all" : "app";
  state.debugLifecycle = Boolean(debugLifecycle);
  state.lifecycleStartAt = Date.now();
  state.active = true;
  logInfo(
    `init requested verboseMode=${state.verboseMode} debugLifecycle=${state.debugLifecycle ? "1" : "0"} clientId=${maskClientId(clientId)} len=${String(clientId || "").trim().length}`
  );
  logInfo("canal de salida: consola del proceso Node/Electron main (no UI del launcher)");

  const validation = isValidClientId(clientId);
  if (!validation.ok) {
    state.currentClientId = "";
    if (!state.warnedInvalidClientId) {
      logInfo(`desactivado: ${validation.reason}`);
      state.warnedInvalidClientId = true;
    } else {
      logDebug(`desactivado (ya informado): ${validation.reason}`);
    }
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
  const payload = buildActivityPayload({ serverIp, version, username });
  state.lastActivityPayload = payload;
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

module.exports = {
  initDiscordPresence,
  updateDiscordPresence,
  shutdownDiscordPresence,
};
