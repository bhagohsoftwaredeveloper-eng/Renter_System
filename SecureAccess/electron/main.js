const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

// Prevent multiple instances from running
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  const isDev = !app.isPackaged;

  let adminWindow;
  let terminalWindow;

  // Open (or focus, if already open) a window for the requested mode.
  function openWindow(mode) {
    if (mode === 'terminal') {
      if (terminalWindow) {
        if (terminalWindow.isMinimized()) terminalWindow.restore();
        terminalWindow.focus();
      } else {
        createTerminalWindow();
      }
    } else {
      if (adminWindow) {
        if (adminWindow.isMinimized()) adminWindow.restore();
        adminWindow.focus();
      } else {
        createAdminWindow();
      }
    }
  }

  // Decide which window(s) a set of CLI args asks for.
  function openWindowsForArgs(args) {
    const wantAdmin = args.includes('--admin');
    const wantTerminal = args.includes('--terminal');
    if (wantAdmin) openWindow('admin');
    if (wantTerminal) openWindow('terminal');
    // No flags: just bring an existing window forward (don't force a new one).
    if (!wantAdmin && !wantTerminal) {
      if (adminWindow) openWindow('admin');
      else if (terminalWindow) openWindow('terminal');
      else createAdminWindow();
    }
  }

  // When a second launch happens (e.g. clicking the Terminal shortcut while Admin
  // is open), open the window it asked for instead of just refocusing.
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    openWindowsForArgs(commandLine);
  });

  // Renderer-triggered: let the running app pop open the other window.
  ipcMain.on('open-window', (event, mode) => {
    openWindow(mode === 'terminal' ? 'terminal' : 'admin');
  });

  function createAdminWindow() {
    adminWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: "ServeQueue - Admin Panel",
      frame: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        additionalArguments: ['--mode=admin'],
        webSecurity: false,
      },
      icon: path.join(__dirname, '../assets/serveQueue.png'),
    });

    if (isDev) {
      adminWindow.loadURL('http://localhost:8081?mode=admin');
    } else {
      adminWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { mode: 'admin' } });
    }
    
    adminWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`Admin window failed to load: ${errorCode} - ${errorDescription}`);
    });

    // adminWindow.webContents.openDevTools();
    
    adminWindow.on('closed', () => (adminWindow = null));
  }

  function createTerminalWindow() {
    terminalWindow = new BrowserWindow({
      fullscreen: true,
      title: "ServeQueue - Biometric Terminal",
      frame: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        additionalArguments: ['--mode=terminal'],
        webSecurity: false,
      },
      icon: path.join(__dirname, '../assets/serveQueue.png'),
    });

    if (isDev) {
      terminalWindow.loadURL('http://localhost:8081?mode=terminal');
    } else {
      terminalWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { mode: 'terminal' } });
    }
    
    terminalWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error(`Terminal window failed to load: ${errorCode} - ${errorDescription}`);
    });

    // terminalWindow.webContents.openDevTools();
    
    terminalWindow.on('closed', () => (terminalWindow = null));
  }

  app.on('ready', () => {
    openWindowsForArgs(process.argv);
    Menu.setApplicationMenu(null);
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
}
