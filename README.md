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
