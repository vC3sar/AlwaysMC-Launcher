const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
let SentryMain = null;
try {
  SentryMain = require("@sentry/electron/main");
} catch {
  SentryMain = null;
}

class WindowManager {
  constructor() {
    this.mainWindow = null;
  }

  createWindow() {
    const win = new BrowserWindow({
      show: true,
      width: 1360,
      height: 860,
      minWidth: 1100,
      minHeight: 720,
      backgroundColor: "#08080b",
      autoHideMenuBar: app.isPackaged,
      webPreferences: {
        preload: path.join(__dirname, "../../preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    this.mainWindow = win;

    // Failsafe: evita que la app quede "invisible" si el renderer/preload falla
    // antes de enviar launcher:menuReady.
    setTimeout(() => {
      if (!win.isDestroyed() && !win.isVisible()) {
        console.warn("[Window] Failsafe show after 5s (menuReady not received).");
        win.show();
      }
    }, 5000);

    win.webContents.on("preload-error", (_, preloadPath, error) => {
      console.error("[Window] preload-error:", preloadPath, error);
      SentryMain?.captureException?.(
        error instanceof Error ? error : new Error(String(error)),
        {
          level: "error",
          tags: { process: "renderer", where: "preload-error" },
          extra: { preloadPath },
        },
      );
      if (!win.isDestroyed() && !win.isVisible()) win.show();
    });

    win.webContents.on("did-fail-load", (_, code, desc, url) => {
      const msg = `[Window] did-fail-load code=${code} desc=${desc} url=${url}`;
      console.error(msg);
      SentryMain?.captureMessage?.(msg, {
        level: "error",
        tags: { process: "renderer", where: "did-fail-load" },
      });
      if (!win.isDestroyed() && !win.isVisible()) win.show();
    });

    win.loadFile(path.join(__dirname, "../../launcher.html"));

    if (!app.isPackaged) {
      const devMenu = Menu.buildFromTemplate([
        {
          label: "Desarrollo",
          submenu: [
            { role: "reload", label: "Reload" },
            { role: "forceReload", label: "Force Reload" },
            { type: "separator" },
            { role: "toggleDevTools", label: "Debug / DevTools" },
          ],
        },
        {
          label: "Ventana",
          submenu: [
            {
              role: "togglefullscreen",
              label: "Pantalla completa (F11)",
              accelerator: "F11",
            },
            { type: "separator" },
            { role: "minimize" },
            { role: "close" },
          ],
        },
      ]);
      Menu.setApplicationMenu(devMenu);
      win.setMenuBarVisibility(true);
    } else {
      Menu.setApplicationMenu(null);
    }

    return win;
  }

  getMainWindow() {
    return BrowserWindow.getAllWindows()[0] || null;
  }
}

module.exports = new WindowManager();
