var launcherAPI = window.launcherAPI || null;
let ws = null;
let reconnectSocketTimer = null;
let manualSocketClose = false;
let activeMenu = null;
let menuQuery = "";
let menuBusyState = false;
let currentSessionId = null;
let chatHistory = [];
const chatHistoryLimit = 400;
const inputHistoryLimit = 40;
const inputHistory = [];
let inputHistoryIndex = -1;
let inputDraft = "";
const hiddenBaseNames = new Set();

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const chat = $("chat");
const input = $("input");
const reconnectPanel = $("reconnect-panel");
const reconnectButton = $("reconnect-button");
const reconnectSubtitle = reconnectPanel?.querySelector(".reconnect-subtitle");
const reconnectAttempt = reconnectPanel?.querySelector(".reconnect-attempt");
const menuPanel = $("menu-panel");
const menuTitle = $("menu-title");
const menuMeta = $("menu-meta");
const menuSearch = $("menu-search");
const menuBaseFilters = $("menu-base-filters");
const menuResults = $("menu-results");
const menuGrid = $("menu-grid");
const menuEmpty = $("menu-empty");
const menuBusy = $("menu-busy");
const sidebarKicker = document.querySelector(".sidebar-kicker");
const menuCloseBtn = $("menu-close-btn");
const inventoryButton = $("inventory-button");
const endSessionButton = $("end-session-button");
const hudHealth = $("hud-health");
const hudFood = $("hud-food");
const actionModal = $("action-modal");
const actionModalTitle = $("action-modal-title");
const actionModalText = $("action-modal-text");
const actionModalCloseBtn = $("action-modal-close-btn");
const actionBtnLeft = $("action-btn-left");
const actionBtnRight = $("action-btn-right");
const actionBtnUse = $("action-btn-use");

let socketReconnectAttempt = 0;
let onActionSelected = null;

// ── Init icons ────────────────────────────────────────────────────────────────
window.lucide?.createIcons?.({ icons: window.lucide.icons, attrs: { width: 16, height: 16, "stroke-width": 2.2 } });

// ── Helpers ───────────────────────────────────────────────────────────────────
function revealWindowWhenMenuReady() {
  document.body.style.visibility = "visible";
  launcherAPI?.menuReady?.().catch(() => { });
}

function sanitizeVisibleText(value) {
  if (window.MCShared?.sanitizeVisibleText) return window.MCShared.sanitizeVisibleText(value);
  return String(value ?? "").replace(/\uFFFD+/g, "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function formatVital(value) {
  if (window.MCShared?.formatVital) return window.MCShared.formatVital(value);
  const n = Number(value);
  return Number.isFinite(n) ? `${Math.max(0, Math.min(20, Math.round(n)))}/20` : "--/20";
}

function sendSocketMessage(payload) {
  if (ws?.readyState !== WebSocket.OPEN) return false;
  ws.send(typeof payload === "string" ? payload : JSON.stringify(payload));
  return true;
}

function setVitals(health, food) {
  hudHealth.textContent = formatVital(health);
  hudFood.textContent = formatVital(food);
}

// ── Input history ─────────────────────────────────────────────────────────────
function pushInputHistory(text) {
  text = String(text ?? "").trim();
  if (!text || inputHistory.at(-1) === text) { inputHistoryIndex = -1; inputDraft = ""; return; }
  inputHistory.push(text);
  if (inputHistory.length > inputHistoryLimit) inputHistory.shift();
  inputHistoryIndex = -1;
  inputDraft = "";
}

function stepInputHistory(direction) {
  if (!inputHistory.length) return;
  if (inputHistoryIndex === -1) { inputDraft = input.value; inputHistoryIndex = inputHistory.length; }
  inputHistoryIndex = Math.max(0, Math.min(inputHistory.length, inputHistoryIndex + direction));
  input.value = inputHistoryIndex === inputHistory.length ? inputDraft : (inputHistory[inputHistoryIndex] ?? "");
}

// ── Chat ──────────────────────────────────────────────────────────────────────
function resetChatHistory(sessionId, history = []) {
  currentSessionId = sessionId || null;
  chatHistory = Array.isArray(history) ? history.slice(-chatHistoryLimit) : [];
  chat.innerHTML = "";
  chatHistory.forEach(({ text, source, kind }) => renderLine(text, source || kind || "normal", false));
  chat.scrollTop = chat.scrollHeight;
}

const KIND_COLORS = { system: "#7dd3fc", player: "#ffffff", local: "#ffffff", server: "#fca5a5" };

function renderLine(text, kind = "normal", persist = true) {
  text = sanitizeVisibleText(text);
  if (!text) return;
  const atBottom = chat.scrollTop + chat.clientHeight >= chat.scrollHeight - 50;
  const line = document.createElement("div");
  line.textContent = text;
  if (KIND_COLORS[kind]) line.style.color = KIND_COLORS[kind];
  chat.appendChild(line);
  if (persist) {
    chatHistory.push({ text, source: kind });
    if (chatHistory.length > chatHistoryLimit) {
      chatHistory = chatHistory.slice(-chatHistoryLimit);
      while (chat.childNodes.length > chatHistoryLimit) chat.removeChild(chat.firstChild);
    }
  }
  if (atBottom) chat.scrollTop = chat.scrollHeight;
}

function appendLine(text, kind = "normal") { renderLine(text, kind, true); }

// ── Reconnect panel ───────────────────────────────────────────────────────────
function updateReconnectPanel({ visible, busy = false, buttonDisabled = false, buttonText = "Reconectar", subtitle = "", attemptText = "" }) {
  reconnectPanel.classList.toggle("visible", Boolean(visible));
  reconnectPanel.dataset.reconnectState = busy ? "trying" : "idle";
  reconnectButton.disabled = Boolean(buttonDisabled);
  reconnectButton.textContent = buttonText;
  if (reconnectSubtitle) reconnectSubtitle.textContent = subtitle || "Puedes reiniciar la conexión sin recargar la página.";
  if (reconnectAttempt) reconnectAttempt.textContent = attemptText || "";
}

function setBotStatus(status) {
  const s = String(status ?? "offline").toLowerCase();
  sidebarKicker.dataset.status = s === "online" ? "online" : s === "connecting" ? "connecting" : "offline";
  if (s === "online") {
    updateReconnectPanel({ visible: false });
  } else {
    const connecting = s === "connecting";
    updateReconnectPanel({
      visible: true,
      busy: connecting,
      buttonDisabled: connecting,
      buttonText: connecting ? "Reiniciando..." : "Reconectar",
      subtitle: connecting ? "Reconectando el bot..." : "Puedes reiniciar la conexión sin recargar la página.",
      attemptText: connecting ? "Intentando conexión..." : "Esperando acción…",
    });
  }
}

// ── Menu ──────────────────────────────────────────────────────────────────────
function clearMenu() {
  activeMenu = null;
  menuBusyState = false;
  menuPanel.classList.remove("visible", "busy");
  menuTitle.textContent = "Sin menú activo";
  menuMeta.textContent = "Cuando el servidor abra un inventario, aparecerá aquí.";
  menuResults.textContent = menuGrid.innerHTML = menuBaseFilters.innerHTML = "";
  menuEmpty.textContent = "Aún no hay opciones disponibles.";
  menuBusy.textContent = "Cambiando de servidor...";
  menuSearch.value = menuQuery = "";
}

const normalizeQueryText = (v) => String(v ?? "").trim().toLowerCase();
const getBaseLabel = (item) => normalizeQueryText(item.name ?? "");
const formatLore = (lore) => Array.isArray(lore) ? lore.map((l) => l.trim()).filter(Boolean).join("\n") : "";

function renderBaseFilters(items) {
  const counts = new Map();
  for (const item of items) {
    const b = getBaseLabel(item);
    if (b) counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  menuBaseFilters.innerHTML = "";
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([baseName, count]) => {
      const label = document.createElement("label");
      label.className = "menu-base-filter";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = hiddenBaseNames.has(baseName);
      checkbox.addEventListener("change", () => {
        hiddenBaseNames[checkbox.checked ? "add" : "delete"](baseName);
        applyMenuFilter();
      });
      const text = document.createElement("span");
      text.textContent = `Ocultar ${baseName} (${count})`;
      label.append(checkbox, text);
      menuBaseFilters.appendChild(label);
    });
}

function renderMenu(menu) {
  if (!menu || !Array.isArray(menu.slots) || !menu.slots.length) return clearMenu();
  activeMenu = menu;
  menuPanel.classList.add("visible");
  menuPanel.classList.toggle("busy", menuBusyState);
  menuTitle.textContent = menu.title || "Menú del servidor";
  menuMeta.textContent = `Slots visibles: ${menu.slots.length}/${menu.slotCount ?? menu.slots.length} | Token: ${menu.token}`;
  renderBaseFilters(menu.slots);
  menuGrid.innerHTML = "";
  applyMenuFilter();
}

function parseMenuQuery(rawQuery) {
  return { includes: String(rawQuery ?? "").trim().split(/\s+/).filter(Boolean).map(normalizeQueryText) };
}

function matchesMenuItem(item, filter) {
  if (hiddenBaseNames.has(getBaseLabel(item))) return false;
  if (!filter.includes.length) return true;
  const hay = normalizeQueryText(item.searchText);
  return filter.includes.every((t) => hay.includes(t));
}

const ICON_RULES = [
  { match: ["player_head", "head"], icon: "👤", kind: "head" },
  { match: ["sword"], icon: "⚔", kind: "utility" },
  { match: ["bow", "crossbow"], icon: "🏹", kind: "utility" },
  { match: ["barrier"], icon: "⛔", kind: "danger" },
  { match: ["chest", "shulker_box"], icon: "🧰", kind: "utility" },
  { match: ["compass"], icon: "🧭", kind: "utility" },
];

function getItemIcon(item) {
  const hay = `${item.customName ?? ""} ${item.displayName ?? ""} ${item.name ?? ""}`.toLowerCase();
  for (const rule of ICON_RULES) if (rule.match.some((t) => hay.includes(t))) return rule;
  const firstChar = (item.customName || item.displayName || item.name || "?").trim()[0]?.toUpperCase() ?? "?";
  return { icon: firstChar, kind: "block" };
}

function applyMenuFilter() {
  if (!activeMenu) return;
  const items = activeMenu.slots ?? [];
  const filter = parseMenuQuery(menuQuery);
  const visible = items.filter((i) => matchesMenuItem(i, filter));
  menuGrid.innerHTML = "";
  if (!items.length) { menuEmpty.textContent = "No hay items interactivos en este menú."; menuResults.textContent = ""; return; }
  if (!visible.length) { menuEmpty.textContent = "No hay resultados para esta búsqueda."; menuResults.textContent = `0 coincidencias de ${items.length} items`; return; }

  menuEmpty.textContent = "Haz click en un item para que el bot haga click en ese slot.";
  menuResults.textContent = `${visible.length} de ${items.length} items visibles`;

  const frag = document.createDocumentFragment();
  visible.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "menu-item";
    button.innerHTML = `<div class="menu-item-icon" aria-hidden="true"></div><div class="menu-item-body"><span class="menu-item-slot">Slot ${item.slot}</span><span class="menu-item-name"></span><span class="menu-item-count"></span><div class="menu-item-base"></div><div class="menu-item-lore"></div></div>`;

    const { icon, kind } = getItemIcon(item);
    const iconBox = button.querySelector(".menu-item-icon");
    iconBox.textContent = icon;
    iconBox.dataset.kind = kind;

    button.querySelector(".menu-item-name").textContent = item.customName || item.displayName || item.name || "Elemento";
    button.querySelector(".menu-item-count").textContent = item.count > 1 ? `x${item.count}` : "";
    button.querySelector(".menu-item-base").textContent = item.customName && item.name && item.customName !== item.name ? `Base: ${item.name}` : "";

    const loreBox = button.querySelector(".menu-item-lore");
    loreBox.textContent = formatLore(item.lore);
    loreBox.style.whiteSpace = "pre-wrap";

    button.addEventListener("click", () => {
      const snapshot = activeMenu;
      if (!snapshot) return;
      showActionModal(item, (clickType) => {
        if (snapshot.windowId !== "inventory") {
          menuBusyState = true;
          menuPanel.classList.add("busy");
          menuBusy.textContent = "Cambiando de servidor...";
          button.disabled = true;
        }
        sendSocketMessage({ type: "menuAction", token: snapshot.token, slot: item.slot, clickType });
        appendLine(`[MENU] Click ${clickType === "right" ? "derecho" : "izquierdo"} en slot ${item.slot}: ${item.displayName || item.name || "Elemento"}`, "system");
      });
    });
    frag.appendChild(button);
  });
  menuGrid.appendChild(frag);
}

// ── Action modal ──────────────────────────────────────────────────────────────
function showActionModal(item, callback) {
  const name = item.displayName || item.name || "este objeto";
  actionModalTitle.textContent = item.displayName || item.name || "Interactuar";
  actionModalText.textContent = `¿Cómo deseas hacer clic en ${name} (Slot ${item.slot})?`;
  onActionSelected = callback;
  actionModal.classList.add("visible");
  actionModal.setAttribute("aria-hidden", "false");
}

function hideActionModal() {
  actionModal.classList.remove("visible");
  actionModal.setAttribute("aria-hidden", "true");
  onActionSelected = null;
}

actionModalCloseBtn.addEventListener("click", hideActionModal);
actionBtnLeft.addEventListener("click", () => { onActionSelected?.("left"); hideActionModal(); });
actionBtnRight.addEventListener("click", () => { onActionSelected?.("right"); hideActionModal(); });
actionBtnUse.addEventListener("click", () => { onActionSelected?.("use"); hideActionModal(); });
actionModal.addEventListener("click", (e) => { if (e.target === actionModal) hideActionModal(); });

// ── WebSocket ─────────────────────────────────────────────────────────────────
const WS_HANDLERS = {
  sidebar(data) {
    $("ping").textContent = "Obteniendo...";
    $("version").textContent = data.version;
    $("username").textContent = data.username;
    $("time").textContent = data.time;
    $("server").textContent = data.server;
    $("port").textContent = data.port || "25565";
    setVitals(data.health, data.food);
    setBotStatus(data.botStatus);
    const hist = Array.isArray(data.chatHistory) ? data.chatHistory : [];
    if (data.sessionId && data.sessionId !== currentSessionId) resetChatHistory(data.sessionId, hist);
    else if (data.chatHistory) resetChatHistory(data.sessionId ?? currentSessionId, hist);
  },
  chatHistory(data) {
    const hist = Array.isArray(data.history) ? data.history : [];
    if (data.sessionId && data.sessionId !== currentSessionId) resetChatHistory(data.sessionId, hist);
    else if (data.history) resetChatHistory(data.sessionId ?? currentSessionId, hist);
  },
  updatePing(data) { $("ping").textContent = `${data.ping} ms`; },
  vitals(data) { setVitals(data.health, data.food); },
  chat(data) {
    const prefix = data.source === "player" ? "[CHAT]" : data.source === "system" ? "[SYSTEM]" : "[SERVER]";
    appendLine(`${prefix} ${data.text}`, data.source);
  },
  menu(data) { renderMenu(data.menu); },
  menuClose() { clearMenu(); },
  menuBusy(data) {
    menuBusyState = Boolean(data.busy);
    menuPanel.classList.toggle("busy", menuBusyState);
    menuBusy.textContent = data.message || "Cambiando de servidor...";
  },
  reconnectState(data) {
    const busy = Boolean(data.busy);
    updateReconnectPanel({
      visible: busy || sidebarKicker.dataset.status === "offline",
      busy,
      buttonDisabled: busy,
      buttonText: busy ? "Reiniciando..." : "Reconectar",
      subtitle: data.message || "Puedes reiniciar la conexión sin recargar la página.",
      attemptText: busy ? "Intentando conexión..." : "Esperando acción…",
    });
  },
};

function connectSocket() {
  if (reconnectSocketTimer) { clearTimeout(reconnectSocketTimer); reconnectSocketTimer = null; }
  ws = new WebSocket("ws://127.0.0.1:3000");

  ws.onopen = () => {
    socketReconnectAttempt = 0;
    if (!manualSocketClose) updateReconnectPanel({ visible: false });
  };

  ws.onmessage = ({ data: raw }) => {
    let data;
    try { data = JSON.parse(raw); } catch { appendLine(sanitizeVisibleText(String(raw))); return; }
    if (typeof data.type === "undefined") { appendLine(sanitizeVisibleText(String(raw))); return; }
    WS_HANDLERS[data.type]?.(data);
  };

  ws.onclose = () => {
    if (manualSocketClose) return;
    socketReconnectAttempt += 1;
    updateReconnectPanel({
      visible: true,
      busy: true,
      buttonDisabled: false,
      buttonText: "Reconectar",
      subtitle: "La conexión con el panel se cerró. Reintentando...",
      attemptText: `Reconectando panel (intento ${socketReconnectAttempt})`,
    });
    reconnectSocketTimer = setTimeout(connectSocket, 1200);
  };
}

// ── Controls ──────────────────────────────────────────────────────────────────
menuSearch.addEventListener("input", () => { menuQuery = menuSearch.value || ""; applyMenuFilter(); });

reconnectButton.addEventListener("click", () => {
  if (reconnectButton.disabled) return;
  updateReconnectPanel({ visible: true, busy: true, buttonDisabled: true, buttonText: "Solicitando...", subtitle: "Solicitando reinicio de conexión al bot...", attemptText: "Enviando solicitud..." });
  sendSocketMessage({ type: "reconnectRequest" });
});

menuCloseBtn.addEventListener("click", clearMenu);

inventoryButton.addEventListener("click", () => {
  if (sidebarKicker.dataset.status === "offline") return appendLine("[SISTEMA] No puedes ver el inventario porque el bot está desconectado.", "system");
  if (ws?.readyState !== WebSocket.OPEN) { appendLine("[SISTEMA] El panel no esta conectado. Reintentando conexion...", "system"); connectSocket(); return; }
  clearMenu();
  sendSocketMessage({ type: "inventoryRequest" });
});

endSessionButton?.addEventListener("click", async () => {
  endSessionButton.disabled = true;
  endSessionButton.title = "Saliendo de la partida...";
  manualSocketClose = true;
  try {
    if (ws?.readyState === WebSocket.OPEN) ws.close();
    if (launcherAPI?.returnToLauncher) {
      const result = await launcherAPI.returnToLauncher();
      if (!result?.ok) throw new Error(result?.error ?? "No se pudo volver al launcher.");
      return;
    }
    window.location.href = "launcher.html";
  } catch {
    window.location.href = "launcher.html";
  }
});

input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") { e.preventDefault(); stepInputHistory(-1); return; }
  if (e.key === "ArrowDown") { e.preventDefault(); stepInputHistory(1); return; }
  if (e.key !== "Enter") return;
  const text = input.value.trim();
  if (!text) return;
  pushInputHistory(text);
  sendSocketMessage(text);
  input.value = "";
  inputHistoryIndex = -1;
  inputDraft = "";
});

// ── Boot ──────────────────────────────────────────────────────────────────────
revealWindowWhenMenuReady();
connectSocket();