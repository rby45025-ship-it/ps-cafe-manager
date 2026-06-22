const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const { fork } = require("child_process");

const isDev = !app.isPackaged;
const PORT = 3721;

let mainWindow;
let serverProcess;

function startServer() {
  const serverPath = isDev
    ? path.join(__dirname, "server.js")
    : path.join(process.resourcesPath, "server.js");

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: isDev ? "development" : "production",
      USER_DATA: app.getPath("userData"),
    },
    silent: false,
  });

  serverProcess.on("error", (err) => console.error("Server error:", err));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "PlayStation Cafe Manager",
    backgroundColor: "#0d0d0d",
    show: false,
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(() => {
  startServer();
  // Give server a moment to start
  setTimeout(createWindow, 800);
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill();
});
