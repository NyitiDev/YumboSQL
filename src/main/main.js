const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

app.setName('YumboSQL');
const DatabaseService = require('./services/database');
const KeychainService = require('./services/keychain');

let mainWindow;
const dbService = new DatabaseService();
const keychainService = new KeychainService();

const isDev = !app.isPackaged;
const noLogo = process.env.YUMBOSQL_NO_LOGO === '1';
const devConsole = process.env.YUMBOSQL_DEVCONSOLE === '1';

// ── Simple prefs file (userData/prefs.json) ────────────────────
const PREFS_PATH = path.join(app.getPath('userData'), 'prefs.json');

function loadPrefs() {
  try {
    if (fs.existsSync(PREFS_PATH)) return JSON.parse(fs.readFileSync(PREFS_PATH, 'utf8'));
  } catch (_) {}
  return {};
}

function savePrefs(key, value) {
  const prefs = loadPrefs();
  prefs[key] = value;
  try { fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2), 'utf8'); } catch (_) {}
}

const SPLASH_WIDTH  = 480;
const SPLASH_HEIGHT = 560;
const MAIN_WIDTH    = 1400;
const MAIN_HEIGHT   = 900;

function createWindow() {
  const iconPath = path.join(__dirname, '..', '..', 'build', 'icon.icns');

  // macOS dock icon (in dev mode the Electron default icon is shown otherwise)
  if (process.platform === 'darwin' && app.dock) {
    const logoPath = isDev
      ? path.join(__dirname, '..', '..', 'logo_transparent.png')
      : path.join(process.resourcesPath, 'logo_transparent.png');
    app.dock.setIcon(logoPath);
  }

  const isSplash = !noLogo;
  mainWindow = new BrowserWindow({
    width:     isSplash ? SPLASH_WIDTH  : MAIN_WIDTH,
    height:    isSplash ? SPLASH_HEIGHT : MAIN_HEIGHT,
    minWidth:  isSplash ? SPLASH_WIDTH  : 900,
    minHeight: isSplash ? SPLASH_HEIGHT : 600,
    resizable: true,
    titleBarStyle: 'hiddenInset',
    icon: iconPath,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // devtools only opens after splash (or immediately if noLogo)
    if (devConsole && noLogo) {
      mainWindow.webContents.openDevTools({ mode: 'bottom' });
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'));
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('Failed to load:', code, desc);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  dbService.disconnectAll();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ── IPC Handlers ───────────────────────────────────────────────

// App flags
ipcMain.handle('app:get-flags', () => ({ noLogo }));

// Called by renderer when the splash screen "Tovább" button is clicked
ipcMain.handle('app:splash-done', () => {
  if (!mainWindow) return;
  mainWindow.setMinimumSize(900, 600);
  mainWindow.setSize(MAIN_WIDTH, MAIN_HEIGHT, true);
  mainWindow.center();
  if (devConsole) {
    mainWindow.webContents.openDevTools({ mode: 'bottom' });
  }
});

// Connection
ipcMain.handle('db:connect', async (_event, config) => {
  try {
    const connId = await dbService.connect(config);
    return { success: true, connId };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:disconnect', async (_event, connId) => {
  try {
    await dbService.disconnect(connId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:test-connection', async (_event, config) => {
  try {
    await dbService.testConnection(config);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Queries
ipcMain.handle('db:query', async (_event, connId, sql) => {
  try {
    const result = await dbService.query(connId, sql);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Object Explorer
ipcMain.handle('db:get-databases', async (_event, connId) => {
  try {
    const result = await dbService.getDatabases(connId);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:connect-to-database', async (_event, parentConnId, dbName) => {
  try {
    const connId = await dbService.connectToDatabase(parentConnId, dbName);
    return { success: true, connId };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-schemas', async (_event, connId) => {
  try {
    const result = await dbService.getSchemas(connId);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-tables', async (_event, connId, schema) => {
  try {
    const result = await dbService.getTables(connId, schema);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-views', async (_event, connId, schema) => {
  try {
    const result = await dbService.getViews(connId, schema);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-columns', async (_event, connId, schema, table) => {
  try {
    const result = await dbService.getColumns(connId, schema, table);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:insert-row', async (_event, connId, schema, table, values) => {
  try {
    const result = await dbService.insertRow(connId, schema, table, values);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-pk-columns', async (_event, connId, schema, table) => {
  try {
    const result = await dbService.getPrimaryKeyColumns(connId, schema, table);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:update-row', async (_event, connId, schema, table, values, pkValues) => {
  try {
    const result = await dbService.updateRow(connId, schema, table, values, pkValues);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-table-data', async (_event, connId, schema, table, limit, offset) => {
  try {
    const result = await dbService.getTableData(connId, schema, table, limit, offset);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-table-ddl', async (_event, connId, schema, table) => {
  try {
    const result = await dbService.getTableDDL(connId, schema, table);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Object Explorer – extended
ipcMain.handle('db:get-functions', async (_event, connId, schema) => {
  try {
    const result = await dbService.getFunctions(connId, schema);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-sequences', async (_event, connId, schema) => {
  try {
    const result = await dbService.getSequences(connId, schema);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-types', async (_event, connId, schema) => {
  try {
    const result = await dbService.getTypes(connId, schema);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-complete-create-script', async (_event, connId, schema, table) => {
  try {
    const data = await dbService.getCompleteCreateScript(connId, schema, table);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-indexes', async (_event, connId, schema, table) => {
  try {
    const result = await dbService.getIndexes(connId, schema, table);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-constraints', async (_event, connId, schema, table) => {
  try {
    const result = await dbService.getConstraints(connId, schema, table);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-triggers', async (_event, connId, schema, table) => {
  try {
    const result = await dbService.getTriggers(connId, schema, table);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-roles', async (_event, connId) => {
  try {
    const result = await dbService.getRoles(connId);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-materialized-views', async (_event, connId, schema) => {
  try {
    const result = await dbService.getMaterializedViews(connId, schema);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('db:get-extensions', async (_event, connId) => {
  try {
    const result = await dbService.getExtensions(connId);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Connection History
ipcMain.handle('connections:load-history', async () => {
  try {
    const data = dbService.loadConnectionHistory();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('connections:save-history', async (_event, config) => {
  try {
    const data = dbService.saveConnectionToHistory(config);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('connections:remove-history', async (_event, index) => {
  try {
    const data = dbService.removeConnectionFromHistory(index);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Keychain
ipcMain.handle('keychain:save', async (_event, key, password) => {
  try {
    await keychainService.save(key, password);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('keychain:get', async (_event, key) => {
  try {
    const password = await keychainService.get(key);
    return { success: true, data: password };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('keychain:delete', async (_event, key) => {
  try {
    await keychainService.remove(key);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Prefs (language, etc.)
ipcMain.handle('prefs:get', (_event, key) => {
  const prefs = loadPrefs();
  return prefs[key] ?? null;
});

ipcMain.handle('prefs:set', (_event, key, value) => {
  savePrefs(key, value);
});

// File save
ipcMain.handle('file:save-sql', async (_event, content, defaultName) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'SQL mentése',
      defaultPath: defaultName || 'query.sql',
      filters: [{ name: 'SQL Files', extensions: ['sql'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
