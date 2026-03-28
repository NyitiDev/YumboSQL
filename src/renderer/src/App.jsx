import React, { useState, useCallback, useRef, useEffect } from 'react';
import Titlebar from './components/Titlebar';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';
import ConnectionDialog from './components/ConnectionDialog';
import SplashScreen from './components/SplashScreen';
import { useI18n } from './i18n/I18nContext';
import './styles/App.css';

export default function App() {
  const { t } = useI18n();
  const [connections, setConnections] = useState([]);  // [{ connId, config }]
  const [showConnDialog, setShowConnDialog] = useState(false);
  // null = loading flags, true = show splash, false = skip splash
  const [showSplash, setShowSplash] = useState(null);
  const [tabs, setTabs] = useState([]);            // [{ id, connId, type, schema?, table?, label }]
  const [activeTabId, setActiveTabId] = useState('editor');
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const resizing = useRef(false);

  // Fetch app flags on mount to decide whether to show the splash screen
  useEffect(() => {
    window.yumbosql.getFlags().then(({ noLogo }) => {
      if (noLogo) {
        setShowSplash(false);
        setShowConnDialog(true);
      } else {
        setShowSplash(true);
      }
    });
  }, []);

  const handleSplashContinue = useCallback(() => {
    setShowSplash(false);
    setShowConnDialog(true);
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    resizing.current = true;
    const onMouseMove = (e) => {
      if (!resizing.current) return;
      const newWidth = Math.min(Math.max(e.clientX, 180), 600);
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      resizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleConnect = useCallback((connId, config) => {
    setConnections((prev) => {
      // Avoid duplicate connIds
      if (prev.some((c) => c.connId === connId)) return prev;
      return [...prev, { connId, config }];
    });
    setShowConnDialog(false);
  }, []);

  const handleDisconnect = useCallback(async (connId) => {
    await window.yumbosql.disconnect(connId);
    setConnections((prev) => prev.filter((c) => c.connId !== connId));
    setTabs((prev) => prev.filter((t) => t.connId !== connId));
    setActiveTabId('editor');
  }, []);

  const handleOpenTab = useCallback((connId, schema, table, type, initialSqlOrRow, sqlKind) => {
    const prefix = type === 'structure' ? 'ddl' : type === 'script' ? 'sql' : type === 'newrecord' ? 'new' : type === 'editrecord' ? 'edit' : 'table';
    const id = `${prefix}:${connId}:${schema}.${table}:${Date.now()}`;
    const kindLabel = sqlKind ? ` ${sqlKind}` : '';
    const labelMap = {
      structure: `✏ ${schema}.${table} DDL`,
      script: `📝 ${schema}.${table}${kindLabel}`,
      table: `${schema}.${table} ${t('panel.tab_data_suffix')}`,
      newrecord: `＋ ${schema}.${table}`,
      editrecord: `✏ ${schema}.${table} ${t('panel.tab_edit_suffix')}`,
    };
    const label = labelMap[type] || `${schema}.${table}`;
    const isAlwaysUnique = type === 'script' || type === 'editrecord';
    setTabs((prev) => {
      if (!isAlwaysUnique) {
        const stableId = `${prefix}:${connId}:${schema}.${table}`;
        if (prev.some((t) => t.id === stableId)) {
          setActiveTabId(stableId);
          return prev;
        }
        return [...prev, { id: stableId, connId, type, schema, table, label }];
      }
      if (type === 'editrecord') {
        return [...prev, { id, connId, type, schema, table, label, rowData: initialSqlOrRow }];
      }
      return [...prev, { id, connId, type, schema, table, label, initialSql: initialSqlOrRow }];
    });
    if (!isAlwaysUnique) {
      setActiveTabId(`${prefix}:${connId}:${schema}.${table}`);
    } else {
      setActiveTabId(id);
    }
  }, [t]);

  const handleCloseTab = useCallback((tabId) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      // If we're closing the active tab, switch to a neighbor or editor
      setActiveTabId((currentActive) => {
        if (currentActive !== tabId) return currentActive;
        if (next.length === 0) return 'editor';
        const newIdx = Math.min(idx, next.length - 1);
        return next[newIdx].id;
      });
      return next;
    });
  }, []);

  // Show nothing while loading flags
  if (showSplash === null) return null;

  // Show splash screen in its own small window
  if (showSplash) {
    return <SplashScreen onContinue={handleSplashContinue} />;
  }

  return (
    <div className="app-layout">
      <Titlebar
        hasConnections={connections.length > 0}
        onNewConnection={() => setShowConnDialog(true)}
      />
      <div className="app-body">
        {connections.length > 0 && (
          <>
            <Sidebar
              connections={connections}
              onOpenTab={handleOpenTab}
              onDisconnect={handleDisconnect}
              onAddConnection={() => setShowConnDialog(true)}
              width={sidebarWidth}
            />
            <div
              className="sidebar-resizer"
              onMouseDown={handleMouseDown}
            />
            <MainPanel
              defaultConnId={connections[0]?.connId}
              connections={connections}
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={setActiveTabId}
              onCloseTab={handleCloseTab}
              onOpenTab={handleOpenTab}
            />
          </>
        )}
        {connections.length === 0 && !showConnDialog && (
          <div className="empty-state">
            <p>{t('sidebar.no_connections')}</p>
            <button className="btn btn-primary" onClick={() => setShowConnDialog(true)}>
              {t('app.connect_btn')}
            </button>
          </div>
        )}
      </div>
      {showConnDialog && (
        <ConnectionDialog
          onConnect={handleConnect}
          onClose={connections.length > 0 ? () => setShowConnDialog(false) : undefined}
        />
      )}
    </div>
  );
}
