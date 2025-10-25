const { app, BrowserWindow, Menu, systemPreferences } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Import IPC handlers
const { registerIPCHandlers, unregisterIPCHandlers } = require('./ipc-handlers');

// Enable live reload for development only
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (e) {
    console.log('electron-reload not available in development');
  }
}

async function requestPermissions() {
  try {
    // Request microphone permission
    const microphoneAccess = await systemPreferences.askForMediaAccess('microphone');
    console.log('Microphone access:', microphoneAccess);
    
    // Request camera permission (optional for future features)
    const cameraAccess = await systemPreferences.askForMediaAccess('camera');
    console.log('Camera access:', cameraAccess);
    
    return { microphone: microphoneAccess, camera: cameraAccess };
  } catch (error) {
    console.log('Permission request error:', error);
    return { microphone: false, camera: false };
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      // Security: Force safe defaults
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      devTools: isDev, // Only enable in development
      preload: path.join(__dirname, 'preload.js'), // Use compiled preload
    },
    icon: path.join(__dirname, '../public/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png'),
    titleBarStyle: 'default',
    show: false, // Don't show until ready-to-show
    title: 'StagAlgo - Advanced Trading Platform'
  });

  // Security: Block all navigation attempts
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const validOrigins = isDev 
      ? ['localhost:5173'] 
      : ['file://'];
    
    const isValid = validOrigins.some(origin => 
      navigationUrl.includes(origin)
    );
    
    if (!isValid) {
      console.warn('🚫 Blocked navigation to:', navigationUrl);
      event.preventDefault();
    }
  });

  // Security: Block new window creation
  mainWindow.webContents.setWindowOpenHandler(() => {
    console.warn('🚫 Blocked attempt to open new window');
    return { action: 'deny' };
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    app.quit();
  });

  return mainWindow;
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Register IPC handlers with validation
  registerIPCHandlers();
  
  // Request permissions during startup
  await requestPermissions();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Cleanup IPC handlers
  unregisterIPCHandlers();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Additional web contents protection
app.on('web-contents-created', (_event, contents) => {
  // Block new windows from renderer
  contents.on('new-window', (event) => {
    console.warn('🚫 Blocked new-window event');
    event.preventDefault();
  });

  // Block navigation to external URLs
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== 'file:' && !navigationUrl.includes('localhost:5173')) {
      console.warn('🚫 Blocked navigation to:', navigationUrl);
      event.preventDefault();
    }
  });

  // Disable remote content
  contents.on('will-attach-webview', (event) => {
    console.warn('🚫 Blocked webview attachment');
    event.preventDefault();
  });
});

// Create application menu
const template = [
  {
    label: 'StagAlgo',
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  }
];

Menu.setApplicationMenu(Menu.buildFromTemplate(template));