const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  windowControls: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close')
  },
  // Open the other app window (admin <-> terminal) without closing the current one.
  openWindow: (mode) => ipcRenderer.send('open-window', mode),
  args: process.argv.filter(arg => arg.startsWith('--'))
});
