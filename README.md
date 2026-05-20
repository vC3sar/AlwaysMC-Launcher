# 🚀 MC-BETA | AlwaysMC Launcher

![Version](https://img.shields.io/badge/version-1.0.0--beta-orange)
![Electron](https://img.shields.io/badge/Electron-v31%2B-47848F)
![Node.js](https://img.shields.io/badge/Node.js-v16%2B-green)
![Discord RPC](https://img.shields.io/badge/Discord-Rich%20Presence-7289DA)
![Organization](https://img.shields.io/badge/Org-vazquezsg.ovh-blue)

**AlwaysMC Launcher** es un launcher de Minecraft de escritorio hecho con **Electron**, pensado exclusivamente para cuentas **offline / no premium**. Con él puedes instalar versiones de Minecraft (Vanilla y Fabric), lanzar el juego en modo gráfico completo, conectar un bot automático mediante **Mineflayer** (modo NoGUI), y mostrar en tu perfil de Discord exactamente qué estás jugando gracias a **Discord Rich Presence**.

No necesitas cuenta de Microsoft. No necesitas pagar nada. Solo instala, configura y juega.

---

## ✨ ¿Qué puede hacer?

| Función | Descripción |
|---|---|
| 🎮 **Launcher Java completo** | Descarga e instala versiones Vanilla y Fabric directamente desde los servidores oficiales de Mojang y FabricMC |
| ☕ **Detección automática de Java** | Detecta las versiones de Java instaladas en tu sistema y elige la más compatible con la versión de Minecraft que quieras jugar |
| 🤖 **Modo NoGUI (Bot)** | Conecta al servidor con un bot usando Mineflayer — ideal para servidores de granja o automatización |
| 🖥️ **Dashboard web en vivo** | Panel web local con chat en tiempo real, estado del bot, ping, vida, hambre y posición |
| 💬 **Discord Rich Presence** | Muestra en tu Discord qué versión estás jugando y en qué servidor estás |
| 📁 **Perfiles guardados** | Recuerda tu última configuración (usuario, IP, versión) para que no tengas que escribirla cada vez |
| 🎵 **Experiencia inmersiva** | Fondo de video cinemático y música ambiental en el menú principal |

---

## 🛠️ Requisitos

Antes de empezar, asegúrate de tener instalado lo siguiente:

- **[Node.js](https://nodejs.org/) v16 o superior** — necesario para ejecutar el proyecto.
- **[Java](https://adoptium.net/)** — necesario para lanzar Minecraft. El launcher detectará automáticamente las versiones que tengas instaladas y recomendará la más adecuada.
- **Git** — para clonar el repositorio (opcional si descargas el ZIP directamente).

> [!NOTE]
> Para el modo NoGUI (bot Mineflayer), no necesitas Java. Solo lo necesitas si vas a lanzar el cliente gráfico de Minecraft.

---

## ⚙️ Instalación

Sigue estos pasos para tener el launcher corriendo en tu máquina:

**1. Clona el repositorio:**
```bash
git clone https://github.com/vazquezsg-ovh/MC-BETA.git
cd MC-BETA
```

**2. Instala las dependencias de Node.js:**
```bash
npm install
```

**3. Configura tu Client ID de Discord** *(opcional, pero recomendado para activar Rich Presence)*:

Abre el archivo `config.json` y pega tu Client ID de Discord:
```json
{
  "clientId": "TU_CLIENT_ID_AQUÍ"
}
```

> [!TIP]
> Puedes crear una aplicación en el [Portal de Desarrolladores de Discord](https://discord.com/developers/applications) para obtener tu Client ID. Si lo dejas vacío, el launcher funcionará igual pero sin actualizar tu estado en Discord.

**4. ¡Listo! Arranca el launcher:**
```bash
npm start
```

---

## 🚀 ¿Cómo funciona?

Al abrir el launcher, encontrarás una interfaz con menú de navegación. Desde ahí puedes:

### 🎮 Pestaña Play — Lanzar Minecraft
1. Elige si quieres jugar con **Vanilla** (versión oficial sin mods) o **Fabric** (con soporte para mods).
2. Selecciona la versión de Minecraft que quieres usar.
3. Escribe tu **nombre de usuario offline** (puede ser cualquier nombre, no se valida con Mojang).
4. Si es la primera vez que usas esa versión, el launcher la **descargará e instalará automáticamente** (librerías, assets, Java runtime).
5. Pulsa **Play** — el juego abrirá como siempre.

### 🤖 Modo Bot (NoGUI)
1. Elige tu **nombre de usuario** e introduce la **IP del servidor**.
2. El bot de Mineflayer se conectará al servidor sin abrir una ventana gráfica del juego.
3. Abre el **Dashboard local** en tu navegador para ver el chat, los comandos y el estado de la sesión en tiempo real.

### Flujo general de la app:
```
Abrir launcher → Cargar perfil guardado → Elegir modo (juego o bot)
      ↓
  Instalar versión si es necesario → Activar Discord RPC → Iniciar
```

---

## 📂 Estructura del Proyecto

Aquí tienes un mapa del proyecto para que sepas qué hace cada parte. Está organizado de forma modular para que sea fácil de mantener y ampliar.

### 📄 Archivos en la raíz

| Archivo | ¿Para qué sirve? |
|---|---|
| `main.js` | Punto de entrada de Electron. Arranca la ventana principal y conecta todas las piezas. |
| `preload.js` | Puente de seguridad entre la lógica de Node.js y la interfaz web del launcher. |
| `minelight.js` | Servidor WebSocket local que transmite en tiempo real los eventos del bot al dashboard. |
| `launcher.html` | La interfaz visual principal del launcher (lo que ves cuando abres la app). |
| `app.html` | El panel de sesión activa, con chat, vitals y controles del bot. |
| `index.html` | Dashboard web ligero, accesible desde el navegador durante una sesión NoGUI. |
| `config.json` | Configuración global: Client ID de Discord, parámetros del launcher, preferencias avanzadas. |
| `profiles.json` | Guarda automáticamente tu último perfil para no tener que reescribirlo. |
| `package.json` | Metadatos y dependencias del proyecto Node.js. |
| `mcbeta-context.md` | Snapshot comprimido de todo el código del repositorio, optimizado para trabajar con IAs. |

### 🛠️ `src/` — El cerebro del launcher

#### `src/game-launcher.js`
El módulo más importante. Se encarga de **todo lo relacionado con instalar y lanzar Minecraft**:
- Descarga el manifest oficial de Mojang y lista las versiones disponibles.
- Descarga `client.jar`, librerías y assets con verificación SHA1.
- Soporta instalación de perfiles Fabric (descarga el profile JSON de FabricMC y lo integra).
- Construye los argumentos de la JVM y lanza el proceso de Java.
- Gestiona múltiples instalaciones paralelas con cancelación de soporte.

#### `src/game-launcher/`
- **`constants.js`** — URLs de las APIs oficiales (Mojang, FabricMC, Forge).
- **`version-java.js`** — Lógica para recomendar la versión correcta de Java según la versión de Minecraft (ej: Java 8 para 1.12, Java 17 para 1.18+, Java 21 para 1.21+).

#### `src/main/`
Módulos del **proceso principal de Electron**:
- **`bot.js`** — Gestiona el ciclo de vida del bot: arrancar, detener y reconectar sesiones Mineflayer.
- **`config.js`** — Carga, normaliza y guarda la configuración y los perfiles de usuario.
- **`ipc.js`** — Maneja la comunicación entre la interfaz (Renderer) y la lógica del sistema (Main) vía IPC de Electron.
- **`utils.js`** — Funciones auxiliares para parsear IPs, puertos y leer/escribir JSON de forma segura.
- **`window.js`** — Crea y gestiona las ventanas del launcher.

#### `src/bot/`
Todo lo relacionado con la **integración de Mineflayer**:
- **`bot-lifecycle.js`** — Eventos del bot: spawn, desconexión, errores y reintentos de reconexión.
- **`chat.js`** — Normaliza y procesa los mensajes de chat del servidor, con soporte para texto con formato de Minecraft.
- **`minecraft-text.js`** — Decodifica el formato de texto enriquecido de Minecraft (colores, estilos, componentes JSON).
- **`minecraft-components.js`** — Extrae datos de ítems del juego (nombre, lore, componentes NBT modernos).
- **`menu.js`** — Detecta e interactúa con inventarios y menús dentro del juego.
- **`vitals.js`** — Monitorea la vida, el hambre, el ping y la posición del bot en tiempo real.
- **`state.js`** — Objeto de estado centralizado de la sesión activa del bot.
- **`ws-server.js`** — Configura el servidor WebSocket que conecta el bot con el dashboard.
- **`launcher-config.js`** — Traduce la configuración del launcher al formato que necesita Mineflayer para conectarse.

### 🎨 `js/` y `css/` — La interfaz

#### `js/launcher/`
Scripts que controlan la experiencia interactiva del launcher:
- **`index.js`** — Inicializa el launcher y coordina todos los módulos.
- **`navigation.js`** — Navegación por teclado (flechas, Enter, Escape) para una experiencia tipo consola.
- **`catalog.js`** — Carga el catálogo de versiones (Vanilla, Fabric, Forge) con caché local de 6 horas.
- **`runtime.js`** — Monitorea el progreso de instalación y el estado del juego en ejecución.
- **`auth-ui.js`** — Controla qué formulario de autenticación mostrar según el modo elegido.
- **`actions.js`** — Bindings de eventos: botones, clicks y formularios.
- **`audio.js`** — Gestiona la reproducción y pausa de la música del menú.
- **`background.js`** — Selecciona y reproduce el video de fondo según la resolución disponible.
- **`status.js`** — Actualiza los indicadores de estado en la UI (instalación, juego, auth).

#### `css/`
Hojas de estilo modulares para el launcher y el panel web:
- **`shared.css`** — Variables CSS globales (colores, tipografía, espaciados).
- **`main/`** — Estilos del launcher: layout, botones, formularios, terminal de estado y modales de acción.
- **`app.css`** / **`launcher.css`** — Activación de capas visuales según el contexto de la página.

### 📁 Otros recursos

| Carpeta / Archivo | Contenido |
|---|---|
| `fn/discord.js` | Módulo que gestiona la conexión con la API de Discord Rich Presence. |
| `config/ignore.json` | Lista de palabras y mensajes que se filtran del terminal del bot para mantenerlo limpio. |
| `mp3/` | Música ambiental del menú principal. |
| `mp4/` | Videos cinemáticos de fondo en calidad estándar, 2K y 4K. |

---

## 🔐 Compatibilidad y limitaciones

Este proyecto está diseñado **únicamente para cuentas offline / no premium**. Esto significa:

- ✅ Funciona con cualquier nombre de usuario sin verificación.
- ✅ Puede conectarse a servidores en modo offline.
- ❌ **No** implementa autenticación de Microsoft ni flujo OAuth.
- ❌ **No** puede conectarse a servidores en modo online que requieran cuenta premium verificada.

> [!IMPORTANT]
> Si necesitas soporte para cuentas premium en el futuro, será necesario implementar el flujo de autenticación de Microsoft (MSAL) y gestionar los tokens de acceso de Mojang por separado. El código base ya incluye `@azure/msal-node` como dependencia preparada para esa eventual integración.

---

## 📸 Identidad visual en Discord

> [!TIP]
> El launcher utiliza los siguientes assets de imagen registrados en Discord:
> - **Logo Principal:** `logo` — Ícono de AlwaysMC.
> - **Icono Secundario:** `mc` — Ícono clásico de Minecraft.

---

## 👥 Créditos

Este proyecto es mantenido y desarrollado por:

- **Developer:** vC3sar
- **Organización:** [vazquezsg.ovh](https://vazquezsg.ovh)

---

## ⚖️ Licencia

Este proyecto está bajo la licencia **MIT**. Puedes usarlo, modificarlo y distribuirlo libremente siempre que conserves los créditos originales. Consulta el archivo `LICENSE` para más detalles.
