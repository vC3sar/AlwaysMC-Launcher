const mineflayer = require("mineflayer");
const readline = require("readline");
const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");
const ping = require("ping");
const nbt = require("prismarine-nbt");
const { words: ignoredMessages } = require("./config/ignore.json");
const { setPresence } = require("./fn/discord");

module.exports = function (profile) {
  const { username, version, ip } = profile;
  const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  console.log(
    `🤖 Iniciando Mineflayer en modo offline/no premium con usuario ${username} en versión ${version}. Servidor: ${ip}`
  );
  // CREATE THE PLAYER
  const bot = mineflayer.createBot({
    host: `${ip}`, // puedes parametrizarlo también
    port: 25565,
    username: username, // tomado del perfil
    auth: "offline",
    version: `${version}`, // tomado del perfil
    keepAlive: true,
    connectTimeout: 60000,
  });

  const webClients = new Set();
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
  const DEDUPE_WINDOW_MS = 750;
  const CHAT_HISTORY_LIMIT = 300;
  const OUTBOUND_ECHO_WINDOW_MS = 2500;
  const ENABLE_CHAT_KEEPALIVE = false;

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

  function consumeOutboundEcho(text) {
    const key = normalizeChatKey(text);
    if (!key) {
      return false;
    }

    prunePendingOutboundEchoes();
    if (!pendingOutboundEchoes.has(key)) {
      return false;
    }

    pendingOutboundEchoes.delete(key);
    return true;
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
      })
    );
  }

  function getChatDecoder() {
    if (!ChatMessage) {
      ChatMessage = require("prismarine-chat")(bot.registry);
    }
    return ChatMessage;
  }

  function decodeMinecraftText(input) {
    if (input === null || input === undefined) {
      return "";
    }

    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) {
        return "";
      }

      try {
        return decodeMinecraftText(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }

    if (typeof input === "number" || typeof input === "boolean") {
      return String(input);
    }

    if (Array.isArray(input)) {
      return input.map(decodeMinecraftText).join("");
    }

    if (typeof input === "object") {
      if (typeof input.type !== "undefined" && typeof input.value !== "undefined" && Object.keys(input).length <= 3) {
        return decodeMinecraftText(input.value);
      }

      try {
        return getChatDecoder().fromNotch(input).toString();
      } catch {
        // Fall back to manual extraction below.
      }

      if (typeof input.text !== "undefined" || typeof input.extra !== "undefined" || typeof input.translate !== "undefined") {
        const parts = [];
        if (typeof input.text !== "undefined") {
          parts.push(decodeMinecraftText(input.text));
        }
        if (typeof input.extra !== "undefined") {
          parts.push(decodeMinecraftText(input.extra));
        }
        if (typeof input.translate === "string") {
          const args = Array.isArray(input.with) ? input.with.map(decodeMinecraftText).join(" ") : "";
          parts.push([input.translate, args].filter(Boolean).join(" "));
        }
        if (parts.length > 0) {
          return parts.join("");
        }
      }

      if (typeof input.value !== "undefined") {
        return decodeMinecraftText(input.value);
      }
    }

    return String(input);
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
    const loreLines = Array.isArray(rawLore) ? rawLore : rawLore ? [rawLore] : [];
    return loreLines
      .map((line) => decodeMinecraftText(line).trim())
      .filter(Boolean);
  }

  function normalizeComponentType(type) {
    return String(type ?? "")
      .trim()
      .toLowerCase()
      .replace(/^minecraft:/, "");
  }

  function readItemComponent(item, candidates) {
    const wanted = candidates.map(normalizeComponentType);

    if (item?.componentMap instanceof Map) {
      for (const [key, component] of item.componentMap.entries()) {
        if (wanted.includes(normalizeComponentType(key))) {
          return component?.data ?? component?.value ?? component ?? null;
        }
      }
    }

    if (Array.isArray(item?.components)) {
      for (const component of item.components) {
        if (wanted.includes(normalizeComponentType(component?.type))) {
          return component?.data ?? component?.value ?? component ?? null;
        }
      }
    }

    return null;
  }

  function extractModernDisplayData(item) {
    const customNameComponent = readItemComponent(item, [
      "custom_name",
      "minecraft:custom_name",
      "display_name",
      "minecraft:display_name",
    ]);

    const loreComponent = readItemComponent(item, [
      "lore",
      "minecraft:lore",
      "custom_lore",
      "minecraft:custom_lore",
      "tooltip",
    ]);

    return {
      customName: decodeMinecraftText(customNameComponent).trim(),
      lore: normalizeLore(loreComponent),
    };
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
    const line = String(text ?? "").trim();
    if (!line || isIgnored(line)) {
      return;
    }

    if (consumeOutboundEcho(line)) {
      return;
    }

    if (shouldSuppressDuplicate(line, source)) {
      return;
    }

    const prefix = source === "player" ? "[CHAT]" : "[SERVER]";
    console.log(`${prefix} ${line}`);
    pushChatHistory({ text: line, source });
    broadcast({ type: "chat", text: line, source });
  }

  function sendLocalChatLine(text, origin = "console") {
    const line = String(text ?? "").trim();
    if (!line || isIgnored(line)) {
      return;
    }

    if (menuTransitionLocked) {
      return;
    }

    markOutboundEcho(line);
    console.log(`[LOCAL:${origin}] ${line}`);
    pushChatHistory({ text: line, source: "local" });
    broadcast({ type: "chat", text: line, source: "local" });

    try {
      bot.chat(line);
    } catch (error) {
      console.log("❌ Error enviando chat al bot:", error);
    }
  }

  function serializeItem(item, slot) {
    if (!item) {
      return null;
    }

    const simplifiedNbt = simplifyNbt(item.nbt);
    const displayTag = simplifiedNbt?.display ?? item?.nbt?.value?.display?.value ?? null;
    const modernDisplay = extractModernDisplayData(item);
    const rawName = modernDisplay.customName || displayTag?.Name || item.customName || item.displayName || item.name || "Elemento";
    const rawLore = modernDisplay.lore.length > 0 ? modernDisplay.lore : displayTag?.Lore || item.customLore || null;

    const customName = decodeMinecraftText(rawName).trim();
    const lore = Array.isArray(rawLore) && rawLore.length > 0 ? normalizeLore(rawLore) : modernDisplay.lore;
    const baseName = decodeMinecraftText(item.name || "unknown").trim() || "unknown";
    const displayName = customName || decodeMinecraftText(item.displayName || baseName).trim() || baseName;
    const searchText = [
      displayName,
      baseName,
      customName,
      ...lore,
      item.customName,
      ...(Array.isArray(item.customLore) ? item.customLore : item.customLore ? [item.customLore] : []),
    ]
      .filter(Boolean)
      .map((entry) => decodeMinecraftText(entry).toLowerCase())
      .join(" ");

    return {
      slot,
      name: baseName,
      customName: customName || null,
      displayName,
      lore,
      searchText,
      count: item.count || 1,
    };
  }

  function serializeMenu(window, token) {
    if (!window) {
      return null;
    }

    const slots = Array.isArray(window.slots)
      ? window.slots
          .map((item, slot) => serializeItem(item, slot))
          .filter(Boolean)
      : [];

    return {
      token,
      windowId: window.id,
      title: decodeMinecraftText(window.title || "Menú").trim(),
      slotCount: Array.isArray(window.slots) ? window.slots.length : 0,
      slots,
    };
  }

  function cancelMenuRefresh() {
    if (activeMenuRefreshTimer) {
      clearTimeout(activeMenuRefreshTimer);
      activeMenuRefreshTimer = null;
    }
  }

  function broadcastMenu(window, { newToken = false } = {}) {
    if (newToken || !activeMenu) {
      activeMenuToken += 1;
    }

    activeMenu = serializeMenu(window, activeMenuToken);
    if (!activeMenu) {
      return;
    }

    console.log("📋 Menú detectado:");
    console.dir(activeMenu, { depth: null, colors: true });
    broadcast({ type: "menu", menu: activeMenu });
  }

  function scheduleMenuRefresh(window) {
    cancelMenuRefresh();
    activeMenuRefreshTimer = setTimeout(() => {
      activeMenuRefreshTimer = null;
      if (!activeMenuWindow || !window || activeMenuWindow.id !== window.id) {
        return;
      }
      broadcastMenu(window, { newToken: false });
    }, 60);
  }

  function attachWindowRealtime(window) {
    detachWindowRealtime();
    activeMenuWindow = window;

    activeMenuUpdateHandler = () => {
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
      message: message || (locked ? "Cambiando de servidor..." : ""),
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
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });
  rl.on("line", (input) => {
    sendLocalChatLine(input, "console");
  });

  //manage chat from websocket
  const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, "index.html");
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end("Error cargando archivo HTML");
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    });
  });

  server.listen(3000, () =>
    console.log("🌐 Servidor HTTP en http://localhost:3000")
  );

  // WebSocket
  const wss = new WebSocket.Server({ server });
  wss.on("connection", (ws) => {
    console.log("✅ Cliente web conectado");
    webClients.add(ws);
    // Enviar info inicial
    ws.send(
      JSON.stringify({
        type: "sidebar",
        ping: 0,
        version: version,
        username: username,
        time: new Date().toLocaleDateString(),
        server: ip,
        sessionId,
      })
    );

    broadcastChatHistory(ws);

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

    // Recibir mensajes del cliente web y enviarlos al chat del bot
    ws.on("message", (msg) => {
      const raw = msg.toString().trim();
      if (!raw) {
        return;
      }

      try {
        const data = JSON.parse(raw);
        if (data && data.type === "menuAction") {
          if (!activeMenu || data.token !== activeMenu.token) {
            return;
          }

          if (menuTransitionLocked) {
            return;
          }

          const slot = Number(data.slot);
          if (!Number.isInteger(slot) || slot < 0) {
            return;
          }

          const clickType = String(data.clickType || "left").toLowerCase();
          const mouseButton = clickType === "right" ? 1 : 0;

          if (!bot.currentWindow) {
            return;
          }

          menuTransitionLocked = true;
          setMenuTransitionLocked(true, "Cambiando de servidor...");
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
              console.log("❌ Error al hacer click en el menú:", error);
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
      clearInterval(interval);
      console.log("❌ Cliente web desconectado");
    });
  });

  // KEEP ALIVE
  // Mineflayer ya maneja el keep-alive del protocolo.
  // Evitamos enviar /ping automáticamente porque en algunos servidores
  // se interpreta como comando real y puede provocar kicks o errores internos.
  if (ENABLE_CHAT_KEEPALIVE) {
    setInterval(() => {
      if (menuTransitionLocked) return;
      if (bot.player) return bot.chat("/ping");
    }, 24000);
  }

  // JOIN A SERVER MODE
  bot.on("windowOpen", (window) => {
    const parsedTitle = decodeMinecraftText(window.title).trim();
    console.log(`📂 Menú abierto: ${parsedTitle || "[sin titulo]"}`);
    console.dir(window.title, { depth: null, colors: true });
    menuTransitionLocked = false;
    setMenuTransitionLocked(false);
    attachWindowRealtime(window);
    broadcastMenu(window, { newToken: true });
  });

  bot.on("windowClose", () => {
    console.log("📂 Menú cerrado");
    menuTransitionLocked = false;
    setMenuTransitionLocked(false);
    detachWindowRealtime();
    closeMenu();
  });

  // MAIN EVENTS
  bot.on("spawn", () => {
    menuTransitionLocked = false;
    setMenuTransitionLocked(false);
    setPresence(`${ip} - ${version}`);
    bot.settings.chat = "enabled";
    console.log(`✅ Conectado como ${bot.username}`);
    broadcast({
      type: "chat",
      text: `✅ Conectado como ${bot.username}`,
      source: "system",
    });
    setTimeout(() => {
      //bot.chat("/modalidades");
    }, 5000);
  });

  // CHAT HANDLER

  bot.on("chat", (username, message) => {
    if (username === bot.username) return;
    emitChatLine(`${username}: ${message}`, "player");
  });

  bot.on("messagestr", (message, position) => {
    if (position === "chat") return;
    emitChatLine(message, "server");
  });

  // OPTIONS
  bot.setMaxListeners(50); // Por ejemplo, 50 listeners

  // MANAGE DISCONNECTIONS & ERRORS
  bot.on("kicked", (reason, loggedIn) => {
    menuTransitionLocked = false;
    setMenuTransitionLocked(false);
    detachWindowRealtime();
    console.log(
      "❌ Kicked:",
      JSON.stringify(reason),
      "(loggedIn:",
      loggedIn,
      ")"
    );
  });

  bot.on("disconnect", (reason) => {
    console.log(`🔌 Session closed: ${reason}`);
  });

  bot.on("error", (err) => {
    console.log("❌ Error:", err);
  });

  bot.on("end", () => {
    console.log("🔌 Disconnected from the server");
  });

  process.on("uncaughtException", (err) => {
    console.log("❌ UncaughtException:", err);
  });
  process.on("unhandledRejection", (reason, promise) => {
    console.log("❌ UnhadleRejection:", promise, "reason:", reason);
  });

  // CHUNKS MANAGER
  bot.on("chunkColumnLoad", (chunk) => {
    try {
      // procesamiento de chunk si lo necesitas
    } catch (err) {
      console.log("❌ Error cargando chunk, ignorando...");
    }
  });

  bot.on("chunkColumnUnload", (chunk) => {
    // opcional, solo para depuración
  });

  return bot; // por si luego lo quieres manipular desde fuera
};
