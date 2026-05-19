var launcherAPI = window.launcherAPI || null;
let ws = null;
let reconnectSocketTimer = null;
let manualSocketClose = false;
let activeMenu = null;
let menuQuery = "";
let menuBusyState = false;
let currentSessionId = null;
let chatHistory = [];
const chatHistoryLimit = 300;
const inputHistoryLimit = 30;
const inputHistory = [];
let inputHistoryIndex = -1;
let inputDraft = "";
const hiddenBaseNames = new Set();

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const reconnectPanel = document.getElementById("reconnect-panel");
const reconnectButton = document.getElementById("reconnect-button");
const reconnectSubtitle = reconnectPanel ? reconnectPanel.querySelector(".reconnect-subtitle") : null;
const reconnectAttempt = reconnectPanel ? reconnectPanel.querySelector(".reconnect-attempt") : null;
const menuPanel = document.getElementById("menu-panel");
const menuTitle = document.getElementById("menu-title");
const menuMeta = document.getElementById("menu-meta");
const menuSearch = document.getElementById("menu-search");
const menuBaseFilters = document.getElementById("menu-base-filters");
const menuResults = document.getElementById("menu-results");
const menuGrid = document.getElementById("menu-grid");
const menuEmpty = document.getElementById("menu-empty");
const menuBusy = document.getElementById("menu-busy");
const sidebarKicker = document.querySelector(".sidebar-kicker");
const menuCloseBtn = document.getElementById("menu-close-btn");
const inventoryButton = document.getElementById("inventory-button");
const endSessionButton = document.getElementById("end-session-button");
const hudHealth = document.getElementById("hud-health");
const hudFood = document.getElementById("hud-food");
let socketReconnectAttempt = 0;

if (window.lucide && typeof window.lucide.createIcons === "function") {
  window.lucide.createIcons({ icons: window.lucide.icons, attrs: { width: 16, height: 16, "stroke-width": 2.2 } });
}

function revealWindowWhenMenuReady() {
  document.body.style.visibility = "visible";
  if (launcherAPI && typeof launcherAPI.menuReady === "function") {
    launcherAPI.menuReady().catch(() => {});
  }
}

function sanitizeVisibleText(value) {
  if (window.MCShared && typeof window.MCShared.sanitizeVisibleText === "function") return window.MCShared.sanitizeVisibleText(value);
  return String(value || "").replace(/\uFFFD+/g, "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function formatVital(value) {
  if (window.MCShared && typeof window.MCShared.formatVital === "function") return window.MCShared.formatVital(value);
  const n = Number(value); if (!Number.isFinite(n)) return "--/20";
  return `${Math.max(0, Math.min(20, Math.round(n)))}/20`;
}

function sendSocketMessage(payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(typeof payload === "string" ? payload : JSON.stringify(payload));
  return true;
}

function setVitals(health, food) { hudHealth.textContent = formatVital(health); hudFood.textContent = formatVital(food); }

function pushInputHistory(value) {
  const text = String(value || "").trim();
  if (!text) return;
  if (inputHistory[inputHistory.length - 1] === text) { inputHistoryIndex = -1; inputDraft = ""; return; }
  inputHistory.push(text);
  if (inputHistory.length > inputHistoryLimit) inputHistory.splice(0, inputHistory.length - inputHistoryLimit);
  inputHistoryIndex = -1; inputDraft = "";
}

function stepInputHistory(direction) {
  if (inputHistory.length === 0) return;
  if (inputHistoryIndex === -1) { inputDraft = input.value; inputHistoryIndex = inputHistory.length; }
  inputHistoryIndex = Math.max(0, Math.min(inputHistory.length, inputHistoryIndex + direction));
  input.value = inputHistoryIndex === inputHistory.length ? inputDraft : (inputHistory[inputHistoryIndex] || "");
}

function resetChatHistory(sessionId, history = []) {
  currentSessionId = sessionId || null;
  chatHistory = Array.isArray(history) ? history.slice(-chatHistoryLimit) : [];
  chat.innerHTML = "";
  chatHistory.forEach((entry) => renderLine(entry.text, entry.source || entry.kind || "normal", false));
  chat.scrollTop = chat.scrollHeight;
}

function renderLine(text, kind = "normal", persist = true) {
  text = sanitizeVisibleText(text);
  if (!text) return;
  const wasAtBottom = chat.scrollTop + chat.clientHeight >= chat.scrollHeight - 50;
  const line = document.createElement("div");
  line.textContent = text;
  if (kind === "system") line.style.color = "#7dd3fc";
  else if (kind === "player" || kind === "local") line.style.color = "#ffffff";
  else if (kind === "server") line.style.color = "#fca5a5";
  chat.appendChild(line);

  if (persist) {
    chatHistory.push({ text, source: kind });
    if (chatHistory.length > chatHistoryLimit) {
      chatHistory = chatHistory.slice(-chatHistoryLimit);
      while (chat.childNodes.length > chatHistoryLimit) chat.removeChild(chat.firstChild);
    }
  }
  if (wasAtBottom) chat.scrollTop = chat.scrollHeight;
}

function appendLine(text, kind = "normal") { renderLine(text, kind, true); }

function updateReconnectPanel({ visible, busy = false, buttonDisabled = false, buttonText = "Reconectar", subtitle = "", attemptText = "" }) {
  reconnectPanel.classList.toggle("visible", Boolean(visible));
  reconnectPanel.dataset.reconnectState = busy ? "trying" : "idle";
  reconnectButton.disabled = Boolean(buttonDisabled);
  reconnectButton.textContent = buttonText;
  if (reconnectSubtitle) reconnectSubtitle.textContent = subtitle || "Puedes reiniciar la conexión sin recargar la página.";
  if (reconnectAttempt) reconnectAttempt.textContent = attemptText || "";
}

function setBotStatus(status) {
  const normalized = String(status || "offline").toLowerCase();
  sidebarKicker.dataset.status = normalized === "online" ? "online" : normalized === "connecting" ? "connecting" : "offline";
  if (normalized === "online") {
    updateReconnectPanel({ visible: false, busy: false, buttonDisabled: false, buttonText: "Reconectar" });
  } else {
    updateReconnectPanel({
      visible: true,
      busy: normalized === "connecting",
      buttonDisabled: normalized === "connecting",
      buttonText: normalized === "connecting" ? "Reiniciando..." : "Reconectar",
      subtitle: normalized === "connecting" ? "Reconectando el bot..." : "Puedes reiniciar la conexión sin recargar la página.",
      attemptText: normalized === "connecting" ? "Intentando conexión..." : "Esperando acción…",
    });
  }
}

function clearMenu() {
  activeMenu = null;
  menuBusyState = false;
  menuPanel.classList.remove("visible", "busy");
  menuTitle.textContent = "Sin menú activo";
  menuMeta.textContent = "Cuando el servidor abra un inventario, aparecerá aquí.";
  menuResults.textContent = "";
  menuBaseFilters.innerHTML = "";
  menuGrid.innerHTML = "";
  menuEmpty.textContent = "Aún no hay opciones disponibles.";
  menuBusy.textContent = "Cambiando de servidor...";
  menuSearch.value = "";
  menuQuery = "";
}

function normalizeQueryText(value) { return String(value || "").trim().toLowerCase(); }
function getBaseLabel(item) { return normalizeQueryText(item.name || ""); }
function formatLore(lore) { return Array.isArray(lore) ? lore.map((line) => line.trim()).filter(Boolean).join("\n") : ""; }

function renderBaseFilters(items) {
  const baseCounts = new Map();
  for (const item of items) {
    const baseName = getBaseLabel(item);
    if (!baseName) continue;
    baseCounts.set(baseName, (baseCounts.get(baseName) || 0) + 1);
  }
  const sortedBases = [...baseCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  menuBaseFilters.innerHTML = "";
  sortedBases.forEach(([baseName, count]) => {
    const label = document.createElement("label");
    label.className = "menu-base-filter";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = hiddenBaseNames.has(baseName);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) hiddenBaseNames.add(baseName); else hiddenBaseNames.delete(baseName);
      applyMenuFilter();
    });
    const text = document.createElement("span");
    text.textContent = `Ocultar ${baseName} (${count})`;
    label.append(checkbox, text);
    menuBaseFilters.appendChild(label);
  });
}

function renderMenu(menu) {
  if (!menu || !Array.isArray(menu.slots) || menu.slots.length === 0) return clearMenu();
  activeMenu = menu;
  menuPanel.classList.add("visible");
  menuPanel.classList.toggle("busy", menuBusyState);
  menuTitle.textContent = menu.title || "Menú del servidor";
  menuMeta.textContent = `Slots visibles: ${menu.slots.length}/${menu.slotCount || menu.slots.length} | Token: ${menu.token}`;
  renderBaseFilters(menu.slots);
  menuGrid.innerHTML = "";
  applyMenuFilter();
}

function parseMenuQuery(rawQuery) {
  const includes = String(rawQuery || "").trim().split(/\s+/).filter(Boolean).map(normalizeQueryText);
  return { includes };
}

function matchesMenuItem(item, filter) {
  const searchText = normalizeQueryText(item.searchText);
  const baseName = getBaseLabel(item);
  if (hiddenBaseNames.has(baseName)) return false;
  if (filter.includes.length === 0) return true;
  return filter.includes.every((term) => searchText.includes(term));
}

function getItemIcon(item) {
  const haystack = `${item.customName || ""} ${item.displayName || ""} ${item.name || ""}`.toLowerCase();
  const rules = [
    { match: ["player_head", "head"], icon: "👤", kind: "head" },
    { match: ["sword"], icon: "⚔", kind: "utility" },
    { match: ["bow", "crossbow"], icon: "🏹", kind: "utility" },
    { match: ["barrier"], icon: "⛔", kind: "danger" },
    { match: ["chest", "shulker_box"], icon: "🧰", kind: "utility" },
    { match: ["compass"], icon: "🧭", kind: "utility" },
  ];
  for (const rule of rules) if (rule.match.some((token) => haystack.includes(token))) return rule;
  const firstChar = (item.customName || item.displayName || item.name || "?").trim().charAt(0).toUpperCase();
  return { icon: firstChar || "?", kind: "block" };
}

function applyMenuFilter() {
  if (!activeMenu) return;
  const filter = parseMenuQuery(menuQuery);
  const items = Array.isArray(activeMenu.slots) ? activeMenu.slots : [];
  const visibleItems = items.filter((item) => matchesMenuItem(item, filter));
  menuGrid.innerHTML = "";
  if (items.length === 0) { menuEmpty.textContent = "No hay items interactivos en este menú."; menuResults.textContent = ""; return; }
  if (visibleItems.length === 0) { menuEmpty.textContent = "No hay resultados para esta búsqueda."; menuResults.textContent = `0 coincidencias de ${items.length} items`; return; }

  menuEmpty.textContent = "Haz click en un item para que el bot haga click en ese slot.";
  menuResults.textContent = `${visibleItems.length} de ${items.length} items visibles`;

  visibleItems.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "menu-item";
    button.innerHTML = `<div class="menu-item-icon" aria-hidden="true"></div><div class="menu-item-body"><span class="menu-item-slot">Slot ${item.slot}</span><span class="menu-item-name"></span><span class="menu-item-count"></span><div class="menu-item-base"></div><div class="menu-item-lore"></div></div>`;
    const itemIcon = getItemIcon(item);
    const iconBox = button.querySelector(".menu-item-icon");
    iconBox.textContent = itemIcon.icon;
    iconBox.dataset.kind = itemIcon.kind || "block";
    button.querySelector(".menu-item-name").textContent = item.customName || item.displayName || item.name || "Elemento";
    button.querySelector(".menu-item-count").textContent = item.count && item.count > 1 ? `x${item.count}` : "";
    button.querySelector(".menu-item-base").textContent = item.customName && item.name && item.customName !== item.name ? `Base: ${item.name}` : "";

    const loreBox = button.querySelector(".menu-item-lore");
    const loreText = formatLore(item.lore);
    loreBox.textContent = loreText || "";
    loreBox.style.whiteSpace = "pre-wrap";

    button.addEventListener("click", () => {
      const currentMenu = activeMenu;
      if (!currentMenu) return;
      showActionModal(item, (clickType) => {
        if (currentMenu.windowId !== "inventory") {
          menuBusyState = true;
          menuPanel.classList.add("busy");
          menuBusy.textContent = "Cambiando de servidor...";
          button.disabled = true;
        }
        sendSocketMessage({ type: "menuAction", token: currentMenu.token, slot: item.slot, clickType });
        appendLine(`[MENU] Click ${clickType === "right" ? "derecho" : "izquierdo"} en slot ${item.slot}: ${item.displayName || item.name || "Elemento"}`, "system");
      });
    });
    menuGrid.appendChild(button);
  });
}

function connectSocket() {
  if (reconnectSocketTimer) { clearTimeout(reconnectSocketTimer); reconnectSocketTimer = null; }
  ws = new WebSocket("ws://127.0.0.1:3000");

  ws.onopen = () => {
    socketReconnectAttempt = 0;
    if (!manualSocketClose) {
      updateReconnectPanel({ visible: false, busy: false, buttonDisabled: false, buttonText: "Reconectar" });
    }
  };

  ws.onmessage = (e) => {
    let data;
    try { data = JSON.parse(e.data); } catch { appendLine(sanitizeVisibleText(String(e.data))); return; }
    if (typeof data.type === "undefined") { appendLine(sanitizeVisibleText(String(e.data))); return; }

    if (data.type === "sidebar") {
      document.getElementById("ping").textContent = "Obteniendo...";
      document.getElementById("version").textContent = data.version;
      document.getElementById("username").textContent = data.username;
      document.getElementById("time").textContent = data.time;
      document.getElementById("server").textContent = data.server;
      document.getElementById("port").textContent = data.port || "25565";
      setVitals(data.health, data.food);
      setBotStatus(data.botStatus);
      if (data.sessionId && data.sessionId !== currentSessionId) resetChatHistory(data.sessionId, Array.isArray(data.chatHistory) ? data.chatHistory : []);
      else if (Array.isArray(data.chatHistory)) resetChatHistory(data.sessionId || currentSessionId, data.chatHistory);
    } else if (data.type === "chatHistory") {
      if (data.sessionId && data.sessionId !== currentSessionId) resetChatHistory(data.sessionId, Array.isArray(data.history) ? data.history : []);
      else if (Array.isArray(data.history)) resetChatHistory(data.sessionId || currentSessionId, data.history);
    } else if (data.type === "updatePing") {
      document.getElementById("ping").textContent = `${data.ping} ms`;
    } else if (data.type === "vitals") {
      setVitals(data.health, data.food);
    } else if (data.type === "chat") {
      const prefix = data.source === "player" ? "[CHAT]" : data.source === "system" ? "[SYSTEM]" : "[SERVER]";
      appendLine(`${prefix} ${data.text}`, data.source);
    } else if (data.type === "menu") {
      renderMenu(data.menu);
    } else if (data.type === "menuClose") {
      clearMenu();
    } else if (data.type === "menuBusy") {
      menuBusyState = Boolean(data.busy);
      menuPanel.classList.toggle("busy", menuBusyState);
      menuBusy.textContent = data.message || "Cambiando de servidor...";
    } else if (data.type === "reconnectState") {
      const reconnecting = Boolean(data.busy);
      updateReconnectPanel({
        visible: reconnecting || sidebarKicker.dataset.status === "offline",
        busy: reconnecting,
        buttonDisabled: reconnecting,
        buttonText: reconnecting ? "Reiniciando..." : "Reconectar",
        subtitle: data.message || "Puedes reiniciar la conexión sin recargar la página.",
        attemptText: reconnecting ? "Intentando conexión..." : "Esperando acción…",
      });
    }
  };

  ws.onclose = () => {
    if (!manualSocketClose) {
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
    }
  };
}

const actionModal = document.getElementById("action-modal");
const actionModalTitle = document.getElementById("action-modal-title");
const actionModalText = document.getElementById("action-modal-text");
const actionModalCloseBtn = document.getElementById("action-modal-close-btn");
const actionBtnLeft = document.getElementById("action-btn-left");
const actionBtnRight = document.getElementById("action-btn-right");
const actionBtnUse = document.getElementById("action-btn-use");
let onActionSelected = null;

function showActionModal(item, callback) {
  actionModalTitle.textContent = item.displayName || item.name || "Interactuar";
  actionModalText.textContent = `¿Cómo deseas hacer clic en ${item.displayName || item.name || "este objeto"} (Slot ${item.slot})?`;
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
actionBtnLeft.addEventListener("click", () => { if (typeof onActionSelected === "function") onActionSelected("left"); hideActionModal(); });
actionBtnRight.addEventListener("click", () => { if (typeof onActionSelected === "function") onActionSelected("right"); hideActionModal(); });
actionBtnUse.addEventListener("click", () => { if (typeof onActionSelected === "function") onActionSelected("use"); hideActionModal(); });
actionModal.addEventListener("click", (e) => { if (e.target === actionModal) hideActionModal(); });

menuSearch.addEventListener("input", () => { menuQuery = menuSearch.value || ""; applyMenuFilter(); });
reconnectButton.addEventListener("click", () => {
  if (reconnectButton.disabled) return;
  updateReconnectPanel({
    visible: true,
    busy: true,
    buttonDisabled: true,
    buttonText: "Solicitando...",
    subtitle: "Solicitando reinicio de conexión al bot...",
    attemptText: "Enviando solicitud...",
  });
  sendSocketMessage({ type: "reconnectRequest" });
});
menuCloseBtn.addEventListener("click", clearMenu);
inventoryButton.addEventListener("click", () => {
  if (sidebarKicker.dataset.status === "offline") return appendLine("[SISTEMA] No puedes ver el inventario porque el bot está desconectado.", "system");
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    appendLine("[SISTEMA] El panel no esta conectado. Reintentando conexion...", "system");
    return connectSocket();
  }
  clearMenu();
  sendSocketMessage({ type: "inventoryRequest" });
});
if (endSessionButton) {
  endSessionButton.addEventListener("click", async () => {
    endSessionButton.disabled = true;
    endSessionButton.title = "Saliendo de la partida...";
    manualSocketClose = true;
    try {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      if (launcherAPI && typeof launcherAPI.returnToLauncher === "function") {
        const result = await launcherAPI.returnToLauncher();
        if (!result?.ok) throw new Error(result?.error || "No se pudo volver al launcher.");
        return;
      }
      window.location.href = "launcher.html";
    } catch {
      window.location.href = "launcher.html";
    }
  });
}

input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") { e.preventDefault(); stepInputHistory(-1); return; }
  if (e.key === "ArrowDown") { e.preventDefault(); stepInputHistory(1); return; }
  if (e.key === "Enter") {
    const text = input.value.trim();
    if (!text) return;
    pushInputHistory(text);
    sendSocketMessage(text);
    input.value = "";
    inputHistoryIndex = -1;
    inputDraft = "";
  }
});

revealWindowWhenMenuReady();
connectSocket();
