const mineflayer = require("mineflayer");
const readline = require("readline");
const WebSocket = require("ws");
const ping = require("ping");
const nbt = require("prismarine-nbt");
const { createRuntimeState } = require("./src/bot/state");
const { extractVitals } = require("./src/bot/vitals");
const { getArmorDestination, isLikelyFood } = require("./src/bot/menu");
const {
  sanitizeVisibleText: sanitizeVisibleTextShared,
} = require("./src/bot/minecraft-text");
const { resolveBotRuntimeConfig } = require("./src/bot/launcher-config");
const {
  decodeMinecraftText: decodeMinecraftTextShared,
  extractModernDisplayData: extractModernDisplayDataShared,
  isPartialReadError,
  normalizeLore: normalizeLoreShared,
  readItemComponent: readItemComponentShared,
} = require("./src/bot/minecraft-components");
const { createWSServerConfig } = require("./src/bot/ws-server");
const { words: ignoredMessages } = require("./config/ignore.json");
const {
  initDiscordPresence,
  updateDiscordPresence,
  shutdownDiscordPresence,
} = require("./fn/discord");
const appConfig = require("./config.json");

module.exports = function (profile) {
  const { username, version, ip } = profile;
  const port = Number.parseInt(profile.port ?? "25565", 10) || 25565;
  const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const runtimeCfg = resolveBotRuntimeConfig(appConfig, version);
  const {
    launcherConfig,
    discordClientId,
    reconnectDelayMs,
    authRecoveryWindowMs,
    maxReconnectAttempts,
    reconnectBackoffMaxMs,
    reconnectJitterRatio,
    velocityCompatMode,
    verboseMode,
    debugLifecycleSetting,
    versionCandidates,
  } = runtimeCfg;
  const verboseTrafficLogs = verboseMode === "all";
  let currentVersionIndex = 0;
  console.log(
    `🤖 [Mineflayer] Started Mineflayer in offline/no premium mode with user ${username} in version ${version}. Server: ${ip}:${port} | velocityCompatMode=${velocityCompatMode}`,
  );
  let bot = null;

  function getActiveVersion() {
    return (
      versionCandidates[currentVersionIndex] ||
      String(version || "").trim() ||
      "1.20.1"
    );
  }

  function buildBotOptions() {
    const activeVersion = getActiveVersion();
    return {
      host: `${ip}`,
      port,
      username: username,
      auth: "offline",
      version: `${activeVersion}`,
      keepAlive: true,
      hideErrors: true,
      logErrors: false,
      connectTimeout: 60000,
    };
  }

  const webClients = new Set();
  const personalInventoryTokens = new Map();
  const recentChatLines = new Map();
  const pendingOutboundEchoes = new Map();
  const chatHistory = [];
  let activeMenu = null;
  let activeMenuToken = 0;
  let activeMenuWindow = null;
  let activeMenuUpdateHandler = null;
  let activeMenuRefreshTimer = null;
  let menuTransitionLocked = false;
  let menuTransitionTimer = null;
  let ChatMessage = null;
  const runtimeState = createRuntimeState();
  let botReady = runtimeState.botReady;
  let botStatus = runtimeState.botStatus;
  let reconnectInProgress = runtimeState.reconnectInProgress;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let stableSessionTimer = null;
  let spawnAt = 0;
  let lastAuthCommandAt = 0;
  let lastStableAt = 0;
  let currentHealth = runtimeState.currentHealth;
  let currentFood = runtimeState.currentFood;
  const pendingOutboundMessages = [];
  const DEDUPE_WINDOW_MS = 750;
  const CHAT_HISTORY_LIMIT = 300;
  const OUTBOUND_ECHO_WINDOW_MS = 2500;
  const ENABLE_CHAT_KEEPALIVE = false;
  const DEBUG_LIFECYCLE = String(debugLifecycleSetting).toLowerCase() !== "0";
  const lifecycleStartAt = Date.now();
  let discordPresenceClosed = false;
  let shuttingDown = false;
  let keepAliveInterval = null;
  const wsIntervals = new Set();
  let wss = null;
  let rl = null;

  function closeDiscordPresence() {
    if (discordPresenceClosed) return;
    discordPresenceClosed = true;
    shutdownDiscordPresence();
  }

  function isShuttingDown() {
    return shuttingDown;
  }

  function debugLog(event, details = "") {
    if (!DEBUG_LIFECYCLE) {
      return;
    }

    const elapsed = Date.now() - lifecycleStartAt;
    const suffix = details ? ` | ${details}` : "";
    console.log(`[DEBUG +${elapsed}ms] ${event}${suffix}`);
  }

  console.log(
    `[DiscordRPC] bootstrap from minelight: verboseMode=${verboseMode} debugLifecycle=${DEBUG_LIFECYCLE ? "1" : "0"} clientIdLen=${discordClientId.length}`,
  );
  initDiscordPresence({
    clientId: discordClientId,
    verboseMode,
    debugLifecycle: DEBUG_LIFECYCLE,
  });
  updateDiscordPresence({
    serverIp: "Waiting for server...",
    version: getActiveVersion(),
    username,
  });

  function isIgnored(message) {
    const text = String(message ?? "");
    return ignoredMessages.some((pattern) => text.includes(pattern));
  }

  function shouldSuppressDuplicate(text, source) {
    const normalized = String(text ?? "").trim();
    if (!normalized) {
      return true;
    }

    const key = `${source}:${normalized}`;
    const now = Date.now();
    const lastSeen = recentChatLines.get(key) || 0;

    if (now - lastSeen < DEDUPE_WINDOW_MS) {
      return true;
    }

    recentChatLines.set(key, now);

    for (const [entryKey, timestamp] of recentChatLines.entries()) {
      if (now - timestamp > DEDUPE_WINDOW_MS) {
        recentChatLines.delete(entryKey);
      }
    }

    return false;
  }

  function normalizeChatKey(text) {
    return String(text ?? "")
      .trim()
      .toLowerCase();
  }

  function prunePendingOutboundEchoes() {
    const now = Date.now();
    for (const [key, expiry] of pendingOutboundEchoes.entries()) {
      if (expiry <= now) {
        pendingOutboundEchoes.delete(key);
      }
    }
  }

  function markOutboundEcho(text) {
    const key = normalizeChatKey(text);
    if (!key) {
      return;
    }

    pendingOutboundEchoes.set(key, Date.now() + OUTBOUND_ECHO_WINDOW_MS);
    prunePendingOutboundEchoes();
  }

  function consumeOutboundEcho(text, { fuzzy = false } = {}) {
    const key = normalizeChatKey(text);
    prunePendingOutboundEchoes();

    if (key && pendingOutboundEchoes.has(key)) {
      pendingOutboundEchoes.delete(key);
      return true;
    }

    if (fuzzy && key) {
      for (const pendingKey of pendingOutboundEchoes.keys()) {
        if (pendingKey && key.includes(pendingKey)) {
          pendingOutboundEchoes.delete(pendingKey);
          return true;
        }
      }
    }

    return false;
  }

  function pushChatHistory(entry) {
    chatHistory.push(entry);
    if (chatHistory.length > CHAT_HISTORY_LIMIT) {
      chatHistory.splice(0, chatHistory.length - CHAT_HISTORY_LIMIT);
    }
  }

  function broadcastChatHistory(ws) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(
      JSON.stringify({
        type: "chatHistory",
        sessionId,
        history: chatHistory,
      }),
    );
  }

  function broadcastSidebarState(status) {
    botStatus = status;
    broadcast({
      type: "sidebar",
      ping: 0,
      version: getActiveVersion(),
      username: username,
      port,
      time: new Date().toLocaleDateString(),
      server: ip,
      sessionId,
      chatHistory,
      botStatus,
      health: currentHealth,
      food: currentFood,
    });
  }

  function refreshVitalsFromBot() {
    const vitals = extractVitals(bot);
    currentHealth = vitals.health;
    currentFood = vitals.food;
  }

  function broadcastVitals() {
    refreshVitalsFromBot();
    broadcast({
      type: "vitals",
      health: currentHealth,
      food: currentFood,
    });
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function clearStableSessionTimer() {
    if (stableSessionTimer) {
      clearTimeout(stableSessionTimer);
      stableSessionTimer = null;
    }
  }

  function computeReconnectDelay(attempt) {
    const base = Math.max(250, reconnectDelayMs);
    const exp = Math.min(Math.max(1, attempt), 12) - 1;
    const capped = Math.min(reconnectBackoffMaxMs, Math.round(base * 2 ** exp));
    const jitter = Math.round(
      capped * reconnectJitterRatio * (Math.random() * 2 - 1),
    );
    return Math.max(200, capped + jitter);
  }

  function markAuthCommandIfNeeded(text) {
    const line = String(text || "")
      .trim()
      .toLowerCase();
    if (!line) return;
    if (line.startsWith("/login")) {
      lastAuthCommandAt = Date.now();
      debugLog("auth:command", `captured=${line}`);
    }
  }

  function classifyDisconnectEvent({
    eventType,
    reasonText,
    loggedIn,
    wasReady,
  }) {
    const now = Date.now();
    const normalizedReason = String(reasonText || "").toLowerCase();
    const sinceSpawn = spawnAt > 0 ? now - spawnAt : Number.POSITIVE_INFINITY;
    const sinceAuth =
      lastAuthCommandAt > 0
        ? now - lastAuthCommandAt
        : Number.POSITIVE_INFINITY;

    if (!wasReady || loggedIn === false) {
      return {
        reasonType: "pre_spawn_transient",
        phase: "pre-spawn",
        sinceSpawn,
        sinceAuth,
      };
    }

    const looksProxyInternal =
      normalizedReason.includes("internal error occurred in your connection") ||
      normalizedReason.includes("proxy") ||
      normalizedReason.includes("velocity");

    if (
      sinceAuth <= authRecoveryWindowMs ||
      sinceSpawn <= authRecoveryWindowMs ||
      looksProxyInternal
    ) {
      return {
        reasonType: "post_auth_transient",
        phase: "post-auth",
        sinceSpawn,
        sinceAuth,
      };
    }

    return { reasonType: "fatal", phase: eventType, sinceSpawn, sinceAuth };
  }

  function finishReconnectCycle({ fatal = false, message = "" } = {}) {
    reconnectInProgress = false;
    if (fatal) {
      reconnectAttempt = 0;
    }
    broadcast({
      type: "reconnectState",
      busy: false,
      message: message || "",
      attempt: reconnectAttempt,
      maxAttempts: maxReconnectAttempts,
      reasonType: fatal ? "fatal" : "recovered",
    });
  }

  function scheduleAdaptiveReconnect({
    reasonType,
    phase,
    reasonText,
    resetVersionCycle = false,
  }) {
    if (isShuttingDown()) {
      return true;
    }
    if (!velocityCompatMode) {
      return false;
    }

    if (reconnectInProgress) {
      debugLog(
        "reconnect:ignored",
        `already in progress reasonType=${reasonType}`,
      );
      return true;
    }

    if (reconnectAttempt >= maxReconnectAttempts) {
      debugLog(
        "reconnect:exhausted",
        `reasonType=${reasonType} attempts=${reconnectAttempt}`,
      );
      broadcastSidebarState("offline");
      finishReconnectCycle({
        fatal: true,
        message: "Can't connect to proxy after multiple attempts.",
      });
      return true;
    }

    reconnectAttempt += 1;
    const delayMs = computeReconnectDelay(reconnectAttempt);
    const uptimeSinceSpawn = spawnAt > 0 ? Date.now() - spawnAt : -1;

    debugLog(
      "reconnect:schedule",
      `reasonType=${reasonType} phase=${phase} attempt=${reconnectAttempt}/${maxReconnectAttempts} delayMs=${delayMs} uptimeSinceSpawn=${uptimeSinceSpawn}`,
    );

    requestLocalRestart({
      resetVersionCycle,
      delayMs,
      reasonType,
      reasonText,
      attempt: reconnectAttempt,
      maxAttempts: maxReconnectAttempts,
      showOffline: false,
    });
    return true;
  }

  function handleDisconnectEvent(
    eventType,
    { reasonText = "", loggedIn = null } = {},
  ) {
    if (isShuttingDown()) {
      return true;
    }
    const wasReady = botReady;
    const classification = classifyDisconnectEvent({
      eventType,
      reasonText,
      loggedIn,
      wasReady,
    });
    const details = `reasonType=${classification.reasonType} phase=${classification.phase} sinceSpawn=${classification.sinceSpawn} sinceAuth=${classification.sinceAuth}`;
    debugLog(`disconnect:${eventType}`, details);

    if (
      classification.reasonType === "pre_spawn_transient" &&
      scheduleVersionRetry(`${eventType}-before-spawn`)
    ) {
      return true;
    }

    if (
      classification.reasonType === "pre_spawn_transient" ||
      classification.reasonType === "post_auth_transient"
    ) {
      return scheduleAdaptiveReconnect({
        reasonType: classification.reasonType,
        phase: classification.phase,
        reasonText,
        resetVersionCycle: false,
      });
    }

    return false;
  }

  function createBotInstance() {
    if (isShuttingDown()) {
      return bot;
    }
    debugLog(
      "bot:create",
      `host=${ip} version=${getActiveVersion()} ready=${botReady} attempt=${currentVersionIndex + 1}/${versionCandidates.length}`,
    );
    if (bot) {
      try {
        debugLog(
          "bot:dispose",
          "removing listeners and ending previous instance",
        );
        bot.removeAllListeners();
        bot.end("reconnect");
      } catch {
        // ignore
      }
    }

    // Start of a new connection cycle: allow this instance to schedule retries
    // if it fails before spawn/login.
    reconnectInProgress = false;
    botReady = false;
    botStatus = "connecting";
    broadcastSidebarState("connecting");

    bot = mineflayer.createBot(buildBotOptions());
    debugLog("bot:created", `username=${username}`);
    registerBotEvents(bot);
    return bot;
  }

  function requestLocalRestart({
    resetVersionCycle = false,
    delayMs = reconnectDelayMs,
    reasonType = "manual",
    reasonText = "",
    attempt = reconnectAttempt,
    maxAttempts = maxReconnectAttempts,
    showOffline = false,
  } = {}) {
    if (isShuttingDown()) {
      return;
    }
    if (reconnectInProgress) {
      debugLog("reconnect:ignored", "already in progress");
      return;
    }

    if (resetVersionCycle) {
      currentVersionIndex = 0;
    }

    reconnectInProgress = true;
    debugLog("reconnect:start", "recreating bot inside current process");
    if (showOffline) {
      broadcastSidebarState("offline");
    } else {
      broadcastSidebarState("reconnecting");
    }
    broadcast({
      type: "reconnectState",
      busy: true,
      message: "Reconnecting to proxy...",
      attempt,
      maxAttempts,
      reasonType,
      reasonText: sanitizeVisibleText(reasonText),
    });

    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      try {
        debugLog("reconnect:spawn-bot", "calling createBotInstance()");
        createBotInstance();
      } catch (error) {
        reconnectInProgress = false;
        broadcastSidebarState("offline");
        broadcast({
          type: "reconnectState",
          busy: false,
          message: "Can't reconnect to proxy.",
        });
        console.log("❌ Error recreating the bot:", error);
      }
    }, delayMs);
  }

  function scheduleVersionRetry(reason) {
    if (!velocityCompatMode) {
      return false;
    }

    if (currentVersionIndex >= versionCandidates.length - 1) {
      return false;
    }

    currentVersionIndex += 1;
    debugLog(
      "bot:retry-version",
      `next=${getActiveVersion()} reason=${reason}`,
    );
    requestLocalRestart({ resetVersionCycle: false });
    return true;
  }

  function getChatDecoder() {
    if (!ChatMessage) {
      ChatMessage = require("prismarine-chat")(bot.registry);
    }
    return ChatMessage;
  }

  function decodeMinecraftText(input) {
    return decodeMinecraftTextShared(input, getChatDecoder);
  }

  function sanitizeVisibleText(input) {
    return sanitizeVisibleTextShared(input);
  }

  function simplifyNbt(tag) {
    if (!tag) {
      return null;
    }

    try {
      return nbt.simplify(tag);
    } catch {
      return null;
    }
  }

  function normalizeLore(rawLore) {
    return normalizeLoreShared(rawLore, decodeMinecraftText);
  }

  function readItemComponent(item, candidates) {
    return readItemComponentShared(item, candidates);
  }

  function extractModernDisplayData(item) {
    return extractModernDisplayDataShared(item, decodeMinecraftText);
  }

  function handleMenuReadError(error, context = "menu") {
    if (isPartialReadError(error)) {
      debugLog(
        `${context}:partial-read`,
        "ignoring truncated packet while menu is changing",
      );
      return true;
    }

    return false;
  }

  function broadcast(payload) {
    const data = JSON.stringify(payload);
    for (const ws of webClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  function emitChatLine(text, source = "chat") {
    const line = sanitizeVisibleText(text);
    if (!line || isIgnored(line)) {
      return;
    }

    if (consumeOutboundEcho(line)) {
      return;
    }

    if (shouldSuppressDuplicate(line, source)) {
      return;
    }

    if (verboseTrafficLogs) {
      const prefix =
        source === "player"
          ? "[CHAT]"
          : source === "system"
            ? "[SYSTEM]"
            : "[SERVER]";
      console.log(`${prefix} ${line}`);
    }
    pushChatHistory({ text: line, source });
    broadcast({ type: "chat", text: line, source });
  }

  function sendLocalChatLine(text, origin = "console") {
    const line = sanitizeVisibleText(text);
    if (!line || isIgnored(line)) {
      return;
    }
    markAuthCommandIfNeeded(line);

    markOutboundEcho(line);
    if (verboseTrafficLogs) {
      console.log(`[CHAT:${origin}] ${line}`);
    }

    if (!botReady) {
      pendingOutboundMessages.push(line);
      return;
    }

    try {
      bot.chat(line);
    } catch (error) {
      console.log("❌ Error sending chat to bot:", error);
    }
  }

  function flushPendingOutboundMessages() {
    if (!botReady || pendingOutboundMessages.length === 0) {
      return;
    }

    while (pendingOutboundMessages.length > 0) {
      const nextMessage = pendingOutboundMessages.shift();
      try {
        bot.chat(nextMessage);
      } catch (error) {
        console.log("❌ Error sending pending chat to bot:", error);
      }
    }
  }

  function serializeItem(item, slot) {
    if (!item) {
      return null;
    }

    const simplifiedNbt = simplifyNbt(item.nbt);
    const displayTag =
      simplifiedNbt?.display ?? item?.nbt?.value?.display?.value ?? null;
    const modernDisplay = extractModernDisplayData(item);
    const rawName =
      modernDisplay.customName ||
      displayTag?.Name ||
      item.customName ||
      item.displayName ||
      item.name ||
      "Elemento";
    const rawLore =
      modernDisplay.lore.length > 0
        ? modernDisplay.lore
        : displayTag?.Lore || item.customLore || null;

    const customName = decodeMinecraftText(rawName).trim();
    const lore =
      Array.isArray(rawLore) && rawLore.length > 0
        ? normalizeLore(rawLore)
        : modernDisplay.lore;
    const baseName =
      decodeMinecraftText(item.name || "unknown").trim() || "unknown";
    const displayName =
      customName ||
      decodeMinecraftText(item.displayName || baseName).trim() ||
      baseName;
    const searchText = [
      displayName,
      baseName,
      customName,
      ...lore,
      item.customName,
      ...(Array.isArray(item.customLore)
        ? item.customLore
        : item.customLore
          ? [item.customLore]
          : []),
    ]
      .filter(Boolean)
      .map((entry) => decodeMinecraftText(entry).toLowerCase())
      .join(" ");

    return {
      slot,
      name: baseName,
      customName: sanitizeVisibleText(customName) || null,
      displayName: sanitizeVisibleText(displayName),
      lore: Array.isArray(lore)
        ? lore.map(sanitizeVisibleText).filter(Boolean)
        : [],
      searchText: sanitizeVisibleText(searchText),
      count: item.count || 1,
    };
  }

  function sendInventorySnapshot(ws, tokenOverride = null) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !bot || !botReady) {
      return;
    }

    const items = bot.inventory.items();
    const slots = items
      .map((item) => serializeItem(item, item.slot))
      .filter(Boolean);

    const token =
      tokenOverride ||
      (activeMenu && activeMenu.token) ||
      "personal-inventory-" + Date.now();
    ws.send(
      JSON.stringify({
        type: "menu",
        menu: {
          token,
          windowId: "inventory",
          title: "Bot Inventory",
          slotCount: 36,
          slots,
        },
      }),
    );

    personalInventoryTokens.set(ws, token);
  }

  function serializeMenu(window, token) {
    if (!window) {
      return null;
    }

    let rawSlots = null;
    let rawTitle = null;
    let slots = [];
    try {
      rawSlots = window.slots;
      rawTitle = window.title;

      slots = Array.isArray(rawSlots)
        ? rawSlots
            .map((item, slot) => serializeItem(item, slot))
            .filter(Boolean)
        : [];
    } catch (error) {
      if (handleMenuReadError(error, "menu:serialize")) {
        return null;
      }
      throw error;
    }

    return {
      token,
      windowId: window.id,
      title: sanitizeVisibleText(decodeMinecraftText(rawTitle || "Menu")),
      slotCount: Array.isArray(rawSlots) ? rawSlots.length : 0,
      slots,
    };
  }

  function cancelMenuRefresh() {
    if (activeMenuRefreshTimer) {
      clearTimeout(activeMenuRefreshTimer);
      activeMenuRefreshTimer = null;
    }
  }

  function broadcastMenu(window, { newToken = false, token = null } = {}) {
    if (typeof token === "number" && Number.isFinite(token)) {
      activeMenuToken = token;
    } else if (newToken || !activeMenu) {
      activeMenuToken += 1;
    }

    try {
      activeMenu = serializeMenu(window, activeMenuToken);
    } catch (error) {
      if (handleMenuReadError(error, "menu:broadcast")) {
        return false;
      }
      throw error;
    }
    if (!activeMenu) {
      return false;
    }

    console.log("📋 Menú detectado:");
    console.dir(activeMenu, { depth: null, colors: true });
    broadcast({ type: "menu", menu: activeMenu });
    return true;
  }

  function retryBroadcastMenu(
    window,
    { newToken = false, attempts = 5, delayMs = 140 } = {},
  ) {
    const targetToken = newToken ? activeMenuToken + 1 : activeMenuToken;
    let remainingAttempts = attempts;

    const attempt = () => {
      if (!activeMenuWindow || !window || activeMenuWindow.id !== window.id) {
        return;
      }

      const success = broadcastMenu(window, { newToken, token: targetToken });
      if (success || remainingAttempts <= 0) {
        return;
      }

      remainingAttempts -= 1;
      setTimeout(attempt, delayMs);
    };

    setTimeout(attempt, delayMs);
  }

  function scheduleMenuRefresh(window) {
    cancelMenuRefresh();
    activeMenuRefreshTimer = setTimeout(() => {
      activeMenuRefreshTimer = null;
      if (!activeMenuWindow || !window || activeMenuWindow.id !== window.id) {
        return;
      }
      retryBroadcastMenu(window, { newToken: false, attempts: 3, delayMs: 90 });
    }, 60);
  }

  function attachWindowRealtime(window) {
    detachWindowRealtime();
    activeMenuWindow = window;

    activeMenuUpdateHandler = () => {
      if (menuTransitionLocked) {
        return;
      }
      scheduleMenuRefresh(window);
    };

    window.on("updateSlot", activeMenuUpdateHandler);
  }

  function detachWindowRealtime() {
    cancelMenuRefresh();
    if (!activeMenuWindow) {
      return;
    }

    if (activeMenuUpdateHandler) {
      activeMenuWindow.removeListener("updateSlot", activeMenuUpdateHandler);
    }
    activeMenuUpdateHandler = null;
    activeMenuWindow = null;
  }

  function closeMenu() {
    if (!activeMenu) {
      return;
    }

    activeMenu = null;
    broadcast({ type: "menuClose" });
  }

  function setMenuTransitionLocked(locked, message) {
    if (menuTransitionTimer) {
      clearTimeout(menuTransitionTimer);
      menuTransitionTimer = null;
    }

    menuTransitionLocked = locked;
    broadcast({
      type: "menuBusy",
      busy: locked,
      message: message || (locked ? "Changing server..." : ""),
    });

    if (locked) {
      menuTransitionTimer = setTimeout(() => {
        menuTransitionLocked = false;
        menuTransitionTimer = null;
        broadcast({
          type: "menuBusy",
          busy: false,
          message: "",
        });
      }, 5000);
    }
  }

  // MANAGE COMMANDS FROM TERMINAL
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });
  rl.on("line", (input) => {
    sendLocalChatLine(input, "console");
  });

  // WebSocket local para el panel Electron (sin servir UI por HTTP)
  const wsConfig = createWSServerConfig();
  wss = new WebSocket.Server({ port: wsConfig.port });
  wss.on("listening", () => {
    console.log("🔌 WebSocket local on ws://127.0.0.1:3000");
  });
  wss.on("connection", (ws) => {
    console.log("✅ Client connected");
    webClients.add(ws);
    // Enviar info inicial
    ws.send(
      JSON.stringify({
        type: "sidebar",
        ping: 0,
        version: getActiveVersion(),
        username: username,
        time: new Date().toLocaleDateString(),
        server: ip,
        sessionId,
        chatHistory,
        botStatus,
        health: currentHealth,
        food: currentFood,
      }),
    );

    if (activeMenu) {
      ws.send(JSON.stringify({ type: "menu", menu: activeMenu }));
    }

    // Actualizar ping cada 2 segundos
    const interval = setInterval(async () => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          const res = await ping.promise.probe(ip);
          ws.send(JSON.stringify({ type: "updatePing", ping: res.time }));
        } catch (err) {
          ws.send(JSON.stringify({ type: "updatePing", ping: "Error" }));
        }
      }
    }, 10000);
    wsIntervals.add(interval);

    // Recibir mensajes del cliente web y enviarlos al chat del bot
    ws.on("message", (msg) => {
      const raw = msg.toString().trim();
      if (!raw) {
        return;
      }

      try {
        const data = JSON.parse(raw);
        if (data && data.type === "reconnectRequest") {
          requestLocalRestart();
          return;
        }

        if (data && data.type === "inventoryRequest") {
          if (!bot || !botReady) {
            return;
          }
          const inventoryToken = "personal-inventory-" + Date.now();
          sendInventorySnapshot(ws, inventoryToken);
          return;
        }

        if (data && data.type === "menuAction") {
          const slot = Number(data.slot);
          if (!Number.isInteger(slot) || slot < 0) {
            return;
          }

          const clickType = String(data.clickType || "left").toLowerCase();
          const mouseButton = clickType === "right" ? 1 : 0;
          const personalInventoryToken = personalInventoryTokens.get(ws);
          const isPersonalInventoryAction = Boolean(
            personalInventoryToken && data.token === personalInventoryToken,
          );

          if (isPersonalInventoryAction) {
            if (!bot || !botReady) {
              return;
            }

            try {
              if (clickType === "use") {
                const item =
                  bot.inventory.slots[slot] ||
                  bot.inventory.items().find((i) => i.slot === slot);
                if (item) {
                  const armorDestination = getArmorDestination(item.name);

                  if (armorDestination) {
                    bot
                      .unequip(armorDestination)
                      .catch(() => {
                        // Puede estar vacío; ignorar.
                      })
                      .finally(() => {
                        bot.equip(item, armorDestination).catch((err) => {
                          console.log("❌ Error equipping armor:", err);
                        });
                      });
                    setTimeout(
                      () => sendInventorySnapshot(ws, personalInventoryToken),
                      220,
                    );
                    return;
                  }

                  if (isLikelyFood(item.name)) {
                    bot
                      .equip(item, "hand")
                      .then(async () => {
                        if (typeof bot.consume === "function") {
                          await bot.consume();
                        } else {
                          bot.activateItem(false);
                        }
                      })
                      .catch((err) => {
                        console.log("❌ Error consuming food:", err);
                      });
                    setTimeout(
                      () => sendInventorySnapshot(ws, personalInventoryToken),
                      350,
                    );
                    return;
                  }

                  bot
                    .equip(item, "hand")
                    .then(() => {
                      bot.activateItem(false);
                    })
                    .catch((err) => {
                      console.log("❌ Error equipping item:", err);
                    });
                  setTimeout(
                    () => sendInventorySnapshot(ws, personalInventoryToken),
                    220,
                  );
                }
                return;
              }

              bot.clickWindow(slot, mouseButton, 0);

              // Enviar el inventario actualizado al cliente
              setTimeout(
                () => sendInventorySnapshot(ws, personalInventoryToken),
                200,
              );
            } catch (error) {
              console.log("❌ Error clicking inventory:", error);
            }
            return;
          }

          if (!activeMenu || data.token !== activeMenu.token) {
            return;
          }

          if (menuTransitionLocked) {
            return;
          }

          if (!bot.currentWindow) {
            return;
          }

          menuTransitionLocked = true;
          setMenuTransitionLocked(true, "Changing server...");
          setTimeout(() => {
            try {
              if (bot.currentWindow) {
                bot.clickWindow(slot, mouseButton, 0);
              } else {
                menuTransitionLocked = false;
                setMenuTransitionLocked(false);
              }
            } catch (error) {
              menuTransitionLocked = false;
              setMenuTransitionLocked(false);
              console.log("❌ Error clicking menu:", error);
            }
          }, 180);
          return;
        }
      } catch {
        // Plain text falls through to chat.
      }

      sendLocalChatLine(raw, "web");
    });

    // Limpiar listeners al cerrar conexión
    ws.on("close", () => {
      webClients.delete(ws);
      personalInventoryTokens.delete(ws);
      clearInterval(interval);
      wsIntervals.delete(interval);
      console.log("❌ Client disconnected");
    });
  });

  // KEEP ALIVE
  // Mineflayer ya maneja el keep-alive del protocolo.
  // Evitamos enviar /ping automáticamente porque en algunos servidores
  // se interpreta como comando real y puede provocar kicks o errores internos.
  if (ENABLE_CHAT_KEEPALIVE) {
    keepAliveInterval = setInterval(() => {
      if (menuTransitionLocked) return;
      if (bot.player) return bot.chat("/ping");
    }, 24000);
  }

  function registerBotEvents(currentBot) {
    const isKeepAliveTimeoutError = (err) => {
      const message = String(err?.message || err || "").toLowerCase();
      return message.includes("client timed out after");
    };

    const attachClientErrorHandler = () => {
      if (!currentBot?._client || currentBot._client.__mcBetaErrorHandlerAttached) {
        return;
      }
      currentBot._client.__mcBetaErrorHandlerAttached = true;
      currentBot._client.on("error", (err) => {
        if (handleMenuReadError(err, "client:error")) {
          return;
        }
        if (isKeepAliveTimeoutError(err)) {
          debugLog(
            "client:keepalive-timeout",
            err && err.message ? err.message : String(err),
          );
          return;
        }
        debugLog(
          "client:error",
          err && err.message ? err.message : String(err),
        );
      });
    };

    attachClientErrorHandler();
    const lazyClientErrorBinder = setInterval(() => {
      if (!currentBot || isShuttingDown()) {
        clearInterval(lazyClientErrorBinder);
        return;
      }
      attachClientErrorHandler();
      if (currentBot._client?.__mcBetaErrorHandlerAttached) {
        clearInterval(lazyClientErrorBinder);
      }
    }, 250);

    // JOIN A SERVER MODE
    currentBot.on("windowOpen", (window) => {
      const parsedTitle = sanitizeVisibleText(
        decodeMinecraftText(window.title),
      );
      console.log(`📂 Menu opened: ${parsedTitle || "[no title]"}`);
      menuTransitionLocked = false;
      setMenuTransitionLocked(false);
      attachWindowRealtime(window);
      retryBroadcastMenu(window, { newToken: true, attempts: 5, delayMs: 140 });
    });

    currentBot.on("windowClose", () => {
      console.log("📂 Menu closed");
      menuTransitionLocked = false;
      setMenuTransitionLocked(false);
      detachWindowRealtime();
      closeMenu();
    });

    // MAIN EVENTS
    currentBot.on("login", () => {
      debugLog("bot:login", `username=${currentBot.username}`);
      reconnectInProgress = false;
    });

    currentBot.on("spawn", () => {
      debugLog("bot:spawn", `username=${currentBot.username}`);
      botReady = true;
      reconnectInProgress = false;
      spawnAt = Date.now();
      clearReconnectTimer();
      clearStableSessionTimer();
      menuTransitionLocked = false;
      setMenuTransitionLocked(false);
      updateDiscordPresence({
        serverIp: ip,
        version: getActiveVersion(),
        username: currentBot.username || username,
      });
      currentBot.settings.chat = "enabled";
      refreshVitalsFromBot();
      broadcastSidebarState("online");
      broadcastVitals();
      broadcast({
        type: "reconnectState",
        busy: false,
        message: "",
        attempt: reconnectAttempt,
        maxAttempts: maxReconnectAttempts,
        reasonType: "recovered",
      });
      console.log(`✅ Logued as ${currentBot.username}`);
      emitChatLine(`✅ Logued as ${currentBot.username}`, "system");
      flushPendingOutboundMessages();
      setTimeout(() => {
        //currentBot.chat("/modalidades");
      }, 5000);
      stableSessionTimer = setTimeout(() => {
        reconnectAttempt = 0;
        lastStableAt = Date.now();
        debugLog("session:stable", `at=${lastStableAt}`);
      }, 12000);
    });

    currentBot.once("login", () => {
      console.log("🔐 Login completed, waiting for spawn...");
    });

    currentBot.on("health", () => {
      broadcastVitals();
    });

    currentBot.on("respawn", () => {
      broadcastVitals();
    });

    // CHAT HANDLER

    currentBot.on("chat", (senderUsername, message) => {
      emitChatLine(`${senderUsername}: ${message}`, "player");
    });

    currentBot.on("messagestr", (message, position) => {
      const cleanMessage = sanitizeVisibleText(message);
      if (!cleanMessage) {
        return;
      }

      if (position === "chat") {
        if (consumeOutboundEcho(cleanMessage, { fuzzy: true })) {
          emitChatLine(cleanMessage, "player");
        }
        return;
      }

      emitChatLine(cleanMessage, "server");
    });

    // OPTIONS
    currentBot.setMaxListeners(50); // Por ejemplo, 50 listeners

    // MANAGE DISCONNECTIONS & ERRORS
    currentBot.on("kicked", (reason, loggedIn) => {
      const decodedReason = decodeMinecraftText(reason);
      debugLog(
        "bot:kicked",
        `loggedIn=${loggedIn} reason=${decodedReason || "unknown"}`,
      );
      menuTransitionLocked = false;
      setMenuTransitionLocked(false);
      detachWindowRealtime();
      botReady = false;
      pendingOutboundMessages.length = 0;
      currentHealth = null;
      currentFood = null;
      clearStableSessionTimer();
      if (
        handleDisconnectEvent("kicked", { reasonText: decodedReason, loggedIn })
      ) {
        return;
      }
      reconnectInProgress = false;
      broadcastSidebarState("offline");
      finishReconnectCycle({
        fatal: true,
        message: "Connection closed by the server.",
      });
      console.log(
        "❌ Kicked:",
        sanitizeVisibleText(decodedReason),
        sanitizeVisibleText(JSON.stringify(reason)),
        "(loggedIn:",
        loggedIn,
        ")",
      );
    });

    currentBot.on("disconnect", (reason) => {
      debugLog("bot:disconnect", `reason=${String(reason || "unknown")}`);
      botReady = false;
      pendingOutboundMessages.length = 0;
      currentHealth = null;
      currentFood = null;
      clearStableSessionTimer();
      if (
        handleDisconnectEvent("disconnect", {
          reasonText: String(reason || "unknown"),
        })
      ) {
        return;
      }
      reconnectInProgress = false;
      broadcastSidebarState("offline");
      finishReconnectCycle({ fatal: true, message: "Session disconnected." });
      console.log(`🔌 Session closed: ${sanitizeVisibleText(reason)}`);
    });

    currentBot.on("error", (err) => {
      if (handleMenuReadError(err, "bot:error")) {
        return;
      }
      debugLog("bot:error", err && err.message ? err.message : String(err));
      console.log("❌ Error:", err);
    });

    currentBot.on("end", () => {
      clearInterval(lazyClientErrorBinder);
      debugLog("bot:end", "connection ended");
      botReady = false;
      pendingOutboundMessages.length = 0;
      currentHealth = null;
      currentFood = null;
      clearStableSessionTimer();
      if (handleDisconnectEvent("end", { reasonText: "connection ended" })) {
        return;
      }
      reconnectInProgress = false;
      broadcastSidebarState("offline");
      finishReconnectCycle({ fatal: true, message: "Session disconnected." });
      console.log("🔌 Disconnected from the server");
    });

    // CHUNKS MANAGER
    currentBot.on("chunkColumnLoad", (chunk) => {
      try {
        // procesamiento de chunk si lo necesitas
      } catch (err) {
        console.log("❌ Error loading chunk, ignoring...");
      }
    });

    currentBot.on("chunkColumnUnload", (chunk) => {
      // opcional, solo para depuración
    });
  }

  const onUncaughtException = (err) => {
    if (handleMenuReadError(err, "process:uncaughtException")) {
      return;
    }
    console.log("❌ UncaughtException:", err);
    closeDiscordPresence();
  };
  const onUnhandledRejection = (reason, promise) => {
    if (handleMenuReadError(reason, "process:unhandledRejection")) {
      return;
    }
    console.log("❌ UnhadleRejection:", promise, "reason:", reason);
    closeDiscordPresence();
  };
  const onProcessExit = () => {
    closeDiscordPresence();
  };
  process.on("uncaughtException", onUncaughtException);
  process.on("unhandledRejection", onUnhandledRejection);
  process.on("exit", onProcessExit);

  async function stop() {
    if (shuttingDown) return;
    shuttingDown = true;
    reconnectInProgress = false;
    menuTransitionLocked = false;
    clearReconnectTimer();
    clearStableSessionTimer();
    cancelMenuRefresh();
    if (menuTransitionTimer) {
      clearTimeout(menuTransitionTimer);
      menuTransitionTimer = null;
    }
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    for (const interval of wsIntervals) {
      clearInterval(interval);
    }
    wsIntervals.clear();
    for (const ws of webClients) {
      try {
        ws.close();
      } catch {}
    }
    webClients.clear();
    personalInventoryTokens.clear();
    detachWindowRealtime();
    closeMenu();

    if (wss) {
      await new Promise((resolve) => {
        try {
          wss.close(() => resolve());
        } catch {
          resolve();
        }
      });
      wss = null;
    }

    if (rl) {
      try {
        rl.close();
      } catch {}
      rl = null;
    }

    process.removeListener("uncaughtException", onUncaughtException);
    process.removeListener("unhandledRejection", onUnhandledRejection);
    process.removeListener("exit", onProcessExit);

    if (bot) {
      try {
        bot.removeAllListeners();
        bot.end("session_closed_by_user");
      } catch {}
      bot = null;
    }

    closeDiscordPresence();
  }

  createBotInstance();

  return { stop };
};
