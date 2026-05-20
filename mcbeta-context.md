This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where comments have been removed, empty lines have been removed, content has been compressed (code blocks are separated by ⋮---- delimiter).

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
.gitignore
app.html
config.json
config/ignore.json
css/app.css
css/launcher.css
css/main.css
css/main/_action-modal.css
css/main/_app-layout.css
css/main/_base-launcher.css
css/shared.css
fn/discord.js
index.html
js/app.js
js/launcher.js
js/launcher/actions.js
js/launcher/audio.js
js/launcher/auth-ui.js
js/launcher/background.js
js/launcher/catalog.js
js/launcher/config-form.js
js/launcher/dom.js
js/launcher/index.js
js/launcher/navigation.js
js/launcher/runtime.js
js/launcher/services.js
js/launcher/state.js
js/launcher/status.js
js/launcher/utils.js
js/shared/utils.js
launcher.html
main.js
minelight.js
mp3/main-menu.mp3
mp4/2k-menu-main.mp4
mp4/4k-menu-main.mp4
mp4/menu-main.mp4
package.json
preload.js
profiles.json
README.md
src/bot/bot-lifecycle.js
src/bot/chat.js
src/bot/launcher-config.js
src/bot/menu.js
src/bot/minecraft-components.js
src/bot/minecraft-text.js
src/bot/state.js
src/bot/vitals.js
src/bot/ws-server.js
src/game-launcher.js
src/game-launcher/constants.js
src/game-launcher/version-java.js
src/main/bot.js
src/main/config.js
src/main/ipc.js
src/main/utils.js
src/main/window.js
```

# Files

## File: config/ignore.json
````json
{
    "words":
    [
        "ERROR",
        "Este comando no fue encontrado.",
        "¡No tienes permisos para ejecutar ese comando!"
    ]
}
````

## File: css/app.css
````css
body.app-page .launcher-overlay { display: none !important; }
````

## File: css/launcher.css
````css
body.launcher-page .launcher-overlay { display: flex; }
````

## File: css/main/_action-modal.css
````css
.action-modal {
⋮----
.action-modal.visible {
⋮----
.action-modal-content {
⋮----
.action-modal.visible .action-modal-content {
⋮----
.action-modal-header {
⋮----
.action-modal-title {
⋮----
.action-modal-close {
⋮----
.action-modal-close:hover {
⋮----
.action-modal-body p {
⋮----
.action-modal-buttons {
⋮----
.action-btn {
⋮----
.action-btn.left {
⋮----
.action-btn.left:hover {
⋮----
.action-btn.right {
⋮----
.action-btn.right:hover {
⋮----
.action-btn.use {
⋮----
.action-btn.use:hover {
````

## File: css/main/_app-layout.css
````css
#container {
⋮----
#chat-section {
⋮----
.vitals-hud {
⋮----
.vital-card {
⋮----
.vital-icon {
⋮----
.vital-label {
⋮----
.vital-value {
⋮----
.hud-end-session-btn {
⋮----
.hud-end-session-btn:hover {
⋮----
.hud-end-session-btn:disabled {
⋮----
#chat {
⋮----
#input {
⋮----
.chat-controls {
⋮----
.chat-controls #input {
⋮----
#reconnect-panel {
⋮----
#reconnect-panel.visible {
⋮----
#reconnect-panel .reconnect-copy {
⋮----
#reconnect-panel .reconnect-title {
⋮----
#reconnect-panel .reconnect-subtitle {
⋮----
#reconnect-panel .reconnect-progress {
⋮----
#reconnect-panel .reconnect-progress-bar {
⋮----
#reconnect-panel .reconnect-attempt {
⋮----
#reconnect-panel[data-reconnect-state="trying"] .reconnect-progress,
⋮----
#reconnect-button {
⋮----
#reconnect-button:hover {
⋮----
#reconnect-button:disabled {
⋮----
#sidebar {
⋮----
.sidebar-hero {
⋮----
.sidebar-meta {
⋮----
.sidebar-meta-label {
⋮----
.sidebar-meta-value {
⋮----
.sidebar-kicker {
⋮----
.sidebar-kicker::before {
⋮----
.sidebar-kicker[data-status="online"]::before {
⋮----
.sidebar-kicker[data-status="connecting"]::before {
⋮----
.sidebar-hero h2 {
⋮----
.sidebar-hero p {
⋮----
.sidebar-badges {
⋮----
.status-pill {
⋮----
.status-pill.ghost {
⋮----
#menu-panel {
⋮----
#menu-panel.visible {
⋮----
#menu-header {
⋮----
#menu-title {
⋮----
#menu-meta {
⋮----
#menu-grid {
⋮----
.menu-item {
⋮----
.menu-item:hover {
⋮----
.menu-item-icon {
⋮----
.menu-item-icon[data-kind="danger"] {
⋮----
.menu-item-icon[data-kind="success"] {
⋮----
.menu-item-icon[data-kind="utility"] {
⋮----
.menu-item-icon[data-kind="head"] {
⋮----
.menu-item-icon[data-kind="block"] {
⋮----
.menu-item-body {
⋮----
.menu-item-slot {
⋮----
.menu-item-name {
⋮----
.menu-item-count {
⋮----
.menu-item-base {
⋮----
.menu-item-lore {
⋮----
.menu-empty {
⋮----
#menu-search {
⋮----
#menu-search::placeholder {
⋮----
#menu-results {
⋮----
#menu-base-filters {
⋮----
.menu-base-filter {
⋮----
.menu-base-filter input {
⋮----
#menu-busy {
⋮----
#menu-panel.busy #menu-busy {
⋮----
#menu-panel.busy .menu-item {
⋮----
.card {
⋮----
#sidebar .card:last-child {
⋮----
.card-head {
⋮----
.card-icon {
⋮----
.card-head h3 {
⋮----
.card-subtitle {
⋮----
.card-metric {
⋮----
.card-metric:first-of-type {
⋮----
.metric-label {
⋮----
.metric-value {
⋮----
.highlight {
⋮----
body {
⋮----
.launcher-shell {
⋮----
.launcher-shell.java-expanded {
⋮----
.launcher-java-layout {
⋮----
.launcher-java-tools {
⋮----
.launcher-java-main-actions {
⋮----
.launcher-advanced-memory {
⋮----
.sidebar-hero,
⋮----
.btn-inventory-mini {
⋮----
.btn-inventory-mini:hover {
⋮----
.btn-inventory-mini:active {
⋮----
.menu-close-btn {
⋮----
.menu-close-btn:hover {
````

## File: css/main/_base-launcher.css
````css
body {
⋮----
:root {
⋮----
html,
⋮----
html::-webkit-scrollbar,
⋮----
html::-webkit-scrollbar-track,
⋮----
html::-webkit-scrollbar-thumb,
⋮----
html::-webkit-scrollbar-thumb:hover,
⋮----
html::-webkit-scrollbar-corner,
⋮----
.launcher-overlay {
⋮----
.launcher-overlay.hidden {
⋮----
.launcher-audio-toggle {
⋮----
.launcher-audio-toggle:hover {
⋮----
.launcher-bg-video {
⋮----
.launcher-shell {
⋮----
.launcher-shell.main-compact {
⋮----
.launcher-shell.java-expanded {
⋮----
.launcher-brand {
⋮----
.launcher-sub {
⋮----
.launcher-menu,
⋮----
#launcher-main-menu {
⋮----
.launcher-view {
⋮----
#launcher-config-view {
⋮----
.launcher-btn,
⋮----
.launcher-btn:hover,
⋮----
.launcher-btn.nav-active {
⋮----
#launcher-config-view .launcher-nav-active,
⋮----
.launcher-controls-hint {
⋮----
.launcher-controls-hint.visible {
⋮----
.launcher-control-item {
⋮----
.launcher-control-item i {
⋮----
.launcher-btn.alt {
⋮----
#menu-exit-btn {
⋮----
#continue-last-btn,
⋮----
#launcher-play-view .launcher-row {
⋮----
.launcher-play-tabs {
⋮----
.launcher-play-tab {
⋮----
.launcher-play-tab.active {
⋮----
.launcher-play-tab i {
⋮----
.launcher-play-panel {
⋮----
#play-tab-panel-java {
⋮----
#play-tab-panel-java .launcher-helper-text {
⋮----
.launcher-java-layout {
⋮----
.launcher-java-card {
⋮----
.launcher-java-top-row {
⋮----
.launcher-java-field {
⋮----
.launcher-java-card #game-version-select {
⋮----
.launcher-java-tools {
⋮----
.launcher-java-main-actions {
⋮----
.launcher-status-wrap {
⋮----
.launcher-status-terminal {
⋮----
.launcher-status-icon-side-btn {
⋮----
.launcher-status-icon-side-btn:hover {
⋮----
.launcher-status-icon-side-btn i {
⋮----
.launcher-advanced-toggle {
⋮----
.launcher-advanced-toggle summary {
⋮----
.launcher-advanced-toggle summary::-webkit-details-marker {
⋮----
.launcher-advanced-toggle summary::after {
⋮----
.launcher-advanced-toggle[open] summary {
⋮----
.launcher-advanced-toggle[open] summary::after {
⋮----
.launcher-advanced-body {
⋮----
.launcher-advanced-memory {
⋮----
.launcher-play-panel[hidden] {
⋮----
#launcher-play-view .launcher-row-actions {
⋮----
#launcher-play-view .launcher-row-single {
⋮----
#game-launch-btn,
⋮----
#game-launch-btn {
⋮----
#game-launch-btn:hover {
⋮----
#game-launch-btn:active {
⋮----
#game-launch-btn i {
⋮----
#game-stop-btn {
⋮----
#game-stop-btn:hover {
⋮----
#launcher-play-view .launcher-btn,
⋮----
#launcher-play-view .launcher-btn i,
⋮----
#launcher-config-view .launcher-row:last-child {
⋮----
#launcher-config-view #save-config-btn,
⋮----
#play-back-btn {
⋮----
.launcher-section-title {
⋮----
.launcher-row {
⋮----
.launcher-row label {
⋮----
.launcher-row select {
⋮----
.launcher-row select option,
⋮----
#cfg-preferred-versions {
⋮----
#cfg-preferred-versions option {
⋮----
#cfg-preferred-versions option:checked {
⋮----
.launcher-form {
⋮----
.launcher-form.hidden {
⋮----
#ms-auth-panel.hidden {
⋮----
.launcher-form input,
⋮----
#launcher-play-view #game-auth-mode,
⋮----
.launcher-form label {
⋮----
.launcher-form label i {
⋮----
.launcher-helper-text {
⋮----
.launcher-version-filters {
⋮----
.launcher-version-filters .launcher-check {
⋮----
.launcher-check {
⋮----
.launcher-check input[type="checkbox"] {
⋮----
#launcher-config-view .launcher-config-check {
⋮----
#launcher-config-view .launcher-config-check:hover {
⋮----
#launcher-config-view .launcher-config-check input[type="checkbox"] {
⋮----
#launcher-config-view .launcher-config-check span {
⋮----
.launcher-version-filters .launcher-check input[type="checkbox"] {
⋮----
.launcher-version-filters .launcher-check input[type="checkbox"]::after {
⋮----
.launcher-version-filters .launcher-check:has(input[type="checkbox"]:checked) {
⋮----
.launcher-version-filters .launcher-check:has(input[type="checkbox"]:checked) input[type="checkbox"] {
⋮----
.launcher-version-filters .launcher-check:has(input[type="checkbox"]:checked) input[type="checkbox"]::after {
⋮----
.launcher-version-filters .launcher-check:hover {
⋮----
.launcher-version-filters .launcher-check:active {
⋮----
.launcher-version-filters .launcher-check input[type="checkbox"]:focus-visible {
⋮----
#info-content {
⋮----
.launcher-status {
⋮----
.launcher-status[data-kind="error"] {
````

## File: css/shared.css
````css
:root {
````

## File: js/launcher/audio.js
````javascript

````

## File: js/launcher/auth-ui.js
````javascript
isMicrosoftDisabled()
````

## File: js/launcher/background.js
````javascript

````

## File: js/launcher/catalog.js
````javascript
refreshVersionSelect(ctx)
⋮----
const hasOption = (value)
⋮----
applyVersionFilters(_ctx, entries, distribution, filters)
⋮----
async loadGameCatalog(ctx, forceRefresh = false)
````

## File: js/launcher/config-form.js
````javascript
loadConfigIntoForm(ctx, cfg)
````

## File: js/launcher/dom.js
````javascript
get refs()
````

## File: js/launcher/navigation.js
````javascript
getMainMenuButtons(ctx)
setMainMenuSelection(ctx, index)
setLauncherMainMenuControlsVisible(ctx, visible)
getConfigNavigableElements(ctx)
setConfigSelection(ctx, index)
getPlayNavigableElements(ctx)
setPlaySelection(ctx, index)
getInfoNavigableElements(ctx)
setInfoSelection(ctx, index)
showLauncherView(ctx, view, options =
goBackLauncherView(ctx)
setupKeyboard(ctx)
````

## File: js/launcher/runtime.js
````javascript
async waitInstallCompletion(ctx, installId)
⋮----
formatRuntimeDiagnostics(_ctx, st)
````

## File: js/launcher/services.js
````javascript
function createLauncherServices(api)
⋮----
const has = (name)
const safeInvoke = async (name, fn, fallback = null) =>
````

## File: js/launcher/state.js
````javascript

````

## File: js/launcher/status.js
````javascript
setLauncherStatus(text, isError = false)
setGameStatus(text, isError = false)
setMsAuthStatus(text, isError = false)
````

## File: js/launcher/utils.js
````javascript
normalizeString(value, fallback = "")
clampNumber(value, min, max, fallback)
optionalElement(id)
assertElement(id)
````

## File: src/bot/bot-lifecycle.js
````javascript
function lifecycleEventNames()
````

## File: src/bot/chat.js
````javascript
function normalizeChatKey(text)
````

## File: src/bot/launcher-config.js
````javascript
function resolveBotRuntimeConfig(appConfig, requestedVersion)
````

## File: src/bot/menu.js
````javascript
function getArmorDestination(itemName)
⋮----
function isLikelyFood(itemName)
````

## File: src/bot/minecraft-components.js
````javascript
function decodeMinecraftText(input, getChatDecoder)
⋮----
function normalizeLore(rawLore, decodeFn)
⋮----
function normalizeComponentType(type)
⋮----
function readItemComponent(item, candidates)
⋮----
function extractModernDisplayData(item, decodeFn)
⋮----
function isPartialReadError(error)
````

## File: src/bot/state.js
````javascript
function createRuntimeState()
````

## File: src/bot/vitals.js
````javascript
function extractVitals(bot)
````

## File: src/bot/ws-server.js
````javascript
function createWSServerConfig()
````

## File: src/game-launcher/constants.js
````javascript

````

## File: src/game-launcher/version-java.js
````javascript
function parseMinecraftVersionInfo(versionId)
⋮----
function recommendedJavaMajorForVersion(versionId)
⋮----
function detectJavaMajorFromPathOrLabel(text)
````

## File: src/main/bot.js
````javascript
class BotManager
⋮----
async stopBotSession()
⋮----
async startBot(profile)
````

## File: src/main/config.js
````javascript
function loadConfig()
⋮----
function mergeLauncherDefaults(raw)
⋮----
function normalizeProfile(profile)
⋮----
function loadProfile()
⋮----
function saveProfile(profile)
⋮----
function saveConfig(config)
````

## File: src/main/ipc.js
````javascript
function setupIpcHandlers(gameLauncher)
⋮----
// Modloader
````

## File: src/main/utils.js
````javascript
function parseHostAndPort(hostInput, portInput, defaultServer = "mc.haliacraft.com")
⋮----
function loadJsonSafe(file, fallback)
⋮----
function saveJson(file, data)
````

## File: src/main/window.js
````javascript
class WindowManager
⋮----
createWindow()
⋮----
getMainWindow()
````

## File: js/launcher/actions.js
````javascript
function bindEvent(node, eventName, handler, options = undefined)
⋮----
function bindClick(id, handler)
⋮----
init(ctx)
````

## File: js/launcher/index.js
````javascript
function bindEvent(node, eventName, handler, options = undefined)
⋮----
function revealWindowWhenMenuReady()
⋮----
function chooseBackgroundSource(mode)
⋮----
function applyLauncherBackgroundVideo(mode = currentBgVideoMode)
⋮----
function startMenuAudio(force = false)
⋮----
function setupMenuAudioUnlockListeners()
⋮----
const unlock = () =>
⋮----
function loadMenuAudioMutedPreference()
⋮----
function saveMenuAudioMutedPreference()
⋮----
function updateMenuAudioToggle()
⋮----
function setLauncherStatus(text, isError = false)
⋮----
function setGameStatus(text, isError = false)
⋮----
function setMsAuthStatus(text, isError = false)
⋮----
function getSelectedMsAccount()
⋮----
function renderMsAccounts()
⋮----
async function refreshMsSessions()
⋮----
function updateAuthModeUI()
⋮----
function getDistributionEntries()
⋮----
function getEntryVersionId(entry)
⋮----
function loadLaunchOptionsFromConfig(cfg)
⋮----
function buildLaunchOptionsFromInputs()
⋮----
async function persistLaunchOptionsToConfig()
⋮----
function loadLastGameSelections()
⋮----
function saveLastGameSelections(nextSelections)
⋮----
// Ignorar errores de almacenamiento.
⋮----
function getCurrentVersionSelectionPayload()
⋮----
function persistCurrentVersionSelection()
⋮----
function restoreRememberedDistribution()
⋮----
function refreshVersionSelect()
⋮----
const hasOption = (value)
⋮----
function applyVersionFilters(entries, distribution, filters)
⋮----
function syncVersionTypeFiltersUI()
⋮----
function updateFilterVisibilityByDistribution()
⋮----
async function launchSelectedGameFromUI()
⋮----
function switchPlayTab(tab)
⋮----
async function ensureJavaCatalogLoadedOnce()
⋮----
async function waitInstallCompletion(installId)
⋮----
// eslint-disable-next-line no-await-in-loop
⋮----
async function ensureInstalledThenLaunch(
⋮----
function formatRuntimeDiagnostics(st)
⋮----
async function waitForRuntimeStable(timeoutMs = 8000, healthWindowMs = 4500)
⋮----
// eslint-disable-next-line no-await-in-loop
⋮----
async function showRuntimeDiagnostics()
⋮----
async function loadGameCatalog(forceRefresh = false)
⋮----
function stopInstallPolling()
⋮----
function startInstallPolling()
⋮----
function getMainMenuButtons()
⋮----
function setMainMenuSelection(index)
⋮----
function setLauncherMainMenuControlsVisible(visible)
⋮----
function getConfigNavigableElements()
⋮----
function setConfigSelection(index)
⋮----
function getPlayNavigableElements()
⋮----
function setPlaySelection(index)
⋮----
function getInfoNavigableElements()
⋮----
function setInfoSelection(index)
⋮----
function showLauncherView(view, options =
⋮----
function goBackLauncherView()
⋮----
function loadConfigIntoForm(cfg)
⋮----
function buildConfigFromForm()
⋮----
function buildMergedConfig(baseConfig)
⋮----
async function openConfigView()
⋮----
async function openInfoView()
⋮----
async function toggleFullscreenMode()
⋮----
async function quitApplication()
⋮----
function startPanelSession()
⋮----
async function bootContinue()
⋮----
async function bootNewProfile()
⋮----
function bindClick(id, handler)
⋮----
function initLauncherMenu()
⋮----
applyVersionFilters: (entries, distribution, filters)
getDistributionEntries: ()
getEntryVersionId: (entry)
getVersionTypeFilters: ()
loadLastGameSelections: ()
setGameStatus: (text, isError)
setCatalogRequestSeq: (value) =>
getCatalogRequestSeq: ()
getLastAppliedCatalogRequest: ()
setLastAppliedCatalogRequest: (value) =>
setGameCatalog: (value) =>
getGameCatalog: ()
refreshVersionSelect: ()
⋮----
getCurrentLauncherView: ()
setCurrentLauncherView: (v) =>
getLauncherViewHistory: ()
setLauncherViewHistory: (history) =>
getActiveMainMenuIndex: ()
setActiveMainMenuIndex: (v) =>
getActiveConfigIndex: ()
setActiveConfigIndex: (v) =>
getActivePlayIndex: ()
setActivePlayIndex: (v) =>
getActiveInfoIndex: ()
setActiveInfoIndex: (v) =>
startMenuAudio: ()
setLauncherStatus: (text, isError)
toggleFullscreenMode: ()
⋮----
getActivePlayTab: ()
switchPlayTab: (tab)
showLauncherView: (view)
loadLaunchOptionsFromConfig: (cfg)
restoreRememberedDistribution: ()
syncVersionTypeFiltersUI: ()
updateFilterVisibilityByDistribution: ()
refreshMsSessions: ()
updateAuthModeUI: ()
ensureJavaCatalogLoadedOnce: ()
openConfigView: ()
openInfoView: ()
⋮----
quitApplication: ()
bootContinue: ()
bootNewProfile: ()
launchSelectedGameFromUI: ()
⋮----
persistLaunchOptionsToConfig: ()
showRuntimeDiagnostics: ()
buildMergedConfig: (cfg)
⋮----
setCurrentBgVideoMode: (v) =>
getCurrentBgVideoMode: ()
applyLauncherBackgroundVideo: (v)
persistCurrentVersionSelection: ()
loadGameCatalog: (force)
⋮----
setMsAuthStatus: (text, isError)
setMsActiveAccountId: (id) =>
renderMsAccounts: ()
````

## File: js/shared/utils.js
````javascript
function normalizeMojibake(text)
⋮----
function sanitizeVisibleText(value)
⋮----
function formatVital(value)
````

## File: src/bot/minecraft-text.js
````javascript
function normalizeMojibake(text)
⋮----
// Drop noisy pseudo-graphic residue commonly seen after bad decode.
⋮----
function sanitizeVisibleText(input)
````

## File: .gitignore
````
node_modules/
config/catalog-cache.json
````

## File: fn/discord.js
````javascript
function shouldVerboseAll()
⋮----
function elapsedPrefix()
⋮----
function logInfo(message)
⋮----
function logDebug(message)
⋮----
function logError(phase, error)
⋮----
function maskClientId(clientId)
⋮----
function logStateDebug(label)
⋮----
function clearReconnectTimer()
⋮----
function isValidClientId(clientId)
⋮----
function buildActivityPayload(
⋮----
function clearRpcClient()
⋮----
function scheduleReconnect()
⋮----
function flushPendingActivity()
⋮----
function connectRpc()
⋮----
function initDiscordPresence(
⋮----
function updateDiscordPresence(
⋮----
function shutdownDiscordPresence()
````

## File: README.md
````markdown
# 🚀 MC-BETA | AlwaysMC Launcher

![Version](https://img.shields.io/badge/version-1.0.0--beta-orange)
![Node.js](https://img.shields.io/badge/Node.js-v16%2B-green)
![Discord RPC](https://img.shields.io/badge/Discord-Rich%20Presence-7289DA)
![Organization](https://img.shields.io/badge/Org-vazquezsg.ovh-blue)

**AlwaysMC Launcher** es una herramienta ligera diseñada para gestionar perfiles de Minecraft y permitir el acceso al juego en **modo NoGUI (Bot/Mineflayer)**. Está pensada **solo para usuarios de Minecraft no premium / offline**, así que no requiere credenciales de Microsoft ni auth de cuentas premium. Todo esto acompañado de una integración fluida con **Discord Rich Presence**.

---

## ✨ Características Principales

*   **🤖 Modo NoGUI:** Conecta una instancia automatizada mediante Mineflayer con usuario offline.
*   **🌐 Sincronización con Mojang:** Obtiene dinámicamente el manifiesto oficial de versiones para filtrar las versiones compatibles.
*   **💬 Discord Rich Presence:** Muestra en tu perfil de Discord qué versión estás jugando y en qué servidor te encuentras.
*   **🖥 Dashboard local:** Expone una interfaz web local para ver chat, ping y datos de la sesión.
*   **📁 Gestión de Perfiles:** Guarda automáticamente tu última configuración (usuario, IP, versión) en `profiles.json`.
*   **🛠️ Configuración Centralizada:** Controla parámetros sensibles como el `clientId` de Discord desde un solo lugar.
*   **🔒 Sin auth premium:** No usa Microsoft OAuth ni credenciales premium.

---

## 📸 Recursos Gráficos

> [!TIP]
> El launcher utiliza los siguientes identificadores visuales en Discord:
> - **Logo Principal:** `logo` (AlwaysMC Icon)
> - **Icono Secundario:** `mc` (Minecraft Classic)

---

## ⚙️ Instalación y Requisitos

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/vazquezsg-ovh/MC-BETA.git
    cd MC-BETA
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configuración inicial:**
    Asegúrate de editar el archivo `config.json` con tu Client ID de Discord si quieres activar Rich Presence:
    ```json
    {
      "clientId": "TU_CLIENT_ID_AQUÍ"
    }
    ```

    Si no lo configuras, el launcher seguirá funcionando en modo offline y solo desactivará Discord RPC.

---

## 🚀 Modo de Uso

Para iniciar el launcher, simplemente ejecuta:

```bash
npm start
```

### Flujo de la aplicación:
1.  **Detección de Perfil:** Si ya has usado la app, cargará tus datos anteriores.
2.  **Configuración:** Si deseas cambiar, podrás elegir:
    *   Nickname offline / no premium.
    *   IP del servidor.
    *   Versión del juego filtrada por compatibilidad con Mineflayer y el manifiesto oficial.
3.  **Ejecución:** Se activará el **Rich Presence** si hay `clientId` válido y se lanzará la instancia NoGUI.

---

## 📂 Estructura del Proyecto

*   `main.js`: Lógica principal del menú y gestión de perfiles.
*   `fn/discord.js`: Módulo encargado de la comunicación con la API de Discord.
*   `config.json`: Variables de entorno y configuración técnica.
*   `config/ignore.json`: Lista negra de mensajes para filtrar la consola en modo NoGUI. 
*   `index.html`: Panel web local para el chat del bot y la información de la sesión.
*   `profiles.json`: Almacenamiento local del estado del usuario.

---

## 🔐 Compatibilidad

Este proyecto está enfocado exclusivamente a cuentas **offline / no premium**.

No implementa:

* Auth de Microsoft.
* Login premium.
* Integración con credenciales de Mojang/Microsoft para iniciar sesión.

Si en el futuro quieres soporte premium, eso requerirá un flujo de autenticación distinto y credenciales de Microsoft.

---

## 👥 Créditos

Este proyecto es mantenido y desarrollado por:

*   **Developer:** vC3sar
*   **Organización:** vazquezsg.ovh

---

## ⚖️ Licencia

Este proyecto está bajo la licencia MIT. Puedes consultarla en el archivo LICENSE para más detalles.
````

## File: js/app.js
````javascript
function revealWindowWhenMenuReady()
⋮----
function sanitizeVisibleText(value)
⋮----
function formatVital(value)
⋮----
function sendSocketMessage(payload)
⋮----
function setVitals(health, food)
⋮----
function pushInputHistory(value)
⋮----
function stepInputHistory(direction)
⋮----
function resetChatHistory(sessionId, history = [])
⋮----
function renderLine(text, kind = "normal", persist = true)
⋮----
function appendLine(text, kind = "normal")
⋮----
function updateReconnectPanel(
⋮----
function setBotStatus(status)
⋮----
function clearMenu()
⋮----
function normalizeQueryText(value)
function getBaseLabel(item)
function formatLore(lore)
⋮----
function renderBaseFilters(items)
⋮----
function renderMenu(menu)
⋮----
function parseMenuQuery(rawQuery)
⋮----
function matchesMenuItem(item, filter)
⋮----
function getItemIcon(item)
⋮----
function applyMenuFilter()
⋮----
function connectSocket()
⋮----
ws.onopen = () =>
⋮----
ws.onmessage = (e) =>
⋮----
ws.onclose = () =>
⋮----
function showActionModal(item, callback)
⋮----
function hideActionModal()
````

## File: package.json
````json
{
  "name": "mc-beta",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "Offline/no premium Minecraft launcher with Mineflayer and Discord Rich Presence",
  "dependencies": {
    "@azure/msal-node": "^3.8.1",
    "ansi-to-html": "^0.7.2",
    "discord-rpc": "^4.0.1",
    "fs": "^0.0.1-security",
    "https": "^1.0.0",
    "mineflayer": "^4.37.1",
    "mineflayer-pathfinder": "^2.4.5",
    "path": "^0.12.7",
    "ping": "^0.4.4",
    "vec3": "^0.1.10"
  },
  "devDependencies": {
    "electron": "^31.7.7"
  }
}
````

## File: app.html
````html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MC-BETA</title>
  <link rel="stylesheet" href="css/shared.css">
  <link rel="stylesheet" href="css/main.css">
  <link rel="stylesheet" href="css/app.css">
  <style>
    html,
    body {
      overflow-x: hidden;
      overflow-y: auto;
    }
    body {
      min-height: 100vh;
      height: auto;
      visibility: hidden;
    }
    #container {
      min-height: 100vh;
      height: auto;
    }
  </style>
</head>
<body class="app-page">
  <div id="container">
    <div id="chat-section">
      <div id="vitals-hud" class="vitals-hud">
        <div class="vital-card"><span class="vital-icon" aria-hidden="true">❤️</span><span
            class="vital-label">Vida</span><span class="vital-value" id="hud-health">--/20</span></div>
        <div class="vital-card"><span class="vital-icon" aria-hidden="true">🍗</span><span
            class="vital-label">Comida</span><span class="vital-value" id="hud-food">--/20</span></div>
        <button id="end-session-button" type="button" class="hud-end-session-btn" title="Terminar partida y volver al menú"
          aria-label="Terminar partida y volver al menú">
          <i data-lucide="log-out"></i>
        </button>
      </div>
      <div id="chat" style="overflow-wrap: anywhere;"></div>
      <div id="reconnect-panel">
        <div class="reconnect-copy">
          <div class="reconnect-title">Bot desconectado</div>
          <div class="reconnect-subtitle">Puedes reiniciar la conexión sin recargar la página.</div>
          <div class="reconnect-progress" aria-hidden="true">
            <div class="reconnect-progress-bar"></div>
          </div>
          <div class="reconnect-attempt">Esperando acción…</div>
        </div>
        <button id="reconnect-button" type="button">Reconectar</button>
      </div>
      <div class="chat-controls">
        <input type="text" id="input" placeholder="Escribe y presiona Enter">
        <button id="inventory-button" type="button" class="btn-inventory-mini" title="Ver inventario"
          aria-label="Ver inventario">🎒</button>
      </div>
    </div>
    <div id="sidebar">
      <div class="card sidebar-hero">
        <div class="sidebar-kicker" data-status="offline">Panel en vivo</div>
        <h2>Información</h2>
        <p>Estado de la sesión, jugador y servidor con lectura rápida.</p>
        <div class="sidebar-meta"><span class="sidebar-meta-label">Fecha</span><span
            class="sidebar-meta-value highlight" id="time">--/--/----</span></div>
        <div class="sidebar-badges"><span class="status-pill">Conectado</span><span class="status-pill ghost">Offline /
            No premium</span></div>
      </div>
      <div class="card">
        <div class="card-head">
          <div class="card-icon">👤</div>
          <div>
            <h3>Jugador</h3>
            <div class="card-subtitle">Identidad de la sesión</div>
          </div>
        </div>
        <div class="card-metric"><span class="metric-label">Nombre</span><span class="metric-value highlight"
            id="username">-</span></div>
        <div class="card-metric"><span class="metric-label">Versión</span><span class="metric-value"
            id="version">-</span></div>
      </div>
      <div class="card">
        <div class="card-head">
          <div class="card-icon">🌐</div>
          <div>
            <h3>Conexión</h3>
            <div class="card-subtitle">Latencia del servidor</div>
          </div>
        </div>
        <div class="card-metric"><span class="metric-label">Ping</span><span class="metric-value" id="ping">0 ms</span>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <div class="card-icon">🖥</div>
          <div>
            <h3>Servidor</h3>
            <div class="card-subtitle">Dirección IP</div>
          </div>
        </div>
        <div class="card-metric"><span class="metric-label">Host</span><span class="metric-value" id="server">-</span>
        </div>
        <div class="card-metric"><span class="metric-label">Puerto</span><span class="metric-value"
            id="port">25565</span></div>
      </div>
    </div>
    <div id="menu-panel" aria-live="polite">
      <div id="menu-header">
        <div>
          <div id="menu-title">Sin menú activo</div>
          <div id="menu-meta">Cuando el servidor abra un inventario, aparecerá aquí.</div>
        </div>
        <button id="menu-close-btn" type="button" class="menu-close-btn" aria-label="Cerrar panel">✕</button>
      </div>
      <div id="menu-busy">Cambiando de servidor...</div>
      <input id="menu-search" type="text" placeholder="Buscar por nombre o lore">
      <div id="menu-base-filters"></div>
      <div id="menu-results"></div>
      <div id="menu-grid"></div>
      <div id="menu-empty" class="menu-empty">Aún no hay opciones disponibles.</div>
    </div>
  </div>
  <div id="action-modal" class="action-modal" aria-hidden="true">
    <div class="action-modal-content">
      <div class="action-modal-header"><span id="action-modal-title" class="action-modal-title">Interactuar con
          Ítem</span><button id="action-modal-close-btn" type="button" class="action-modal-close"
          aria-label="Cerrar modal">✕</button></div>
      <div class="action-modal-body">
        <p id="action-modal-text">¿Cómo quieres hacer clic en el objeto?</p>
        <div class="action-modal-buttons">
          <button id="action-btn-left" type="button" class="action-btn left">Clic Izquierdo</button>
          <button id="action-btn-right" type="button" class="action-btn right">Clic Derecho</button>
          <button id="action-btn-use" type="button" class="action-btn use"
            style="grid-column: span 2; margin-top: 4px;">⚡ Usar / Equipar en mano</button>
        </div>
      </div>
    </div>
  </div>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="js/shared/utils.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
````

## File: profiles.json
````json
{
  "username": "Cachyzz0",
  "ip": "mc.haliacraft.com",
  "port": 25565,
  "version": "1.21.11",
  "mode": "nogui"
}
````

## File: src/game-launcher.js
````javascript
function httpsGetBuffer(url, timeoutMs = 30000)
⋮----
async function fetchJson(url, timeoutMs = 30000)
⋮----
async function httpsRequestJson(url,
⋮----
async function ensureDir(dir)
⋮----
function sha1Hex(buffer)
⋮----
async function fileExists(filePath)
⋮----
async function verifyFile(filePath, expectedSha1, expectedSize)
⋮----
async function downloadFileWithVerify(url, destPath,
⋮----
function applyRuleSet(rules, osName = "windows", featureFlags = null)
⋮----
function toArtifactPath(name)
⋮----
function formatJvmRuleArg(arg, replacements)
⋮----
function parseLaunchArgsString(raw)
⋮----
function parseLibraryNameParts(name)
⋮----
function resolveWindowsNativeDownload(lib)
⋮----
class GameLauncherService
⋮----
getRuntimeStallThresholdMs()
⋮----
getMinecraftDir()
⋮----
getCatalogCacheFile()
⋮----
async readCatalogCache()
⋮----
async writeCatalogCache(cache)
⋮----
normalizeCatalog(vanilla, forge, fabric)
⋮----
async fetchVanillaCatalog()
⋮----
async fetchFabricCatalog()
⋮----
async fetchForgeCatalog()
⋮----
async getVersionCatalog(
⋮----
async detectJavaRuntimes()
⋮----
const add = (label, p) =>
⋮----
async resolveJavaPath(preferredPath = "")
⋮----
async buildJavaCandidates(
⋮----
const push = (p) =>
⋮----
async resolveVersionRuntime(cleanVersion)
⋮----
emitInstallUpdate(installId, patch)
⋮----
buildInstallId(source, versionId)
⋮----
async installVersion(
⋮----
const run = async () =>
⋮----
getInstallStatus(installId = "")
⋮----
cancelInstall(installId)
⋮----
async installFabricProfile(gameVersion, loaderVersion, installId, signal)
⋮----
async installVanillaVersion(versionId, installId, signal, baseProgress = 0, maxProgress = 100)
⋮----
const trackChunk = (delta) =>
⋮----
run: () => downloadFileWithVerify(client.url, clientPath,
⋮----
onProgress: (p)
⋮----
run: () => downloadFileWithVerify(artifact.url, dest,
⋮----
run: () => downloadFileWithVerify(url, dest,
⋮----
run: () => downloadFileWithVerify(n.url, dest,
⋮----
run: async () =>
⋮----
async launchGame(
⋮----
stopGame()
⋮----
async extractNativeJars(nativeJarPaths, nativesDir, nativeSkipped = [])
⋮----
async directoryHasDll(rootDir)
⋮----
async countDllsInDirectory(rootDir)
⋮----
async tryLaunchProcess(
⋮----
const pushLine = (prefix, raw) =>
⋮----
const finish = (result) =>
⋮----
getGameRuntimeStatus()
⋮----
async isVersionInstalled(
⋮----
getAuthSession()
⋮----
listAuthSessions()
⋮----
setActiveAuthSession(accountId)
⋮----
removeAuthSession(accountId)
⋮----
async msLogin()
⋮----
msLogout()
⋮----
getMicrosoftState()
⋮----
saveMicrosoftState(state)
⋮----
buildMicrosoftAccountRecord(tokenRes, mcAuth, rawCacheBlob)
⋮----
upsertMicrosoftAccount(state, account)
⋮----
async startMicrosoftLoopbackServer(timeoutMs)
⋮----
waitForCode: async () =>
⋮----
async exchangeMicrosoftToMinecraft(msAccessToken)
⋮----
decodeCacheBlob(account)
⋮----
async resolveMicrosoftLaunchProfile()
````

## File: preload.js
````javascript
getLastProfile: ()
startContinue: ()
startNew: (profile)
getConfig: ()
saveConfig: (config)
getInfo: ()
getVersionCatalog: ()
refreshVersionCatalog: ()
installVersion: (payload)
getInstallStatus: (installId)
isVersionInstalled: (payload)
getGameRuntimeStatus: ()
cancelInstall: (installId)
launchGame: (payload)
stopGame: ()
getJavaRuntimes: ()
setJavaPath: (javaPath)
getForgeCatalog: ()
getFabricCatalog: ()
msLogin: ()
msLogout: ()
getAuthSession: ()
listAuthSessions: ()
setActiveAuthSession: (accountId)
removeAuthSession: (accountId)
menuReady: ()
toggleFullscreen: ()
getFullscreen: ()
quitApp: ()
returnToLauncher: ()
````

## File: js/launcher.js
````javascript

````

## File: launcher.html
````html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MC-BETA</title>
  <link rel="stylesheet" href="css/shared.css">
  <link rel="stylesheet" href="css/main.css">
  <link rel="stylesheet" href="css/launcher.css">
  <style>
    html, body { overflow-x: hidden; overflow-y: auto; }
    body { min-height: 100vh; height: auto; visibility: hidden; }
  </style>
</head>
<body class="launcher-page">
  <div id="launcher-overlay" class="launcher-overlay">
    <video id="launcher-bg-video" class="launcher-bg-video" autoplay muted loop playsinline></video>
    <audio id="launcher-menu-audio" loop>
      <source src="mp3/main-menu.mp3" type="audio/mpeg">
    </audio>
    <button id="launcher-audio-toggle" class="launcher-audio-toggle" type="button" aria-label="Silenciar música" title="Silenciar música">
      <i data-lucide="volume-2"></i>
    </button>
    <div class="launcher-shell">
      <div class="launcher-brand">MC-BETA</div>
      <div class="launcher-sub">Esto nunca termina...</div>
      <div class="launcher-menu" id="launcher-main-menu">
        <button type="button" id="menu-play-btn" class="launcher-btn">Jugar (Multijugador)</button>
        <button type="button" id="menu-config-btn" class="launcher-btn">Configuracion</button>
        <button type="button" id="menu-info-btn" class="launcher-btn">Informacion</button>
        <button type="button" id="menu-fullscreen-btn" class="launcher-btn">Pantalla completa (F11)</button>
        <button type="button" id="menu-exit-btn" class="launcher-btn">Salir</button>
      </div>
      <div id="launcher-play-view" class="launcher-view">
        <div class="launcher-section-title">Jugar (Multijugador / Juego Java)</div>
        <div class="launcher-play-tabs" role="tablist" aria-label="Modo de juego">
          <button type="button" id="play-tab-bot" class="launcher-play-tab active" role="tab" aria-selected="true" aria-controls="play-tab-panel-bot"><i data-lucide="bot"></i><span>Bot rápido</span></button>
          <button type="button" id="play-tab-java" class="launcher-play-tab" role="tab" aria-selected="false" aria-controls="play-tab-panel-java"><i data-lucide="gamepad-2"></i><span>Juego Java</span></button>
        </div>
        <div id="play-tab-panel-bot" class="launcher-play-panel active" role="tabpanel">
          <div class="launcher-helper-text">Conexión rápida al panel Mineflayer.</div>
          <div class="launcher-row">
            <button type="button" id="continue-last-btn" class="launcher-btn alt"><i data-lucide="history"></i><span>Continuar con la ultima</span></button>
            <button type="button" id="create-new-btn" class="launcher-btn alt"><i data-lucide="plus-circle"></i><span>Crear nueva</span></button>
          </div>
          <div id="new-profile-form" class="launcher-form hidden">
            <input id="new-username" type="text" placeholder="Nickname offline/no premium">
            <input id="new-ip" type="text" placeholder="IP (ej: mc.haliacraft.com)">
            <input id="new-port" type="number" placeholder="Puerto (25565)">
            <input id="new-version" type="text" placeholder="Version (ej: 1.21.11)">
            <button type="button" id="start-new-profile-btn" class="launcher-btn"><i data-lucide="rocket"></i><span>Iniciar nueva partida</span></button>
          </div>
        </div>
        <div id="play-tab-panel-java" class="launcher-play-panel" role="tabpanel" hidden>
          <div class="launcher-helper-text">Selecciona modo y versión, luego pulsa Lanzar.</div>
          <div class="launcher-form launcher-java-layout">
            <section class="launcher-java-card">
              <div class="launcher-java-top-row">
                <div class="launcher-java-field">
                  <label for="game-username"><i data-lucide="user-round"></i><span>Nickname (offline)</span></label>
                  <input id="game-username" type="text" placeholder="JugadorOffline">
                </div>
                <div class="launcher-java-field">
                  <label for="game-auth-mode"><i data-lucide="key-round"></i><span>Modo de autenticación</span></label>
                  <select id="game-auth-mode">
                    <option value="offline">Offline</option>
                    <option value="microsoft" disabled>Microsoft (temporalmente deshabilitado)</option>
                  </select>
                </div>
              </div>
              <label for="game-distribution"><i data-lucide="layers"></i><span>Distribución</span></label>
              <select id="game-distribution">
                <option value="vanilla">Vanilla</option>
                <option value="fabric">Fabric</option>
                <option value="forge">Forge</option>
              </select>
              <div id="ms-auth-panel" class="launcher-ms-auth-panel hidden">
                <label for="ms-account-select"><i data-lucide="user-check"></i><span>Cuenta Microsoft activa</span></label>
                <select id="ms-account-select"></select>
                <div class="launcher-row">
                  <button type="button" id="ms-login-btn" class="launcher-link"><i data-lucide="log-in"></i><span>Iniciar sesión</span></button>
                  <button type="button" id="ms-logout-btn" class="launcher-link"><i data-lucide="log-out"></i><span>Cerrar sesión</span></button>
                  <button type="button" id="ms-remove-btn" class="launcher-link"><i data-lucide="user-minus"></i><span>Quitar cuenta</span></button>
                </div>
                <div id="ms-auth-status" class="launcher-status" data-kind="ok"></div>
              </div>
            </section>
            <section class="launcher-java-card">
              <label for="game-version-select"><i data-lucide="list-tree"></i><span>Versión disponible</span></label>
              <div id="game-version-type-filters" class="launcher-version-filters">
                <label class="launcher-check"><input id="filter-release" type="checkbox" checked><span>Release</span></label>
                <label class="launcher-check"><input id="filter-snapshot" type="checkbox"><span>Snapshot</span></label>
                <label class="launcher-check"><input id="filter-old-beta" type="checkbox"><span>Old Beta</span></label>
                <label class="launcher-check"><input id="filter-old-alpha" type="checkbox"><span>Old Alpha</span></label>
              </div>
              <select id="game-version-select"></select>
            </section>
            <details id="game-advanced-section" class="launcher-advanced-toggle">
              <summary><i data-lucide="sliders-horizontal"></i><span>Avanzado</span></summary>
              <div class="launcher-advanced-body">
                <label for="game-java-path"><i data-lucide="coffee"></i><span>Java path (opcional)</span></label>
                <input id="game-java-path" type="text" placeholder="C:\\Program Files\\Java\\...\\bin\\javaw.exe">
                <div class="launcher-advanced-memory">
                  <div>
                    <label for="game-min-memory-mb"><i data-lucide="memory-stick"></i><span>Memoria mínima (MB)</span></label>
                    <input id="game-min-memory-mb" type="number" min="512" step="256" placeholder="1024">
                  </div>
                  <div>
                    <label for="game-max-memory-mb"><i data-lucide="memory-stick"></i><span>Memoria máxima (MB)</span></label>
                    <input id="game-max-memory-mb" type="number" min="1024" step="256" placeholder="2048">
                  </div>
                </div>
                <label for="game-extra-jvm-args"><i data-lucide="terminal-square"></i><span>Args JVM extra</span></label>
                <input id="game-extra-jvm-args" type="text" placeholder="-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions">
                <label for="game-extra-game-args"><i data-lucide="command"></i><span>Args de juego extra</span></label>
                <input id="game-extra-game-args" type="text" placeholder="--quickPlaySingleplayer Mundo1">
                <button type="button" id="game-scan-java-btn" class="launcher-link"><i data-lucide="search-check"></i><span>Detectar Java</span></button>
              </div>
            </details>
            <div class="launcher-row launcher-row-actions launcher-java-tools">
            </div>
            <div class="launcher-row launcher-row-actions launcher-java-main-actions">
              <button type="button" id="game-launch-btn" class="launcher-btn"><i data-lucide="play"></i><span>Lanzar juego</span></button>
              <button type="button" id="game-stop-btn" class="launcher-link"><i data-lucide="square"></i><span>Cerrar juego</span></button>
            </div>
            <div class="launcher-status-wrap">
              <div id="game-install-status" class="launcher-status launcher-status-terminal" data-kind="ok"></div>
              <button type="button" id="game-show-diagnostics-btn" class="launcher-status-icon-side-btn" aria-label="Ver diagnóstico" title="Ver diagnóstico"><i data-lucide="stethoscope"></i></button>
            </div>
          </div>
        </div>
        <button type="button" id="play-back-btn" class="launcher-link">Volver</button>
      </div>
      <div id="launcher-config-view" class="launcher-view">
        <div class="launcher-section-title">Configuracion (config.json)</div>
        <div class="launcher-form">
          <label for="cfg-client-id">Discord Client ID</label>
          <input id="cfg-client-id" type="text" placeholder="your_discord_app_client_id_here">
          <label for="cfg-preferred-versions">Preferred Versions (Mineflayer)</label>
          <select id="cfg-preferred-versions" multiple size="7">
            <option value="1.16.5">1.16.5</option><option value="1.17.1">1.17.1</option><option value="1.18.2">1.18.2</option>
            <option value="1.19.4">1.19.4</option><option value="1.20.1">1.20.1</option><option value="1.20.4">1.20.4</option>
            <option value="1.20.6">1.20.6</option><option value="1.21">1.21</option><option value="1.21.1">1.21.1</option>
            <option value="1.21.4">1.21.4</option><option value="1.21.8">1.21.8</option><option value="1.21.11">1.21.11</option>
          </select>
          <label for="cfg-reconnect-delay">Reconnect Delay (ms)</label>
          <input id="cfg-reconnect-delay" type="number" min="0" step="50" placeholder="650">
          <label for="cfg-auth-recovery-window">Auth Recovery Window (ms)</label>
          <input id="cfg-auth-recovery-window" type="number" min="1000" step="500" placeholder="30000">
          <label for="cfg-max-reconnect-attempts">Max Reconnect Attempts</label>
          <input id="cfg-max-reconnect-attempts" type="number" min="1" step="1" placeholder="6">
          <label for="cfg-reconnect-backoff-max">Reconnect Backoff Max (ms)</label>
          <input id="cfg-reconnect-backoff-max" type="number" min="500" step="250" placeholder="4000">
          <label for="cfg-reconnect-jitter">Reconnect Jitter Ratio</label>
          <input id="cfg-reconnect-jitter" type="number" min="0" max="1" step="0.05" placeholder="0.2">
          <label class="launcher-check launcher-config-check"><input id="cfg-velocity-compat" type="checkbox"><span>Velocity Compat Mode</span></label>
          <label class="launcher-check launcher-config-check"><input id="cfg-debug-lifecycle" type="checkbox"><span>Debug Lifecycle</span></label>
          <label for="cfg-verbose-mode">Verbose (solo consola Electron)</label>
          <select id="cfg-verbose-mode"><option value="app">Solo logs de app</option><option value="all">App + bot/server/chat/system</option></select>
        </div>
        <div class="launcher-row">
          <label for="bg-video-mode-select">Video menu:</label>
          <select id="bg-video-mode-select"><option value="auto">Auto</option><option value="1080p">Forzar 1080p</option><option value="2k">Forzar 2K</option><option value="4k">Forzar 4K</option></select>
        </div>
        <div class="launcher-row">
          <button type="button" id="save-config-btn" class="launcher-btn">Guardar config.json</button>
          <button type="button" id="config-back-btn" class="launcher-link">Volver</button>
        </div>
      </div>
      <div id="launcher-info-view" class="launcher-view">
        <div class="launcher-section-title">Informacion</div>
        <pre id="info-content"></pre>
        <button type="button" id="info-back-btn" class="launcher-link">Volver</button>
      </div>
      <div id="launcher-status" class="launcher-status"></div>
    </div>
    <div id="launcher-controls-hint" class="launcher-controls-hint" aria-hidden="true">
      <span class="launcher-control-item"><i data-lucide="arrow-left"></i><span>Left</span></span>
      <span class="launcher-control-item"><i data-lucide="arrow-up"></i><span>Up</span></span>
      <span class="launcher-control-item"><i data-lucide="arrow-down"></i><span>Down</span></span>
      <span class="launcher-control-item"><i data-lucide="arrow-right"></i><span>Right</span></span>
      <span class="launcher-control-item"><i data-lucide="corner-down-left"></i><span>Enter</span></span>
      <span class="launcher-control-item"><i data-lucide="x"></i><span>Esc</span></span>
    </div>
  </div>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="js/shared/utils.js"></script>
  <script src="js/launcher/utils.js"></script>
  <script src="js/launcher/state.js"></script>
  <script src="js/launcher/dom.js"></script>
  <script src="js/launcher/services.js"></script>
  <script src="js/launcher/status.js"></script>
  <script src="js/launcher/audio.js"></script>
  <script src="js/launcher/background.js"></script>
  <script src="js/launcher/auth-ui.js"></script>
  <script src="js/launcher/catalog.js"></script>
  <script src="js/launcher/runtime.js"></script>
  <script src="js/launcher/navigation.js"></script>
  <script src="js/launcher/config-form.js"></script>
  <script src="js/launcher/actions.js"></script>
  <script src="js/launcher/index.js"></script>
  <script src="js/launcher.js"></script>
</body>
</html>
````

## File: config.json
````json
{
  "clientId": "1410394282841342055",
  "launcher": {
    "preferredVersions": [
      "1.21.11"
    ],
    "velocityCompatMode": true,
    "debugLifecycle": true,
    "verboseMode": "all",
    "reconnectDelayMs": 650,
    "authRecoveryWindowMs": 30000,
    "maxReconnectAttempts": 6,
    "reconnectBackoffMaxMs": 4000,
    "reconnectJitterRatio": 0.2,
    "menuBackgroundMode": "auto",
    "catalogCache": {
      "ttlMs": 21600000
    },
    "downloads": {
      "minecraftDir": "",
      "javaPath": "C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.8.9-hotspot\\bin\\javaw.exe",
      "minMemoryMb": 1024,
      "maxMemoryMb": 2048,
      "extraJvmArgs": "",
      "extraGameArgs": ""
    }
  },
  "auth": {
    "microsoft": {
      "tenant": "consumers",
      "clientId": "",
      "redirectStrategy": "loopback",
      "loginTimeoutMs": 180000,
      "accounts": [],
      "activeAccountId": null
    }
  }
}
````

## File: css/main.css
````css

````

## File: main.js
````javascript
loadConfig: ()
saveConfig: (cfg)
stopBotSession: ()
onInstallUpdate: () =>
````

## File: index.html
````html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0;url=launcher.html" />
  <title>MC-BETA</title>
</head>
<body>
  <script>window.location.replace('launcher.html');</script>
</body>
</html>
````

## File: minelight.js
````javascript
function getActiveVersion()
⋮----
function buildBotOptions()
⋮----
function closeDiscordPresence()
⋮----
function isShuttingDown()
⋮----
function debugLog(event, details = "")
⋮----
function isIgnored(message)
⋮----
function shouldSuppressDuplicate(text, source)
⋮----
function normalizeChatKey(text)
⋮----
function prunePendingOutboundEchoes()
⋮----
function markOutboundEcho(text)
⋮----
function consumeOutboundEcho(text,
⋮----
function pushChatHistory(entry)
⋮----
function broadcastChatHistory(ws)
⋮----
function broadcastSidebarState(status)
⋮----
function refreshVitalsFromBot()
⋮----
function broadcastVitals()
⋮----
function clearReconnectTimer()
⋮----
function clearStableSessionTimer()
⋮----
function computeReconnectDelay(attempt)
⋮----
function markAuthCommandIfNeeded(text)
⋮----
function classifyDisconnectEvent(
⋮----
function finishReconnectCycle(
⋮----
function scheduleAdaptiveReconnect(
⋮----
function handleDisconnectEvent(eventType,
⋮----
function createBotInstance()
⋮----
function requestLocalRestart({
    resetVersionCycle = false,
    delayMs = reconnectDelayMs,
    reasonType = "manual",
    reasonText = "",
    attempt = reconnectAttempt,
    maxAttempts = maxReconnectAttempts,
    showOffline = false,
} =
⋮----
function scheduleVersionRetry(reason)
⋮----
function getChatDecoder()
⋮----
function decodeMinecraftText(input)
⋮----
function sanitizeVisibleText(input)
⋮----
function simplifyNbt(tag)
⋮----
function normalizeLore(rawLore)
⋮----
function readItemComponent(item, candidates)
⋮----
function extractModernDisplayData(item)
⋮----
function handleMenuReadError(error, context = "menu")
⋮----
function broadcast(payload)
⋮----
function emitChatLine(text, source = "chat")
⋮----
function sendLocalChatLine(text, origin = "console")
⋮----
function flushPendingOutboundMessages()
⋮----
function serializeItem(item, slot)
⋮----
function sendInventorySnapshot(ws, tokenOverride = null)
⋮----
function serializeMenu(window, token)
⋮----
function cancelMenuRefresh()
⋮----
function broadcastMenu(window,
⋮----
function retryBroadcastMenu(window,
⋮----
const attempt = () =>
⋮----
function scheduleMenuRefresh(window)
⋮----
function attachWindowRealtime(window)
⋮----
activeMenuUpdateHandler = () =>
⋮----
function detachWindowRealtime()
⋮----
function closeMenu()
⋮----
function setMenuTransitionLocked(locked, message)
⋮----
// MANAGE COMMANDS FROM TERMINAL
⋮----
function registerBotEvents(currentBot)
⋮----
const onUncaughtException = (err) =>
const onUnhandledRejection = (reason, promise) =>
const onProcessExit = () =>
⋮----
async function stop()
````
