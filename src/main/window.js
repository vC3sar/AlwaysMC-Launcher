const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

class WindowManager {
  constructor() {
    this.mainWindow = null;
  }

  createWindow() {
    const win = new BrowserWindow({
      show: false,
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
