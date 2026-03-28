const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yumbosql', {
  // Connection
  connect: (config) => ipcRenderer.invoke('db:connect', config),
  disconnect: (connId) => ipcRenderer.invoke('db:disconnect', connId),
  testConnection: (config) => ipcRenderer.invoke('db:test-connection', config),
  connectToDatabase: (parentConnId, dbName) => ipcRenderer.invoke('db:connect-to-database', parentConnId, dbName),

  // App
  getFlags: () => ipcRenderer.invoke('app:get-flags'),
  splashDone: () => ipcRenderer.invoke('app:splash-done'),

  // Queries
  query: (connId, sql) => ipcRenderer.invoke('db:query', connId, sql),

  // Object Explorer – basic
  getDatabases: (connId) => ipcRenderer.invoke('db:get-databases', connId),
  getSchemas: (connId) => ipcRenderer.invoke('db:get-schemas', connId),
  getTables: (connId, schema) => ipcRenderer.invoke('db:get-tables', connId, schema),
  getViews: (connId, schema) => ipcRenderer.invoke('db:get-views', connId, schema),
  getColumns: (connId, schema, table) => ipcRenderer.invoke('db:get-columns', connId, schema, table),
  insertRow: (connId, schema, table, values) => ipcRenderer.invoke('db:insert-row', connId, schema, table, values),
  getPrimaryKeyColumns: (connId, schema, table) => ipcRenderer.invoke('db:get-pk-columns', connId, schema, table),
  updateRow: (connId, schema, table, values, pkValues) => ipcRenderer.invoke('db:update-row', connId, schema, table, values, pkValues),
  getTableData: (connId, schema, table, limit, offset) =>
    ipcRenderer.invoke('db:get-table-data', connId, schema, table, limit, offset),
  getTableDDL: (connId, schema, table) =>
    ipcRenderer.invoke('db:get-table-ddl', connId, schema, table),

  // Object Explorer – extended
  getFunctions: (connId, schema) => ipcRenderer.invoke('db:get-functions', connId, schema),
  getSequences: (connId, schema) => ipcRenderer.invoke('db:get-sequences', connId, schema),
  getTypes: (connId, schema) => ipcRenderer.invoke('db:get-types', connId, schema),
  getIndexes: (connId, schema, table) => ipcRenderer.invoke('db:get-indexes', connId, schema, table),
  getConstraints: (connId, schema, table) => ipcRenderer.invoke('db:get-constraints', connId, schema, table),
  getTriggers: (connId, schema, table) => ipcRenderer.invoke('db:get-triggers', connId, schema, table),
  getRoles: (connId) => ipcRenderer.invoke('db:get-roles', connId),
  getMaterializedViews: (connId, schema) => ipcRenderer.invoke('db:get-materialized-views', connId, schema),
  getExtensions: (connId) => ipcRenderer.invoke('db:get-extensions', connId),

  // Connection History
  loadConnectionHistory: () => ipcRenderer.invoke('connections:load-history'),
  saveConnectionHistory: (config) => ipcRenderer.invoke('connections:save-history', config),
  removeConnectionHistory: (index) => ipcRenderer.invoke('connections:remove-history', index),

  // Keychain
  keychainSave: (key, password) => ipcRenderer.invoke('keychain:save', key, password),
  keychainGet: (key) => ipcRenderer.invoke('keychain:get', key),
  keychainDelete: (key) => ipcRenderer.invoke('keychain:delete', key),

  // File
  saveSqlFile: (content, defaultName) => ipcRenderer.invoke('file:save-sql', content, defaultName),
});
