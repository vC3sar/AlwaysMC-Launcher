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

El proyecto está organizado en una arquitectura modular que separa el proceso principal (Electron Main), las interfaces de usuario (Electron Renderer / Web local) y la lógica de integración del bot de Minecraft (Mineflayer):

### 📄 Archivos del Directorio Raíz
*   `mcbeta-context.md`: Contexto unificado y optimizado de todo el código del repositorio (generado mediante Repomix) diseñado especialmente para análisis e interacciones eficientes con Inteligencia Artificial.
*   `main.js`: Punto de entrada de Electron. Configura e inicializa el ciclo de vida de la aplicación y la ventana principal.
*   `preload.js`: Script de precarga de Electron que expone de forma segura las APIs del sistema y comunicación IPC al frontend.
*   `minelight.js`: Servidor WebSocket local que actúa como puente de comunicación en tiempo real entre la instancia del bot Mineflayer y el frontend web.
*   `index.html`: Dashboard web local expuesto para monitorear el chat, estado y estadísticas de la sesión NoGUI.
*   `launcher.html`: Interfaz visual del launcher de escritorio de Minecraft.
*   `app.html`: Interfaz del panel web embebido para interactuar con la sesión en tiempo real.
*   `config.json`: Configuración técnica de Rich Presence (Discord client ID) y otros parámetros globales.
*   `profiles.json`: Almacenamiento local para persistir el último perfil configurado por el usuario (usuario, IP, puerto, versión elegida).
*   `package.json`: Archivo de configuración de Node.js con la definición de scripts (`npm start`) y dependencias principales.

### 🛠️ Carpeta `src/` (Lógica Central)
*   `src/game-launcher.js`: Módulo principal del instalador y lanzador del cliente de Minecraft. Controla descargas de assets, librerías oficiales de Mojang, instalación automatizada de Fabric y ejecución de instancias.
*   `src/game-launcher/`:
    *   `constants.js`: Constantes globales, URLs de descargas oficiales y endpoints de APIs.
    *   `version-java.js`: Detección automática y emparejamiento inteligente de versiones de Java recomendadas según la versión de Minecraft.
*   `src/main/`: Lógica central del proceso principal de Electron:
    *   `bot.js`: Gestor del ciclo de vida de las sesiones del bot de Minecraft.
    *   `config.js`: Utilidades para la carga, normalización y guardado de configuraciones y perfiles.
    *   `ipc.js`: Manejadores de comunicación entre el frontend (Renderer) y el backend (Main).
    *   `window.js`: Controlador de la creación, dimensionamiento y renderizado de las ventanas gráficas.
*   `src/bot/`: Lógica interna de integración con Mineflayer:
    *   `bot-lifecycle.js`: Eventos de conexión, desconexión y spawn de los bots.
    *   `chat.js`: Procesamiento del chat del juego y decodificación de formatos de texto.
    *   `vitals.js`: Monitoreo del estado de salud, alimentación, ping y posición del bot.
    *   `menu.js`: Manejo de inventarios y menús dentro del juego.
    *   `ws-server.js`: Configuración e inicialización del túnel de WebSocket intermedio.

### 🎨 Recursos y Frontend (`css/` y `js/`)
*   `js/`: Scripts interactivos para las interfaces de usuario de Electron (navegación por teclado, control de pistas de audio de fondo, carga de catálogos oficiales, sincronización del formulario de configuración y actualización del terminal de estado).
*   `css/`: Hojas de estilo unificadas para el launcher y el panel web (`app.css`, `launcher.css`, `main.css`, `shared.css`), diseñadas para ofrecer una interfaz oscura inmersiva y moderna.
*   `config/ignore.json`: Lista negra y filtros de palabras/mensajes molestos para limpiar la salida del terminal del bot.
*   `mp3/` & `mp4/`: Recursos multimedia (música de fondo del menú principal y videos cinemáticos de fondo en bucle de 2K/4K).

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
