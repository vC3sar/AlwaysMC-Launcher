const mineflayer = require("mineflayer");
const readline = require("readline");
const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");
const ping = require("ping");
const { words: ignoredMessages } = require("./config/ignore.json");
const { setPresence } = require("./fn/discord");

module.exports = function (profile) {
  const { username, version, ip } = profile;
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
  const DEDUPE_WINDOW_MS = 750;

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
    if (!line || isIgnored(line) || shouldSuppressDuplicate(line, source)) {
      return;
    }

    const prefix = source === "player" ? "[CHAT]" : "[SERVER]";
    console.log(`${prefix} ${line}`);
    broadcast({ type: "chat", text: line, source });
  }

  // MANAGE COMMANDS FROM TERMINAL
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });
  rl.on("line", (input) => {
    if (input.trim().length > 0) return bot.chat(input);
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
      })
    );

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
      const text = msg.toString().trim();
      if (text.length > 0) {
        bot.chat(text);
      }
    });

    // Enviar mensajes del servidor al cliente web
    const serverListener = (message, position) => {
      if (position === "chat") return;
      emitChatLine(message, "server");
    };
    bot.on("messagestr", serverListener);

    // Limpiar listeners al cerrar conexión
    ws.on("close", () => {
      webClients.delete(ws);
      bot.removeListener("messagestr", serverListener);
      clearInterval(interval);
      console.log("❌ Cliente web desconectado");
    });
  });

  // KEEP ALIVE
  setInterval(() => {
    if (bot.player) return bot.chat("/ping");
  }, 24000);

  // JOIN A SERVER MODE
  function clickItem(slot) {
    const window = bot.currentWindow;
    if (!window) return console.log("❌ No hay inventario abierto");
    bot.clickWindow(slot, 0, 0);
  }

  bot.on("windowOpen", (window) => {
    console.log("📂 Menú abierto:", window.title);

    setTimeout(() => {
      clickItem(20); // ajusta al slot que necesites
      console.log("➡️ Clic en el servidor vanilla");
    }, 1000);
  });

  // MAIN EVENTS
  bot.on("spawn", () => {
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

  // OPTIONS
  bot.setMaxListeners(50); // Por ejemplo, 50 listeners

  // MANAGE DISCONNECTIONS & ERRORS
  bot.on("kicked", (reason, loggedIn) => {
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
