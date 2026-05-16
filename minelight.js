const mineflayer = require("mineflayer");
const readline = require("readline");
const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");
const AnsiToHtml = require("ansi-to-html");
const ping = require("ping");
const convert = new AnsiToHtml();
const { words: ignoredMessages } = require("./config/ignore.json");
const { setPresence } = require("./fn/discord");

module.exports = function (profile) {
  const { username, version, ip } = profile;
  console.log(
    `🤖 Iniciando Mineflayer con usuario ${username} en versión ${version}. Servidor: ${ip}`
  );
  // CREATE THE PLAYER
  const bot = mineflayer.createBot({
    host: `${ip}`, // puedes parametrizarlo también
    port: 25565,
    username: username, // tomado del perfil
    version: `${version}`, // tomado del perfil
    keepAlive: true,
    connectTimeout: 60000,
  });

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
      bot.chat(msg.toString());
    });

    // Enviar chat de jugadores al cliente web
    const chatListener = (username, message) => {
      if (ignoredMessages.some((p) => message.toString().includes(p))) return;
      if (username !== bot.username && ws.readyState === WebSocket.OPEN) {
        ws.send(`${username}: ${message}`);
      }
    };
    bot.on("chat", chatListener);

    // Enviar mensajes del servidor al cliente web
    const serverListener = (message) => {
      if (ignoredMessages.some((p) => message.toString().includes(p))) return;
      if (ws.readyState === WebSocket.OPEN) {
        const html = convert.toHtml(message.toAnsi());
        // Enviar mensaje al chat
        ws.send(html);

        //ws.send(`[SERVER] ${message.toString()}`);
      }
    };
    bot.on("message", serverListener);

    // Limpiar listeners al cerrar conexión
    ws.on("close", () => {
      bot.removeListener("chat", chatListener);
      bot.removeListener("message", serverListener);
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
    setTimeout(() => {
      //bot.chat("/modalidades");
    }, 5000);
  });

  // CHAT HANDLER

  bot.on("chat", (username, message) => {
    if (username === bot.username) return;
    if (ignoredMessages.some((p) => message.toString().includes(p))) return;
    console.log(`[CHAT] ${username}: ${message}`);
  });

  bot.on("message", (message) => {
    if (ignoredMessages.some((p) => message.toString().includes(p))) return;
    if (message.toString().includes("Utilice el comando /login"))
      //return bot.chat("/login cdncve123");
    console.log("[SERVER]", message.toAnsi());
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
