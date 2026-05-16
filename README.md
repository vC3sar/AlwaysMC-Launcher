# 🚀 MC-BETA | AlwaysMC Launcher

![Version](https://img.shields.io/badge/version-1.0.0--beta-orange)
![Node.js](https://img.shields.io/badge/Node.js-v16%2B-green)
![Discord RPC](https://img.shields.io/badge/Discord-Rich%20Presence-7289DA)
![Organization](https://img.shields.io/badge/Org-vazquezsg.ovh-blue)

**AlwaysMC Launcher** es una herramienta versátil diseñada para gestionar perfiles de Minecraft y permitir el acceso al juego en dos modalidades distintas: **GUI (Instancia oficial)** y **NoGUI (Bot/Mineflayer)**. Todo esto acompañado de una integración fluida con **Discord Rich Presence**.

---

## ✨ Características Principales

*   **🎮 Modo Híbrido:** Elige entre jugar normalmente (GUI) o conectar una instancia automatizada mediante Mineflayer (NoGUI).
*   **🌐 Sincronización con Mojang:** Obtiene dinámicamente el manifiesto oficial de versiones para asegurar compatibilidad.
*   **💬 Discord Rich Presence:** Muestra en tu perfil de Discord qué versión estás jugando y en qué servidor te encuentras.
*   **📁 Gestión de Perfiles:** Guarda automáticamente tu última configuración (usuario, IP, versión) en `profiles.json`.
*   **🛠️ Configuración Centralizada:** Controla parámetros sensibles como el `clientId` de Discord desde un solo lugar.

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
    Asegúrate de editar el archivo `config.json` con tu Client ID de Discord:
    ```json
    {
      "clientId": "TU_CLIENT_ID_AQUÍ"
    }
    ```

---

## 🚀 Modo de Uso

Para iniciar el launcher, simplemente ejecuta:

```bash
node main.js
```

### Flujo de la aplicación:
1.  **Detección de Perfil:** Si ya has usado la app, cargará tus datos anteriores.
2.  **Configuración:** Si deseas cambiar, podrás elegir:
    *   Nombre de usuario.
    *   IP del servidor.
    *   Modo de ejecución (GUI / NoGUI).
    *   Versión del juego (Filtrada por compatibilidad).
3.  **Ejecución:** Se activará el **Rich Presence** y se lanzará la instancia seleccionada.

---

## 📂 Estructura del Proyecto

*   `main.js`: Lógica principal del menú y gestión de perfiles.
*   `fn/discord.js`: Módulo encargado de la comunicación con la API de Discord.
*   `config.json`: Variables de entorno y configuración técnica.
*   `config/ignore.json`: Lista negra de mensajes para filtrar la consola en modo NoGUI. 
*   `profiles.json`: Almacenamiento local del estado del usuario.

---

## 👥 Créditos

Este proyecto es mantenido y desarrollado por:

*   **Developer:** vC3sar
*   **Organización:** vazquezsg.ovh

---

## ⚖️ Licencia

Este proyecto está bajo la licencia MIT. Puedes consultarla en el archivo LICENSE para más detalles.