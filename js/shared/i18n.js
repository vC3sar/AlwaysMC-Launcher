(function () {
  const SUPPORTED_LANGUAGES = ["es", "en"];
  const FALLBACK_LANGUAGE = "es";

  const dictionaries = {
    es: {
      "common.back": "Volver",
      "common.saveConfig": "Guardar config.json",
      "lang.es": "Español",
      "lang.en": "Inglés",

      "launcher.audio.unmute": "Activar música",
      "launcher.audio.mute": "Silenciar música",
      "launcher.menu.play": "Jugar (Multijugador)",
      "launcher.menu.config": "Configuración",
      "launcher.menu.info": "Información",
      "launcher.menu.fullscreen": "Pantalla completa (F11)",
      "launcher.menu.fullscreen.exit": "Salir de pantalla completa (F11)",
      "launcher.menu.exit": "Salir",
      "launcher.subtitle": "Esto nunca termina...",
      "launcher.title.play": "Jugar (Multijugador / Juego Java)",
      "launcher.title.config": "Configuración (config.json)",
      "launcher.title.info": "Información",
      "launcher.play.botFast": "Bot rápido",
      "launcher.play.javaGame": "Juego Java",
      "launcher.play.botHelp": "Conexión rápida al panel Mineflayer.",
      "launcher.play.continue": "Continuar con la última",
      "launcher.play.create": "Crear nueva",
      "launcher.play.startNew": "Iniciar nueva partida",
      "launcher.play.javaHelp": "Selecciona modo y versión, luego pulsa Lanzar.",
      "launcher.play.modeAria": "Modo de juego",
      "launcher.form.username": "Nickname offline/no premium",
      "launcher.form.ip": "IP (ej: mc.haliacraft.com)",
      "launcher.form.port": "Puerto (25565)",
      "launcher.form.version": "Version (ej: 1.21.11)",
      "launcher.form.usernameOffline": "Nickname (offline)",
      "launcher.form.distribution": "Distribución",
      "launcher.form.availableVersion": "Versión disponible",
      "launcher.filter.release": "Release",
      "launcher.filter.snapshot": "Snapshot",
      "launcher.filter.oldBeta": "Old Beta",
      "launcher.filter.oldAlpha": "Old Alpha",
      "launcher.advanced": "Avanzado",
      "launcher.form.javaPath": "Java path (opcional)",
      "launcher.form.minMemory": "Memoria mínima (MB)",
      "launcher.form.maxMemory": "Memoria máxima (MB)",
      "launcher.form.jvmArgs": "Args JVM extra",
      "launcher.form.gameArgs": "Args de juego extra",
      "launcher.form.detectJava": "Detectar Java",
      "launcher.form.launchGame": "Lanzar juego",
      "launcher.form.closeGame": "Cerrar juego",
      "launcher.form.viewDiagnostics": "Ver diagnóstico",
      "launcher.ms.activeAccount": "Cuenta Microsoft activa",
      "launcher.form.language": "Idioma",
      "launcher.form.videoMenu": "Video menu:",
      "launcher.auth.mode": "Modo de autenticación",
      "launcher.auth.login": "Iniciar sesión",
      "launcher.auth.logout": "Cerrar sesión",
      "launcher.auth.remove": "Quitar cuenta",
      "launcher.status.saved": "config.json guardado.",
      "launcher.status.saveFailed": "No se pudo guardar.",
      "launcher.status.invalidJson": "JSON inválido en configuración.",
      "launcher.status.startingLast": "Iniciando última sesión...",
      "launcher.status.startingNew": "Creando perfil y arrancando bot...",
      "launcher.status.stopGameFail": "No se pudo cerrar el juego.",
      "launcher.status.gameClosed": "Proceso del juego cerrado.",
      "launcher.status.searchingJava": "Buscando instalaciones de Java...",
      "launcher.status.detectJavaFail": "No se pudo detectar Java.",
      "launcher.status.noJavaFound": "No se encontró Java automáticamente. Define la ruta manualmente.",
      "launcher.status.javaDetected": "Java detectado: {path}",
      "launcher.status.catalogLoading": "Cargando catálogo...",
      "launcher.status.catalogRefreshing": "Actualizando catálogo...",
      "launcher.status.catalogFail": "No se pudo cargar el catálogo.",
      "launcher.status.catalogReady": "Catálogo listo: {vanilla} vanilla, {fabric} fabric, {forge} forge{warning}",
      "launcher.status.noFilterResults": "Sin resultados para los filtros seleccionados.",
      "launcher.status.msDisabled": "Microsoft/Premium está deshabilitado temporalmente.",
      "launcher.status.selectVersion": "Selecciona una versión para lanzar.",
      "launcher.status.runtimeDiagFail": "No se pudo obtener diagnóstico runtime.",
      "launcher.status.installInvalid": "Instalación inválida.",
      "launcher.status.installQueryFail": "No se pudo consultar instalación.",
      "launcher.status.installIncomplete": "La instalación no finalizó correctamente.",
      "launcher.status.processing": "Procesando...",
      "launcher.runtime.diagTitle": "Diagnóstico runtime:",
      "launcher.runtime.lastLines": "- últimas líneas:",
      "launcher.ms.noAccounts": "Sin cuentas",
      "launcher.ms.noActive": "No hay sesión Microsoft activa.",
      "launcher.ms.account": "Cuenta",
      "launcher.ms.noEmail": "sin correo",
      "launcher.ms.active": "Activa: {name}",
      "launcher.ms.activeNotFound": "Cuenta activa no encontrada.",
      "launcher.ms.loadFail": "No se pudieron cargar cuentas Microsoft.",
      "launcher.ms.loginOpening": "Abriendo Microsoft Login...",
      "launcher.ms.loginFail": "No se pudo iniciar sesión Microsoft.",
      "launcher.ms.loginOk": "Sesión Microsoft iniciada.",
      "launcher.ms.logoutFail": "No se pudo cerrar sesión.",
      "launcher.ms.logoutOk": "Sesiones Microsoft cerradas.",
      "launcher.ms.selectRemove": "Selecciona una cuenta para quitar.",
      "launcher.ms.removeFail": "No se pudo quitar cuenta.",
      "launcher.ms.removeOk": "Cuenta Microsoft eliminada.",
      "launcher.ms.changeFail": "No se pudo cambiar cuenta activa.",

      "app.vital.health": "Vida",
      "app.vital.food": "Comida",
      "app.endSession": "Terminar partida y volver al menú",
      "app.reconnect.title": "Bot desconectado",
      "app.reconnect.subtitle": "Puedes reiniciar la conexión sin recargar la página.",
      "app.reconnect.waiting": "Esperando acción…",
      "app.reconnect.button": "Reconectar",
      "app.input.placeholder": "Escribe y presiona Enter",
      "app.inventory.title": "Ver inventario",
      "app.sidebar.info": "Información",
      "app.sidebar.live": "Panel en vivo",
      "app.sidebar.summary": "Estado de la sesión, jugador y servidor con lectura rápida.",
      "app.sidebar.date": "Fecha",
      "app.sidebar.connected": "Conectado",
      "app.sidebar.offlinePremium": "Offline / No premium",
      "app.card.player": "Jugador",
      "app.card.playerIdentity": "Identidad de la sesión",
      "app.card.name": "Nombre",
      "app.card.version": "Versión",
      "app.card.connection": "Conexión",
      "app.card.serverLatency": "Latencia del servidor",
      "app.card.ping": "Ping",
      "app.card.server": "Servidor",
      "app.card.ipAddress": "Dirección IP",
      "app.card.host": "Host",
      "app.card.port": "Puerto",
      "app.menu.none": "Sin menú activo",
      "app.menu.noneDesc": "Cuando el servidor abra un inventario, aparecerá aquí.",
      "app.menu.empty": "Aún no hay opciones disponibles.",
      "app.menu.busy": "Cambiando de servidor...",
      "app.menu.search": "Buscar por nombre o lore",
      "app.menu.closePanel": "Cerrar panel",
      "app.modal.title": "Interactuar con Ítem",
      "app.modal.question": "¿Cómo quieres hacer clic en el objeto?",
      "app.modal.close": "Cerrar modal",
      "app.action.left": "Clic Izquierdo",
      "app.action.right": "Clic Derecho",
      "app.action.use": "⚡ Usar / Equipar en mano",
      "app.status.restarting": "Reiniciando...",
      "app.status.connecting": "Reconectando el bot...",
      "app.status.trying": "Intentando conexión...",
      "app.status.requesting": "Solicitando...",
      "app.status.requestingReconnect": "Solicitando reinicio de conexión al bot...",
      "app.status.sending": "Enviando solicitud...",
      "app.status.socketClosed": "La conexión con el panel se cerró. Reintentando...",
      "app.status.panelRetry": "Reconectando panel (intento {attempt})",
      "app.status.getting": "Obteniendo...",
      "app.menu.noItems": "No hay items interactivos en este menú.",
      "app.menu.noSearchResults": "No hay resultados para esta búsqueda.",
      "app.menu.matches": "{count} de {total} items visibles",
      "app.menu.matchesZero": "0 coincidencias de {total} items",
      "app.menu.clickHint": "Haz click en un item para que el bot haga click en ese slot.",
      "app.menu.base": "Base: {name}",
      "app.menu.hide": "Ocultar {name} ({count})",
      "app.menu.slot": "Slot {slot}",
      "app.menu.element": "Elemento",
      "app.menu.serverMenu": "Menú del servidor",
      "app.modal.interact": "Interactuar",
      "app.modal.itemName": "este objeto",
      "app.modal.clickQuestion": "¿Cómo deseas hacer clic en {name} (Slot {slot})?",
      "app.system.inventoryOffline": "[SISTEMA] No puedes ver el inventario porque el bot está desconectado.",
      "app.system.panelDisconnected": "[SISTEMA] El panel no está conectado. Reintentando conexión...",
      "app.system.returnLauncherFail": "No se pudo volver al launcher.",
      "app.status.leaving": "Saliendo de la partida...",

      "error.no_saved_profile": "No hay perfil guardado.",
      "error.invalid_profile": "Perfil inválido. Verifica nickname y servidor.",
      "error.save_config_failed": "No se pudo guardar config.json.",
      "error.no_active_window": "No hay una ventana activa.",
      "error.launcher_not_initialized": "Servicio del launcher no inicializado."
    },
    en: {
      "common.back": "Back",
      "common.saveConfig": "Save config.json",
      "lang.es": "Spanish",
      "lang.en": "English",
      "launcher.audio.unmute": "Enable music",
      "launcher.audio.mute": "Mute music",
      "launcher.menu.play": "Play (Multiplayer)",
      "launcher.menu.config": "Settings",
      "launcher.menu.info": "Info",
      "launcher.menu.fullscreen": "Fullscreen (F11)",
      "launcher.menu.fullscreen.exit": "Exit fullscreen (F11)",
      "launcher.menu.exit": "Exit",
      "launcher.subtitle": "This never ends...",
      "launcher.title.play": "Play (Multiplayer / Java Game)",
      "launcher.title.config": "Settings (config.json)",
      "launcher.title.info": "Information",
      "launcher.play.botFast": "Quick bot",
      "launcher.play.javaGame": "Java game",
      "launcher.play.botHelp": "Quick connection to the Mineflayer panel.",
      "launcher.play.continue": "Continue last",
      "launcher.play.create": "Create new",
      "launcher.play.startNew": "Start new session",
      "launcher.play.javaHelp": "Pick mode and version, then click Launch.",
      "launcher.play.modeAria": "Game mode",
      "launcher.form.username": "Offline/non-premium nickname",
      "launcher.form.ip": "IP (e.g. mc.haliacraft.com)",
      "launcher.form.port": "Port (25565)",
      "launcher.form.version": "Version (e.g. 1.21.11)",
      "launcher.form.usernameOffline": "Nickname (offline)",
      "launcher.form.distribution": "Distribution",
      "launcher.form.availableVersion": "Available version",
      "launcher.filter.release": "Release",
      "launcher.filter.snapshot": "Snapshot",
      "launcher.filter.oldBeta": "Old Beta",
      "launcher.filter.oldAlpha": "Old Alpha",
      "launcher.advanced": "Advanced",
      "launcher.form.javaPath": "Java path (optional)",
      "launcher.form.minMemory": "Minimum memory (MB)",
      "launcher.form.maxMemory": "Maximum memory (MB)",
      "launcher.form.jvmArgs": "Extra JVM args",
      "launcher.form.gameArgs": "Extra game args",
      "launcher.form.detectJava": "Detect Java",
      "launcher.form.launchGame": "Launch game",
      "launcher.form.closeGame": "Close game",
      "launcher.form.viewDiagnostics": "View diagnostics",
      "launcher.ms.activeAccount": "Active Microsoft account",
      "launcher.form.language": "Language",
      "launcher.form.videoMenu": "Menu video:",
      "launcher.auth.mode": "Authentication mode",
      "launcher.auth.login": "Sign in",
      "launcher.auth.logout": "Sign out",
      "launcher.auth.remove": "Remove account",
      "launcher.status.saved": "config.json saved.",
      "launcher.status.saveFailed": "Could not save.",
      "launcher.status.invalidJson": "Invalid JSON in configuration.",
      "launcher.status.startingLast": "Starting last session...",
      "launcher.status.startingNew": "Creating profile and starting bot...",
      "launcher.status.stopGameFail": "Could not close game.",
      "launcher.status.gameClosed": "Game process closed.",
      "launcher.status.searchingJava": "Searching Java installations...",
      "launcher.status.detectJavaFail": "Could not detect Java.",
      "launcher.status.noJavaFound": "Java was not found automatically. Set path manually.",
      "launcher.status.javaDetected": "Java detected: {path}",
      "launcher.status.catalogLoading": "Loading catalog...",
      "launcher.status.catalogRefreshing": "Refreshing catalog...",
      "launcher.status.catalogFail": "Could not load catalog.",
      "launcher.status.catalogReady": "Catalog ready: {vanilla} vanilla, {fabric} fabric, {forge} forge{warning}",
      "launcher.status.noFilterResults": "No results for selected filters.",
      "launcher.status.msDisabled": "Microsoft/Premium is temporarily disabled.",
      "launcher.status.selectVersion": "Select a version to launch.",
      "launcher.status.runtimeDiagFail": "Could not read runtime diagnostics.",
      "launcher.status.installInvalid": "Invalid installation.",
      "launcher.status.installQueryFail": "Could not query installation.",
      "launcher.status.installIncomplete": "Installation did not complete successfully.",
      "launcher.status.processing": "Processing...",
      "launcher.runtime.diagTitle": "Runtime diagnostics:",
      "launcher.runtime.lastLines": "- last lines:",
      "launcher.ms.noAccounts": "No accounts",
      "launcher.ms.noActive": "No active Microsoft session.",
      "launcher.ms.account": "Account",
      "launcher.ms.noEmail": "no email",
      "launcher.ms.active": "Active: {name}",
      "launcher.ms.activeNotFound": "Active account not found.",
      "launcher.ms.loadFail": "Could not load Microsoft accounts.",
      "launcher.ms.loginOpening": "Opening Microsoft Login...",
      "launcher.ms.loginFail": "Could not sign in with Microsoft.",
      "launcher.ms.loginOk": "Microsoft session started.",
      "launcher.ms.logoutFail": "Could not sign out.",
      "launcher.ms.logoutOk": "Microsoft sessions signed out.",
      "launcher.ms.selectRemove": "Select an account to remove.",
      "launcher.ms.removeFail": "Could not remove account.",
      "launcher.ms.removeOk": "Microsoft account removed.",
      "launcher.ms.changeFail": "Could not change active account.",

      "app.vital.health": "Health",
      "app.vital.food": "Food",
      "app.endSession": "End session and return to menu",
      "app.reconnect.title": "Bot disconnected",
      "app.reconnect.subtitle": "You can restart the connection without reloading the page.",
      "app.reconnect.waiting": "Waiting for action...",
      "app.reconnect.button": "Reconnect",
      "app.input.placeholder": "Type and press Enter",
      "app.inventory.title": "View inventory",
      "app.sidebar.info": "Information",
      "app.sidebar.live": "Live panel",
      "app.sidebar.summary": "Session, player and server status at a glance.",
      "app.sidebar.date": "Date",
      "app.sidebar.connected": "Connected",
      "app.sidebar.offlinePremium": "Offline / No premium",
      "app.card.player": "Player",
      "app.card.playerIdentity": "Session identity",
      "app.card.name": "Name",
      "app.card.version": "Version",
      "app.card.connection": "Connection",
      "app.card.serverLatency": "Server latency",
      "app.card.ping": "Ping",
      "app.card.server": "Server",
      "app.card.ipAddress": "IP address",
      "app.card.host": "Host",
      "app.card.port": "Port",
      "app.menu.none": "No active menu",
      "app.menu.noneDesc": "When the server opens an inventory, it will appear here.",
      "app.menu.empty": "No options available yet.",
      "app.menu.busy": "Switching servers...",
      "app.menu.search": "Search by name or lore",
      "app.menu.closePanel": "Close panel",
      "app.modal.title": "Interact with Item",
      "app.modal.question": "How do you want to click the item?",
      "app.modal.close": "Close modal",
      "app.action.left": "Left click",
      "app.action.right": "Right click",
      "app.action.use": "⚡ Use / Equip in hand",
      "app.status.restarting": "Restarting...",
      "app.status.connecting": "Reconnecting bot...",
      "app.status.trying": "Attempting connection...",
      "app.status.requesting": "Requesting...",
      "app.status.requestingReconnect": "Requesting bot reconnection...",
      "app.status.sending": "Sending request...",
      "app.status.socketClosed": "Connection to panel closed. Retrying...",
      "app.status.panelRetry": "Reconnecting panel (attempt {attempt})",
      "app.status.getting": "Fetching...",
      "app.menu.noItems": "No interactive items in this menu.",
      "app.menu.noSearchResults": "No results for this search.",
      "app.menu.matches": "{count} of {total} visible items",
      "app.menu.matchesZero": "0 matches out of {total} items",
      "app.menu.clickHint": "Click an item so the bot clicks that slot.",
      "app.menu.base": "Base: {name}",
      "app.menu.hide": "Hide {name} ({count})",
      "app.menu.slot": "Slot {slot}",
      "app.menu.element": "Item",
      "app.menu.serverMenu": "Server menu",
      "app.modal.interact": "Interact",
      "app.modal.itemName": "this item",
      "app.modal.clickQuestion": "How do you want to click {name} (Slot {slot})?",
      "app.system.inventoryOffline": "[SYSTEM] You cannot view inventory because the bot is offline.",
      "app.system.panelDisconnected": "[SYSTEM] Panel is disconnected. Retrying connection...",
      "app.system.returnLauncherFail": "Could not return to launcher.",
      "app.status.leaving": "Leaving session...",

      "error.no_saved_profile": "No saved profile.",
      "error.invalid_profile": "Invalid profile. Verify nickname and server.",
      "error.save_config_failed": "Failed to save config.json.",
      "error.no_active_window": "There is no active window.",
      "error.launcher_not_initialized": "Launcher service not initialized."
    }
  };

  let currentLanguage = FALLBACK_LANGUAGE;
  const listeners = new Set();

  function isSupportedLanguage(lang) {
    return SUPPORTED_LANGUAGES.includes(String(lang || "").toLowerCase());
  }

  function normalizeLanguage(lang) {
    const clean = String(lang || "").toLowerCase();
    return isSupportedLanguage(clean) ? clean : FALLBACK_LANGUAGE;
  }

  function formatTemplate(text, params) {
    if (!params || typeof params !== "object") return String(text);
    return String(text).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
  }

  function t(key, params) {
    const k = String(key || "").trim();
    if (!k) return "";
    const base = dictionaries[currentLanguage]?.[k] ?? dictionaries[FALLBACK_LANGUAGE]?.[k] ?? k;
    return formatTemplate(base, params);
  }

  function applyTranslations(root = document) {
    const scope = root && typeof root.querySelectorAll === "function" ? root : document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key);
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) el.setAttribute("placeholder", t(key));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      if (key) el.setAttribute("title", t(key));
    });
    scope.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria-label");
      if (key) el.setAttribute("aria-label", t(key));
    });
  }

  function setLanguage(lang) {
    currentLanguage = normalizeLanguage(lang);
    if (typeof document !== "undefined" && document.documentElement) document.documentElement.lang = currentLanguage;
    if (typeof document !== "undefined") applyTranslations(document);
    listeners.forEach((fn) => {
      try { fn(currentLanguage); } catch (_) { }
    });
    return currentLanguage;
  }

  function getLanguage() {
    return currentLanguage;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  window.MCSharedI18n = {
    SUPPORTED_LANGUAGES,
    FALLBACK_LANGUAGE,
    t,
    setLanguage,
    getLanguage,
    applyTranslations,
    subscribe,
    normalizeLanguage,
  };
})();
