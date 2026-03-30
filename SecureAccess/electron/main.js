const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

let adminWindow;
let terminalWindow;

function createAdminWindow() {
  adminWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "SecureAccess - Admin Panel",
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const url = isDev 
    ? 'http://localhost:8081?mode=admin' 
    : `file://${path.join(__dirname, '../dist/index.html')}?mode=admin`;
  
  adminWindow.loadURL(url);
  if (isDev) adminWindow.webContents.openDevTools();
  
  adminWindow.on('closed', () => (adminWindow = null));
}

function createTerminalWindow() {
  terminalWindow = new BrowserWindow({
    fullscreen: true,
    title: "SecureAccess - Biometric Terminal",
    frame: false, 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const url = isDev 
    ? 'http://localhost:8081?mode=terminal' 
    : `file://${path.join(__dirname, '../dist/index.html')}?mode=terminal`;
  
  terminalWindow.loadURL(url);
  if (isDev) terminalWindow.webContents.openDevTools();
  
  terminalWindow.on('closed', () => (terminalWindow = null));
}

app.on('ready', () => {
  const args = process.argv;
  const showAdmin = args.includes('--admin');
  const showTerminal = args.includes('--terminal');

  if (showAdmin) {
    createAdminWindow();
  }
  
  if (showTerminal) {
    createTerminalWindow();
  }

  // Default: Open both if no flags provided
  if (!showAdmin && !showTerminal) {
    createAdminWindow();
    createTerminalWindow();
  }

  Menu.setApplicationMenu(null);

  ipcMain.on('window-minimize', (event) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    if (win) win.minimize();
  });

  ipcMain.on('window-maximize', (event) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('window-close', (event) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    if (win) win.close();
  });
});

// Handle SSL certificate errors for the biometric bridge (localhost)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('https://127.0.0.1') || url.startsWith('https://localhost')) {
    // IMPORTANT: Only do this for localhost to maintain security
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (adminWindow === null && terminalWindow === null) {
    createAdminWindow();
  }
});
