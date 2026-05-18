
        var launcherAPI = window.launcherAPI || null;
        let ws = null;
        let reconnectSocketTimer = null;
        let manualSocketClose = false;
        let gameStarted = false;
        const chat = document.getElementById("chat");
        const input = document.getElementById("input");
        const reconnectPanel = document.getElementById("reconnect-panel");
        const reconnectButton = document.getElementById("reconnect-button");
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
        const hudHealth = document.getElementById("hud-health");
        const hudFood = document.getElementById("hud-food");
        const launcherOverlay = document.getElementById("launcher-overlay");
        const launcherBgVideo = document.getElementById("launcher-bg-video");
        const bgVideoModeSelect = document.getElementById("bg-video-mode-select");
        const launcherMenuAudio = document.getElementById("launcher-menu-audio");
        const launcherAudioToggle = document.getElementById("launcher-audio-toggle");
        const launcherStatus = document.getElementById("launcher-status");
        const launcherMainMenu = document.getElementById("launcher-main-menu");
        const launcherPlayView = document.getElementById("launcher-play-view");
        const launcherConfigView = document.getElementById("launcher-config-view");
        const launcherInfoView = document.getElementById("launcher-info-view");
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
        let cachedLauncherConfig = {};
        let currentBgVideoMode = "auto";
        let currentBgVideoSrc = "";
        let menuAudioMuted = false;

        const BG_1080_SRC = "mp4/menu-main.mp4";
        const BG_2K_SRC = "mp4/2k-menu-main.mp4";
        const BG_4K_SRC = "mp4/4k-menu-main.mp4";

        function chooseBackgroundSource(mode) {
            if (mode === "1080p") {
                return BG_1080_SRC;
            }
            if (mode === "4k") {
                return BG_4K_SRC;
            }
            if (mode === "2k") {
                return BG_2K_SRC;
            }

            const fullScreen = Boolean(document.fullscreenElement) || Boolean(window.matchMedia("(display-mode: fullscreen)").matches);
            const width = Math.max(window.innerWidth || 0, window.screen?.width || 0);
            const height = Math.max(window.innerHeight || 0, window.screen?.height || 0);
            if (fullScreen || width > 2560 || height > 1440) {
                return BG_4K_SRC;
            }
            if (width > 1920 || height > 1080) {
                return BG_2K_SRC;
            }
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
            launcherBgVideo.play().catch(() => {
                // Puede requerir interacción del usuario.
            });
        }

        function sendSocketMessage(payload) {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                return false;
            }

            ws.send(typeof payload === "string" ? payload : JSON.stringify(payload));
            return true;
        }

        function sanitizeVisibleText(value) {
            return String(value || "")
                .replace(/\uFFFD+/g, "")
                .replace(/[\u0000-\u001F\u007F]/g, " ")
                .replace(/\s+/g, " ")
                .trim();
        }

        function formatVital(value) {
            const n = Number(value);
            if (!Number.isFinite(n)) {
                return "--/20";
            }
            const clamped = Math.max(0, Math.min(20, Math.round(n)));
            return `${clamped}/20`;
        }

        function setVitals(health, food) {
            if (hudHealth) {
                hudHealth.textContent = formatVital(health);
            }
            if (hudFood) {
                hudFood.textContent = formatVital(food);
            }
        }

        function revealWindowWhenMenuReady() {
            document.body.style.visibility = "visible";
            if (launcherAPI && typeof launcherAPI.menuReady === "function") {
                launcherAPI.menuReady().catch(() => { });
            }
        }

        function updateMenuAudioToggle() {
            if (!launcherAudioToggle || !launcherMenuAudio) {
                return;
            }
            launcherMenuAudio.muted = menuAudioMuted;
            launcherAudioToggle.innerHTML = `<i data-lucide="${menuAudioMuted ? "volume-x" : "volume-2"}"></i>`;
            launcherAudioToggle.setAttribute("aria-label", menuAudioMuted ? "Activar música" : "Silenciar música");
            launcherAudioToggle.setAttribute("title", menuAudioMuted ? "Activar música" : "Silenciar música");
            if (window.lucide && typeof window.lucide.createIcons === "function") {
                window.lucide.createIcons({
                    icons: window.lucide.icons,
                    attrs: { width: 17, height: 17, "stroke-width": 2.2 }
                });
            }
        }

        function pushInputHistory(value) {
            const text = String(value || "").trim();
            if (!text) {
                return;
            }

            if (inputHistory[inputHistory.length - 1] === text) {
                inputHistoryIndex = -1;
                inputDraft = "";
                return;
            }

            inputHistory.push(text);
            if (inputHistory.length > inputHistoryLimit) {
                inputHistory.splice(0, inputHistory.length - inputHistoryLimit);
            }

            inputHistoryIndex = -1;
            inputDraft = "";
        }

        function stepInputHistory(direction) {
            if (inputHistory.length === 0) {
                return;
            }

            if (inputHistoryIndex === -1) {
                inputDraft = input.value;
                inputHistoryIndex = inputHistory.length;
            }

            inputHistoryIndex = Math.max(0, Math.min(inputHistory.length, inputHistoryIndex + direction));

            if (inputHistoryIndex === inputHistory.length) {
                input.value = inputDraft;
                return;
            }

            input.value = inputHistory[inputHistoryIndex] || "";
        }

        function resetChatHistory(sessionId, history = []) {
            currentSessionId = sessionId || null;
            chatHistory = Array.isArray(history) ? history.slice(-chatHistoryLimit) : [];
            chat.innerHTML = "";
            chatHistory.forEach(entry => {
                renderLine(entry.text, entry.source || entry.kind || "normal", false);
            });
            chat.scrollTop = chat.scrollHeight;
        }

        function renderLine(text, kind = "normal", persist = true) {
            text = sanitizeVisibleText(text);
            if (!text) {
                return;
            }

            const wasAtBottom = chat.scrollTop + chat.clientHeight >= chat.scrollHeight - 50;
            const line = document.createElement("div");
            line.textContent = text;

            if (kind === "system") {
                line.style.color = "#7dd3fc";
            } else if (kind === "player" || kind === "local") {
                line.style.color = "#ffffff";
            } else if (kind === "server") {
                line.style.color = "#fca5a5";
            }

            chat.appendChild(line);

            if (persist) {
                chatHistory.push({ text, source: kind });
                if (chatHistory.length > chatHistoryLimit) {
                    chatHistory = chatHistory.slice(-chatHistoryLimit);
                    while (chat.childNodes.length > chatHistoryLimit) {
                        chat.removeChild(chat.firstChild);
                    }
                }
            }

            if (wasAtBottom) {
                chat.scrollTop = chat.scrollHeight;
            }
        }

        function appendLine(text, kind = "normal") {
            renderLine(text, kind, true);
        }

        function setBotStatus(status) {
            const normalized = String(status || "offline").toLowerCase();
            sidebarKicker.dataset.status = normalized === "online" ? "online" : normalized === "connecting" ? "connecting" : "offline";

            if (normalized === "online") {
                reconnectPanel.classList.remove("visible");
                reconnectButton.disabled = false;
                reconnectButton.textContent = "Reconectar";
            } else {
                reconnectPanel.classList.add("visible");
                reconnectButton.disabled = normalized === "connecting";
                reconnectButton.textContent = normalized === "connecting" ? "Reiniciando..." : "Reconectar";
            }
        }

        function clearMenu() {
            activeMenu = null;
            menuBusyState = false;
            menuPanel.classList.remove("visible");
            menuPanel.classList.remove("busy");
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

        function getBaseLabel(item) {
            return normalizeQueryText(item.name || "");
        }

        function renderBaseFilters(items) {
            const baseCounts = new Map();

            for (const item of items) {
                const baseName = getBaseLabel(item);
                if (!baseName) {
                    continue;
                }
                baseCounts.set(baseName, (baseCounts.get(baseName) || 0) + 1);
            }

            const sortedBases = [...baseCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
            menuBaseFilters.innerHTML = "";

            if (sortedBases.length === 0) {
                return;
            }

            sortedBases.forEach(([baseName, count]) => {
                const label = document.createElement("label");
                label.className = "menu-base-filter";
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = hiddenBaseNames.has(baseName);
                checkbox.addEventListener("change", () => {
                    if (checkbox.checked) {
                        hiddenBaseNames.add(baseName);
                    } else {
                        hiddenBaseNames.delete(baseName);
                    }
                    applyMenuFilter();
                });

                const text = document.createElement("span");
                text.textContent = `Ocultar ${baseName} (${count})`;
                label.appendChild(checkbox);
                label.appendChild(text);
                menuBaseFilters.appendChild(label);
            });
        }

        function renderMenu(menu) {
            if (!menu || !Array.isArray(menu.slots) || menu.slots.length === 0) {
                clearMenu();
                return;
            }

            activeMenu = menu;
            menuPanel.classList.add("visible");
            menuPanel.classList.toggle("busy", menuBusyState);
            menuTitle.textContent = menu.title || "Menú del servidor";
            menuMeta.textContent = `Slots visibles: ${menu.slots.length}/${menu.slotCount || menu.slots.length} | Token: ${menu.token}`;
            renderBaseFilters(menu.slots);
            menuGrid.innerHTML = "";
            applyMenuFilter();
        }

        function formatLore(lore) {
            if (!Array.isArray(lore) || lore.length === 0) {
                return "";
            }

            return lore.map(line => line.trim()).filter(Boolean).join("\n");
        }

        function normalizeQueryText(value) {
            return String(value || "")
                .trim()
                .toLowerCase();
        }

        function parseMenuQuery(rawQuery) {
            const tokens = String(rawQuery || "")
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            const excludesBase = [];
            const includes = [];

            for (const token of tokens) {
                const normalized = normalizeQueryText(token);
                const baseMatch = normalized.match(/^(?:-base:|!base:|base!=)(.+)$/);

                if (baseMatch) {
                    const value = baseMatch[1].trim();
                    if (value) {
                        excludesBase.push(value);
                    }
                    continue;
                }

                includes.push(normalized);
            }

            return { includes, excludesBase };
        }

        function matchesMenuItem(item, filter) {
            const searchText = normalizeQueryText(item.searchText);
            const baseName = getBaseLabel(item);

            if (hiddenBaseNames.has(baseName)) {
                return false;
            }

            if (filter.includes.length === 0) {
                return true;
            }

            return filter.includes.every(term => searchText.includes(term));
        }

        function getItemIcon(item) {
            const haystack = `${item.customName || ""} ${item.displayName || ""} ${item.name || ""}`.toLowerCase();
            const rules = [
                { match: ["player_head", "head"], icon: "👤", kind: "head" },
                { match: ["diamond_sword", "iron_sword", "netherite_sword", "stone_sword", "wooden_sword", "golden_sword"], icon: "⚔", kind: "utility" },
                { match: ["bow", "crossbow"], icon: "🏹", kind: "utility" },
                { match: ["clock"], icon: "⏰", kind: "utility" },
                { match: ["ender_chest"], icon: "📦", kind: "utility" },
                { match: ["barrier"], icon: "⛔", kind: "danger" },
                { match: ["lime_dye", "emerald"], icon: "✅", kind: "success" },
                { match: ["orange_bed", "red_bed", "blue_bed"], icon: "🛏", kind: "success" },
                { match: ["glass_pane"], icon: "▣", kind: "block" },
                { match: ["bed"], icon: "🛏", kind: "success" },
                { match: ["chest", "shulker_box"], icon: "🧰", kind: "utility" },
                { match: ["dye"], icon: "●", kind: "block" },
                { match: ["book"], icon: "📘", kind: "utility" },
                { match: ["compass"], icon: "🧭", kind: "utility" },
            ];

            for (const rule of rules) {
                if (rule.match.some(token => haystack.includes(token))) {
                    return rule;
                }
            }

            const firstChar = (item.customName || item.displayName || item.name || "?").trim().charAt(0).toUpperCase();
            return { icon: firstChar || "?", kind: "block" };
        }

        function applyMenuFilter() {
            if (!activeMenu) {
                return;
            }

            const filter = parseMenuQuery(menuQuery);
            const items = Array.isArray(activeMenu.slots) ? activeMenu.slots : [];
            const visibleItems = items.filter(item => matchesMenuItem(item, filter));

            menuGrid.innerHTML = "";

            if (items.length === 0) {
                menuEmpty.textContent = "No hay items interactivos en este menú.";
                menuResults.textContent = "";
                return;
            }

            if (visibleItems.length === 0) {
                menuEmpty.textContent = "No hay resultados para esta búsqueda.";
                menuResults.textContent = `0 coincidencias de ${items.length} items`;
                return;
            }

            menuEmpty.textContent = "Haz click en un item para que el bot haga click en ese slot.";
            menuResults.textContent = `${visibleItems.length} de ${items.length} items visibles`;

            visibleItems.forEach((item) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "menu-item";
                button.innerHTML = `
                    <div class="menu-item-icon" aria-hidden="true"></div>
                    <div class="menu-item-body">
                        <span class="menu-item-slot">Slot ${item.slot}</span>
                        <span class="menu-item-name"></span>
                        <span class="menu-item-count"></span>
                        <div class="menu-item-base"></div>
                        <div class="menu-item-lore"></div>
                    </div>
                `;
                const itemIcon = getItemIcon(item);
                const iconBox = button.querySelector(".menu-item-icon");
                iconBox.textContent = itemIcon.icon;
                iconBox.dataset.kind = itemIcon.kind || "block";
                button.querySelector(".menu-item-name").textContent = item.customName || item.displayName || item.name || "Elemento";
                button.querySelector(".menu-item-count").textContent = item.count && item.count > 1 ? `x${item.count}` : "";
                button.querySelector(".menu-item-base").textContent = item.customName && item.name && item.customName !== item.name ? `Base: ${item.name}` : "";

                const loreBox = button.querySelector(".menu-item-lore");
                const loreText = formatLore(item.lore);
                if (loreText) {
                    loreBox.textContent = loreText;
                    loreBox.style.whiteSpace = "pre-wrap";
                } else {
                    loreBox.textContent = "";
                }

                button.addEventListener("click", () => {
                    const currentMenu = activeMenu;
                    if (!currentMenu) {
                        return;
                    }

                    showActionModal(item, (clickType) => {
                        const menuToken = currentMenu.token;

                        if (currentMenu.windowId !== "inventory") {
                            menuBusyState = true;
                            menuPanel.classList.add("busy");
                            menuBusy.textContent = "Cambiando de servidor...";
                            button.disabled = true;
                        }

                        sendSocketMessage({
                            type: "menuAction",
                            token: menuToken,
                            slot: item.slot,
                            clickType: clickType,
                        });

                        const clickName = clickType === "right" ? "derecho" : "izquierdo";
                        appendLine(`[MENU] Click ${clickName} en slot ${item.slot}: ${item.displayName || item.name || "Elemento"}`, "system");
                    });
                });
                menuGrid.appendChild(button);
            });
        }

        function connectSocket() {
            if (reconnectSocketTimer) {
                clearTimeout(reconnectSocketTimer);
                reconnectSocketTimer = null;
            }

            ws = new WebSocket("ws://127.0.0.1:3000");

            ws.onopen = () => {
                if (!manualSocketClose) {
                    reconnectPanel.classList.remove("visible");
                    reconnectButton.disabled = false;
                    reconnectButton.textContent = "Reconectar";
                }
            };

            ws.onmessage = e => {
                let data;
                try {
                    data = JSON.parse(e.data);
                } catch {
                    appendLine(sanitizeVisibleText(String(e.data)));
                    return;
                }

                if (typeof data.type === "undefined") {
                    appendLine(sanitizeVisibleText(String(e.data)));
                    return;
                }


                // Actualizar la barra lateral si el mensaje es de tipo 'sidebar'
                if (data.type == "sidebar") {
                    document.getElementById('ping').textContent = 'Obteniendo...';
                    document.getElementById('version').textContent = data.version;
                    document.getElementById('username').textContent = data.username;
                    document.getElementById('time').textContent = data.time;
                    document.getElementById('server').textContent = data.server;
                    document.getElementById('port').textContent = data.port || '25565';
                    setVitals(data.health, data.food);
                    setBotStatus(data.botStatus);
                    if (data.sessionId && data.sessionId !== currentSessionId) {
                        resetChatHistory(data.sessionId, Array.isArray(data.chatHistory) ? data.chatHistory : []);
                    } else if (Array.isArray(data.chatHistory)) {
                        resetChatHistory(data.sessionId || currentSessionId, data.chatHistory);
                    }

                }
                else if (data.type == "chatHistory") {
                    if (data.sessionId && data.sessionId !== currentSessionId) {
                        resetChatHistory(data.sessionId, Array.isArray(data.history) ? data.history : []);
                    } else if (Array.isArray(data.history)) {
                        resetChatHistory(data.sessionId || currentSessionId, data.history);
                    }
                }
                else if (data.type == "updatePing") {
                    document.getElementById('ping').textContent = data.ping + ' ms';
                }
                else if (data.type == "vitals") {
                    setVitals(data.health, data.food);
                }
                else if (data.type == "chat") {
                    const prefix = data.source === "player" ? "[CHAT]" : data.source === "system" ? "[SYSTEM]" : "[SERVER]";
                    appendLine(`${prefix} ${data.text}`, data.source);
                }
                else if (data.type == "menu") {
                    renderMenu(data.menu);
                }
                else if (data.type == "menuClose") {
                    clearMenu();
                }
                else if (data.type == "menuBusy") {
                    menuBusyState = Boolean(data.busy);
                    menuPanel.classList.toggle("busy", menuBusyState);
                    menuBusy.textContent = data.message || "Cambiando de servidor...";
                }
                else if (data.type == "reconnectState") {
                    const reconnecting = Boolean(data.busy);
                    reconnectPanel.classList.toggle("visible", reconnecting || sidebarKicker.dataset.status === "offline");
                    reconnectButton.disabled = reconnecting;
                    reconnectButton.textContent = reconnecting ? "Reiniciando..." : "Reconectar";
                    const subtitle = reconnectPanel.querySelector(".reconnect-subtitle");
                    if (subtitle) {
                        subtitle.textContent = data.message || "Puedes reiniciar la conexión sin recargar la página.";
                    }
                }

            };

            ws.onclose = () => {
                if (!manualSocketClose) {
                    reconnectPanel.classList.add("visible");
                    reconnectButton.disabled = false;
                    reconnectButton.textContent = "Reconectar";
                    const subtitle = reconnectPanel.querySelector(".reconnect-subtitle");
                    if (subtitle) {
                        subtitle.textContent = "La conexión con el panel se cerró. Reintentando...";
                    }
                    reconnectSocketTimer = setTimeout(connectSocket, 1200);
                }
            };

            ws.onerror = () => {
                // El cierre y la reconexión quedan gestionados por onclose.
            };
        }

        function startPanelSession() {
            if (gameStarted) {
                return;
            }
            gameStarted = true;
            if (launcherMenuAudio) {
                launcherMenuAudio.pause();
                launcherMenuAudio.currentTime = 0;
            }
            window.location.href = "app.html";
        }

        function setLauncherStatus(text, isError = false) {
            launcherStatus.textContent = text || "";
            launcherStatus.dataset.kind = isError ? "error" : "ok";
        }

        function loadConfigIntoForm(cfg) {
            const config = cfg && typeof cfg === "object" ? cfg : {};
            const launcher = config.launcher && typeof config.launcher === "object" ? config.launcher : {};
            const versions = Array.isArray(launcher.preferredVersions) ? launcher.preferredVersions : [];

            document.getElementById("cfg-client-id").value = String(config.clientId || "");
            const versionsSet = new Set(versions.map((v) => String(v).trim()).filter(Boolean));
            const versionsSelect = document.getElementById("cfg-preferred-versions");
            if (versionsSelect) {
                Array.from(versionsSelect.options).forEach((option) => {
                    option.selected = versionsSet.has(option.value);
                });
            }
            document.getElementById("cfg-reconnect-delay").value = String(launcher.reconnectDelayMs ?? 650);
            document.getElementById("cfg-velocity-compat").checked = Boolean(launcher.velocityCompatMode);
            document.getElementById("cfg-debug-lifecycle").checked = Boolean(launcher.debugLifecycle);
        }

        function buildConfigFromForm() {
            const versionsSelect = document.getElementById("cfg-preferred-versions");
            const preferredVersions = versionsSelect
                ? Array.from(versionsSelect.selectedOptions).map((opt) => String(opt.value).trim()).filter(Boolean)
                : [];

            return {
                clientId: String(document.getElementById("cfg-client-id").value || "").trim(),
                launcher: {
                    preferredVersions,
                    velocityCompatMode: Boolean(document.getElementById("cfg-velocity-compat").checked),
                    debugLifecycle: Boolean(document.getElementById("cfg-debug-lifecycle").checked),
                    reconnectDelayMs: Number.parseInt(document.getElementById("cfg-reconnect-delay").value || "650", 10) || 650,
                    menuBackgroundMode: bgVideoModeSelect ? bgVideoModeSelect.value : "auto",
                },
            };
        }

        function showLauncherView(view) {
            launcherMainMenu.style.display = view === "main" ? "flex" : "none";
            launcherPlayView.classList.toggle("visible", view === "play");
            launcherConfigView.classList.toggle("visible", view === "config");
            launcherInfoView.classList.toggle("visible", view === "info");
            setLauncherStatus("");
        }

        async function openConfigView() {
            showLauncherView("config");
            if (!launcherAPI) return;
            const cfg = await launcherAPI.getConfig();
            cachedLauncherConfig = cfg || {};
            const configuredMode = String(cfg?.launcher?.menuBackgroundMode || "auto").toLowerCase();
            currentBgVideoMode = ["auto", "1080p", "2k", "4k"].includes(configuredMode) ? configuredMode : "auto";
            if (bgVideoModeSelect) {
                bgVideoModeSelect.value = currentBgVideoMode;
            }
            loadConfigIntoForm(cfg || {});
        }

        async function openInfoView() {
            showLauncherView("info");
            if (!launcherAPI) return;
            const info = await launcherAPI.getInfo();
            const text = [
                `App: ${info.name}`,
                `Version: ${info.version}`,
                "",
                "Creditos:",
                ...(Array.isArray(info.credits) ? info.credits.map((line) => `- ${line}`) : []),
                "",
                "Funcionamiento:",
                info.about || "",
            ].join("\n");
            document.getElementById("info-content").textContent = text;
        }

        async function toggleFullscreenMode() {
            if (!launcherAPI || typeof launcherAPI.toggleFullscreen !== "function") {
                return;
            }
            const state = await launcherAPI.toggleFullscreen();
            const fullscreenBtn = document.getElementById("menu-fullscreen-btn");
            if (fullscreenBtn && state?.ok) {
                fullscreenBtn.textContent = state.isFullscreen ? "Salir de pantalla completa (F11)" : "Pantalla completa (F11)";
            }
        }

        async function bootContinue() {
            if (!launcherAPI) {
                startPanelSession();
                return;
            }
            setLauncherStatus("Iniciando ultima sesion...");
            const result = await launcherAPI.startContinue();
            if (!result?.ok) {
                setLauncherStatus(result?.error || "No se pudo iniciar.", true);
                return;
            }
            startPanelSession();
        }

        async function bootNewProfile() {
            if (!launcherAPI) {
                startPanelSession();
                return;
            }
            const payload = {
                username: document.getElementById("new-username").value.trim(),
                ip: document.getElementById("new-ip").value.trim(),
                port: document.getElementById("new-port").value.trim(),
                version: document.getElementById("new-version").value.trim(),
            };
            setLauncherStatus("Creando perfil y arrancando bot...");
            const result = await launcherAPI.startNew(payload);
            if (!result?.ok) {
                setLauncherStatus(result?.error || "No se pudo crear el perfil.", true);
                return;
            }
            startPanelSession();
        }

        function bindClick(id, handler) {
            const node = document.getElementById(id);
            if (!node) {
                console.error(`[Launcher] No existe el elemento #${id}`);
                return;
            }
            node.addEventListener("click", handler);
        }

        function initLauncherMenu() {
            bindClick("menu-play-btn", async () => {
                showLauncherView("play");
                if (launcherAPI) {
                    const last = await launcherAPI.getLastProfile();
                    if (last) {
                        document.getElementById("new-username").value = last.username || "";
                        document.getElementById("new-ip").value = last.ip || "";
                        document.getElementById("new-port").value = String(last.port || 25565);
                        document.getElementById("new-version").value = last.version || "";
                    }
                }
            });
            bindClick("menu-config-btn", openConfigView);
            bindClick("menu-info-btn", openInfoView);
            bindClick("menu-fullscreen-btn", toggleFullscreenMode);
            bindClick("play-back-btn", () => showLauncherView("main"));
            bindClick("config-back-btn", () => showLauncherView("main"));
            bindClick("info-back-btn", () => showLauncherView("main"));
            bindClick("continue-last-btn", bootContinue);
            bindClick("create-new-btn", () => {
                document.getElementById("new-profile-form").classList.remove("hidden");
            });
            bindClick("start-new-profile-btn", bootNewProfile);
            bindClick("save-config-btn", async () => {
                if (!launcherAPI) return;
                try {
                    const parsed = buildConfigFromForm();
                    const result = await launcherAPI.saveConfig(parsed);
                    if (!result?.ok) {
                        setLauncherStatus(result?.error || "No se pudo guardar.", true);
                        return;
                    }
                    cachedLauncherConfig = parsed;
                    currentBgVideoMode = String(parsed.launcher.menuBackgroundMode || "auto").toLowerCase();
                    applyLauncherBackgroundVideo(currentBgVideoMode);
                    setLauncherStatus("config.json guardado.");
                } catch {
                    setLauncherStatus("JSON invalido en configuracion.", true);
                }
            });

            if (bgVideoModeSelect) {
                bgVideoModeSelect.addEventListener("change", () => {
                    applyLauncherBackgroundVideo(bgVideoModeSelect.value);
                });
            }
            showLauncherView("main");

            if (launcherAPI && typeof launcherAPI.getFullscreen === "function") {
                launcherAPI.getFullscreen().then((state) => {
                    const fullscreenBtn = document.getElementById("menu-fullscreen-btn");
                    if (fullscreenBtn && state?.ok) {
                        fullscreenBtn.textContent = state.isFullscreen ? "Salir de pantalla completa (F11)" : "Pantalla completa (F11)";
                    }
                }).catch(() => {});
            }
        }

        try {
            initLauncherMenu();
        } catch (error) {
            console.error("[Launcher] Error inicializando menú:", error);
            setLauncherStatus("Error inicializando el menu. Abre Debug/DevTools.", true);
        }

        if (launcherMenuAudio) {
            const tryPlayMenuAudio = () => {
                if (gameStarted) return;
                launcherMenuAudio.volume = 0.35;
                launcherMenuAudio.play().catch(() => {
                    // Espera a primera interacción si autoplay es bloqueado.
                });
            };
            tryPlayMenuAudio();
            document.addEventListener("click", tryPlayMenuAudio, { once: true });
            document.addEventListener("keydown", tryPlayMenuAudio, { once: true });
        }

        if (launcherAudioToggle) {
            launcherAudioToggle.addEventListener("click", () => {
                menuAudioMuted = !menuAudioMuted;
                updateMenuAudioToggle();
            });
        }
        updateMenuAudioToggle();

        if (launcherAPI) {
            launcherAPI.getConfig().then((cfg) => {
                cachedLauncherConfig = cfg || {};
                const mode = String(cfg?.launcher?.menuBackgroundMode || "auto").toLowerCase();
                currentBgVideoMode = ["auto", "1080p", "2k", "4k"].includes(mode) ? mode : "auto";
                if (bgVideoModeSelect) {
                    bgVideoModeSelect.value = currentBgVideoMode;
                }
                applyLauncherBackgroundVideo(currentBgVideoMode);
            }).catch(() => {
                applyLauncherBackgroundVideo("auto");
            });
        } else {
            applyLauncherBackgroundVideo("auto");
        }

        if (launcherBgVideo) {
            launcherBgVideo.addEventListener("loadedmetadata", () => {
                console.log(
                    `[Launcher Video] source=${launcherBgVideo.videoWidth}x${launcherBgVideo.videoHeight} viewport=${window.innerWidth}x${window.innerHeight}`
                );
            });
            window.addEventListener("resize", () => {
                if (currentBgVideoMode === "auto") {
                    applyLauncherBackgroundVideo("auto");
                }
            });
            document.addEventListener("fullscreenchange", () => {
                if (currentBgVideoMode === "auto") {
                    applyLauncherBackgroundVideo("auto");
                }
            });
        }

        revealWindowWhenMenuReady();

        document.addEventListener("keydown", (event) => {
            if (event.key === "F11") {
                event.preventDefault();
                toggleFullscreenMode();
            }
        });

        menuSearch.addEventListener("input", () => {
            menuQuery = menuSearch.value || "";
            applyMenuFilter();
        });

        reconnectButton.addEventListener("click", () => {
            if (reconnectButton.disabled) {
                return;
            }

            reconnectButton.disabled = true;
            reconnectButton.textContent = "Solicitando...";
            sendSocketMessage({
                type: "reconnectRequest",
            });
        });

        menuCloseBtn.addEventListener("click", () => {
            clearMenu();
        });

        inventoryButton.addEventListener("click", () => {
            if (sidebarKicker.dataset.status === "offline") {
                appendLine("[SISTEMA] No puedes ver el inventario porque el bot está desconectado.", "system");
                return;
            }

            if (!ws || ws.readyState !== WebSocket.OPEN) {
                appendLine("[SISTEMA] El panel no esta conectado. Reintentando conexion...", "system");
                connectSocket();
                return;
            }

            clearMenu();
            sendSocketMessage({
                type: "inventoryRequest"
            });
        });




        // Action Modal Functions
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

        actionBtnLeft.addEventListener("click", () => {
            if (typeof onActionSelected === "function") {
                onActionSelected("left");
            }
            hideActionModal();
        });

        actionBtnRight.addEventListener("click", () => {
            if (typeof onActionSelected === "function") {
                onActionSelected("right");
            }
            hideActionModal();
        });

        actionBtnUse.addEventListener("click", () => {
            if (typeof onActionSelected === "function") {
                onActionSelected("use");
            }
            hideActionModal();
        });

        actionModal.addEventListener("click", (e) => {
            if (e.target === actionModal) {
                hideActionModal();
            }
        });

        input.addEventListener("keydown", e => {
            if (e.key === "ArrowUp") {
                e.preventDefault();
                stepInputHistory(-1);
                return;
            }

            if (e.key === "ArrowDown") {
                e.preventDefault();
                stepInputHistory(1);
                return;
            }

            if (e.key === "Enter") {
                const text = input.value.trim();
                if (text.length === 0) {
                    return;
                }

                pushInputHistory(text);
                sendSocketMessage(text);
                input.value = "";
                inputHistoryIndex = -1;
                inputDraft = "";
            }
        });
    
