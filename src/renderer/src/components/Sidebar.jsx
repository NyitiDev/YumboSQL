import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import './Sidebar.css';

// ── Expand/collapse helper ─────────────────────────────────────
function TreeNode({ icon, label, children, defaultOpen, onClickLabel, onContextMenu, badge }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const hasChildren = children !== undefined;

  return (
    <div className="tree-node">
      <div
        className="tree-item"
        onClick={() => {
          if (hasChildren) setOpen((o) => !o);
          if (onClickLabel) onClickLabel();
        }}
        onContextMenu={onContextMenu}
      >
        {hasChildren && <span className="tree-arrow">{open ? '▾' : '▸'}</span>}
        {!hasChildren && <span className="tree-arrow-spacer" />}
        <span className="tree-icon">{icon}</span>
        <span className="tree-label">{label}</span>
        {badge && <span className="tree-badge">{badge}</span>}
      </div>
      {open && hasChildren && <div className="tree-children">{children}</div>}
    </div>
  );
}

// ── Lazy-loaded group ──────────────────────────────────────────
function LazyGroup({ icon, label, loader, renderItems, refreshKey, onContextMenu, refreshRef }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastRefresh = useRef(0);

  const doRefresh = useCallback(() => {
    setLoading(true);
    loader().then((result) => {
      setItems(result.success ? result.data : []);
      setLoading(false);
    });
  }, [loader]);

  useEffect(() => {
    if (refreshRef) refreshRef.current = doRefresh;
  }, [doRefresh, refreshRef]);

  useEffect(() => {
    if (refreshKey !== undefined && refreshKey !== lastRefresh.current && items !== null) {
      lastRefresh.current = refreshKey;
      doRefresh();
    }
  }, [refreshKey]);

  const toggle = async () => {
    if (!open && items === null) {
      setLoading(true);
      const result = await loader();
      setItems(result.success ? result.data : []);
      setLoading(false);
      if (refreshKey !== undefined) lastRefresh.current = refreshKey;
    }
    setOpen((o) => !o);
  };

  return (
    <div className="tree-node">
      <div className="tree-item" onClick={toggle} onContextMenu={onContextMenu}>
        <span className="tree-arrow">{open ? '▾' : '▸'}</span>
        <span className="tree-icon">{icon}</span>
        <span className="tree-label">{label}</span>
        {items && <span className="tree-badge">{items.length}</span>}
      </div>
      {open && (
        <div className="tree-children">
          {loading && <div className="tree-loading">{t('sidebar.loading')}</div>}
          {items && items.length === 0 && <div className="tree-empty">{t('sidebar.empty')}</div>}
          {items && items.length > 0 && renderItems(items)}
        </div>
      )}
    </div>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────
export default function Sidebar({ connections, onOpenTab, onDisconnect, onAddConnection, width }) {
  const { t } = useI18n();
  const [contextMenu, setContextMenu] = useState(null); // { x, y, connId, schema, table }
  const [sqlSubOpen, setSqlSubOpen] = useState(false);
  const [groupCtx, setGroupCtx] = useState(null); // { x, y, connId, schema, kind }
  const groupRefreshCbs = useRef({});

  const handleTableContext = (e, connId, schema, table) => {
    e.preventDefault();
    e.stopPropagation();
    setSqlSubOpen(false);
    setContextMenu({ x: e.clientX, y: e.clientY, connId, schema, table });
  };

  const generateSql = async (connId, schema, table, kind) => {
    const colRes = await window.yumbosql.getColumns(connId, schema, table);
    const cols = colRes.success ? colRes.data : [];
    const colNames = cols.map((c) => `"${c.name}"`);
    const fqn = `"${schema}"."${table}"`;
    let sql = '';
    switch (kind) {
      case 'select':
        sql = `SELECT\n  ${colNames.join(',\n  ')}\nFROM ${fqn}\nWHERE 1=1\nLIMIT 100;\n`;
        break;
      case 'insert': {
        const placeholders = cols.map((c) => `  /* ${c.type} */ NULL`);
        sql = `INSERT INTO ${fqn} (\n  ${colNames.join(',\n  ')}\n) VALUES (\n${placeholders.join(',\n')}\n);\n`;
        break;
      }
      case 'update': {
        const sets = cols.map((c) => `  "${c.name}" = /* ${c.type} */ "${c.name}"`);
        sql = `UPDATE ${fqn}\nSET\n${sets.join(',\n')}\nWHERE /* feltétel */;\n`;
        break;
      }
      case 'alter': {
        const lines = cols.map((c) =>
          `-- ALTER TABLE ${fqn} ALTER COLUMN "${c.name}" TYPE ${c.type};`
        );
        sql = `-- ALTER TABLE műveletek: ${fqn}\n\n` +
          `-- Oszlop hozzáadása:\n-- ALTER TABLE ${fqn} ADD COLUMN new_column TEXT;\n\n` +
          `-- Oszlop törlése:\n-- ALTER TABLE ${fqn} DROP COLUMN column_name;\n\n` +
          `-- Oszlop típus módosítás:\n${lines.join('\n')}\n`;
        break;
      }
      case 'create': {
        const colDefs = cols.map((c) => {
          let def = `  "${c.name}" ${c.type}`;
          if (c.nullable === 'NO') def += ' NOT NULL';
          if (c.default_value) def += ` DEFAULT ${c.default_value}`;
          return def;
        });
        sql = `CREATE TABLE ${fqn} (\n${colDefs.join(',\n')}\n);\n`;
        break;
      }
    }
    return sql;
  };

  const handleSqlAction = async (kind) => {
    if (!contextMenu) return;
    const { connId, schema, table } = contextMenu;
    const sql = await generateSql(connId, schema, table, kind);
    onOpenTab(connId, schema, table, 'script', sql, kind.toUpperCase());
    setContextMenu(null);
  };

  const handleGroupContext = (e, connId, schema, kind, refreshCb) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null);
    setSqlSubOpen(false);
    groupRefreshCbs.current._active = refreshCb;
    setGroupCtx({ x: e.clientX, y: e.clientY, connId, schema, kind });
  };

  const groupCreateTemplates = {
    table: (s) =>
      `CREATE TABLE "${s}"."new_table" (\n  "id" SERIAL PRIMARY KEY,\n  "name" VARCHAR(255) NOT NULL,\n  "created_at" TIMESTAMP DEFAULT NOW()\n);\n`,
    view: (s) =>
      `CREATE OR REPLACE VIEW "${s}"."new_view" AS\nSELECT\n  -- oszlopok\nFROM "${s}"."source_table"\nWHERE 1=1;\n`,
    matview: (s) =>
      `CREATE MATERIALIZED VIEW "${s}"."new_matview" AS\nSELECT\n  -- oszlopok\nFROM "${s}"."source_table"\nWHERE 1=1\nWITH DATA;\n`,
    function: (s) =>
      `CREATE OR REPLACE FUNCTION "${s}".new_function()\nRETURNS void\nLANGUAGE plpgsql\nAS $$\nBEGIN\n  -- törzs\nEND;\n$$;\n`,
    sequence: (s) =>
      `CREATE SEQUENCE "${s}"."new_sequence"\n  START WITH 1\n  INCREMENT BY 1\n  NO MINVALUE\n  NO MAXVALUE\n  CACHE 1;\n`,
    type: (s) =>
      `CREATE TYPE "${s}"."new_type" AS ENUM (\n  'value1',\n  'value2',\n  'value3'\n);\n`,
    index: (s) =>
      `CREATE INDEX "idx_new"\n  ON "${s}"."table_name" ("column_name");\n`,
    column: (s) =>
      `ALTER TABLE "${s}"."table_name" ADD COLUMN "new_column" TEXT NOT NULL DEFAULT '';\n`,
    constraint: (s) =>
      `ALTER TABLE "${s}"."table_name" ADD CONSTRAINT "new_constraint"\n  CHECK (true);\n`,
    trigger: (s) =>
      `CREATE TRIGGER "new_trigger"\n  BEFORE INSERT ON "${s}"."table_name"\n  FOR EACH ROW\n  EXECUTE FUNCTION "${s}".new_trigger_fn();\n`,
  };

  const handleGroupCreate = () => {
    if (!groupCtx) return;
    const { connId, schema, kind } = groupCtx;
    const templateFn = groupCreateTemplates[kind];
    const sql = templateFn ? templateFn(schema) : `-- CREATE ${kind}\n`;
    onOpenTab(connId, schema, `new_${kind}`, 'script', sql, `CREATE ${kind.toUpperCase()}`);
    setGroupCtx(null);
  };

  const handleGroupRefresh = () => {
    if (!groupCtx) return;
    const cb = groupRefreshCbs.current._active;
    if (cb) cb();
    setGroupCtx(null);
  };

  useEffect(() => {
    const close = () => { setContextMenu(null); setSqlSubOpen(false); setGroupCtx(null); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <aside className="sidebar" style={{ width: width || 280 }}>
      <div className="sidebar-header">
        <img src="/logo_transparent.png" alt="YumboSQL" className="sidebar-logo" />
        <button
          className="btn btn-ghost btn-sm"
          onClick={onAddConnection}
          title={t('sidebar.add_host_title')}
        >
          {t('sidebar.add_host_btn')}
        </button>
      </div>

      <div className="sidebar-tree">
        {connections.length === 0 && (
          <div className="sidebar-empty">{t('sidebar.no_connections')}</div>
        )}
        {connections.map(({ connId, config }) => (
          <HostNode
            key={connId}
            connId={connId}
            config={config}
            onOpenTab={onOpenTab}
            onDisconnect={onDisconnect}
            onTableContext={handleTableContext}
            onGroupContext={handleGroupContext}
          />
        ))}
      </div>

      {/* Context menu – table node */}
      {contextMenu && (
        <div
          className="ctx-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ctx-menu-item" onClick={() => { onOpenTab(contextMenu.connId, contextMenu.schema, contextMenu.table, 'table'); setContextMenu(null); }}>
            <span className="ctx-icon">⊞</span> {t('sidebar.ctx.data_list')}
          </div>
          <div className="ctx-menu-item" onClick={() => { onOpenTab(contextMenu.connId, contextMenu.schema, contextMenu.table, 'structure'); setContextMenu(null); }}>
            <span className="ctx-icon">✏</span> {t('sidebar.ctx.structure')}
          </div>
          <div className="ctx-menu-item" onClick={() => { onOpenTab(contextMenu.connId, contextMenu.schema, contextMenu.table, 'newrecord'); setContextMenu(null); }}>
            <span className="ctx-icon">＋</span> {t('sidebar.ctx.new_record')}
          </div>
          <div className="ctx-menu-sep" />
          <div
            className="ctx-menu-item ctx-has-sub"
            onMouseEnter={() => setSqlSubOpen(true)}
            onMouseLeave={() => setSqlSubOpen(false)}
          >
            <span className="ctx-icon">⌨</span> {t('sidebar.ctx.sql')}
            <span className="ctx-sub-arrow">▸</span>
            {sqlSubOpen && (
              <div className="ctx-submenu">
                <div className="ctx-menu-item" onClick={() => handleSqlAction('select')}>SELECT</div>
                <div className="ctx-menu-item" onClick={() => handleSqlAction('insert')}>INSERT</div>
                <div className="ctx-menu-item" onClick={() => handleSqlAction('update')}>UPDATE</div>
                <div className="ctx-menu-item" onClick={() => handleSqlAction('alter')}>ALTER</div>
                <div className="ctx-menu-item" onClick={() => handleSqlAction('create')}>CREATE</div>
              </div>
            )}
          </div>
          <div className="ctx-menu-sep" />
          <div className="ctx-menu-item" onClick={() => setContextMenu(null)}>
            <span className="ctx-icon">↻</span> {t('sidebar.ctx.refresh')}
          </div>
        </div>
      )}

      {/* Group context menu */}
      {groupCtx && (
        <div
          className="ctx-menu"
          style={{ top: groupCtx.y, left: groupCtx.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ctx-menu-item" onClick={handleGroupCreate}>
            <span className="ctx-icon">＋</span> {t('sidebar.ctx.create')}
          </div>
          <div className="ctx-menu-item" onClick={handleGroupRefresh}>
            <span className="ctx-icon">↻</span> {t('sidebar.ctx.refresh')}
          </div>
        </div>
      )}
    </aside>
  );
}

// ── Host node (one per connection) ─────────────────────────────
function HostNode({ connId, config, onOpenTab, onDisconnect, onTableContext, onGroupContext }) {
  const { t } = useI18n();
  const [hostCtxMenu, setHostCtxMenu] = useState(null);
  const rolesRefresh = useRef(null);
  const dbsRefresh = useRef(null);

  useEffect(() => {
    if (!hostCtxMenu) return;
    const close = () => setHostCtxMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [hostCtxMenu]);

  const label = `${config.user}@${config.host}:${config.port}`;

  return (
    <>
      <TreeNode
        icon="🖥"
        label={label}
        defaultOpen={true}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHostCtxMenu({ x: e.clientX, y: e.clientY, kind: 'host' });
        }}
      >
        {/* Roles – server level */}
        <LazyGroup
          icon="👤"
          label={t('sidebar.group_roles')}
          loader={() => window.yumbosql.getRoles(connId)}
          refreshRef={rolesRefresh}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setHostCtxMenu({ x: e.clientX, y: e.clientY, kind: 'roles' });
          }}
          renderItems={(items) =>
            items.map((r) => (
              <div key={r.name} className="tree-item tree-leaf">
                <span className="tree-arrow-spacer" />
                <span className="tree-icon">{r.can_login ? '👤' : '👥'}</span>
                <span className="tree-label">{r.name}</span>
                {r.is_superuser && <span className="tree-badge badge-accent">super</span>}
              </div>
            ))
          }
        />

        {/* Databases */}
        <LazyGroup
          icon="🛢"
          label={t('sidebar.group_databases')}
          loader={() => window.yumbosql.getDatabases(connId)}
          refreshRef={dbsRefresh}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setHostCtxMenu({ x: e.clientX, y: e.clientY, kind: 'databases' });
          }}
          renderItems={(dbs) =>
            dbs.map((db) => (
              <DatabaseNode
                key={db.name}
                parentConnId={connId}
                dbName={db.name}
                isCurrentDb={db.name === config.database}
                onOpenTab={onOpenTab}
                onTableContext={onTableContext}
                onGroupContext={onGroupContext}
              />
            ))
          }
        />
      </TreeNode>

      {/* Host / Roles / Databases context menu */}
      {hostCtxMenu && (
        <div
          className="ctx-menu"
          style={{ top: hostCtxMenu.y, left: hostCtxMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ctx-menu-item" onClick={() => {
            if (hostCtxMenu.kind === 'roles') rolesRefresh.current?.();
            else if (hostCtxMenu.kind === 'databases') dbsRefresh.current?.();
            setHostCtxMenu(null);
          }}>
            <span className="ctx-icon">↻</span> {t('sidebar.ctx.refresh')}
          </div>
          {hostCtxMenu.kind === 'host' && (
            <>
              <div className="ctx-menu-sep" />
              <div className="ctx-menu-item ctx-item-danger" onClick={() => { onDisconnect(connId); setHostCtxMenu(null); }}>
                <span className="ctx-icon">⏻</span> {t('sidebar.ctx.disconnect')}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ── Database node ──────────────────────────────────────────────
function DatabaseNode({ parentConnId, dbName, isCurrentDb, onOpenTab, onTableContext, onGroupContext }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(isCurrentDb);
  const [dbConnId, setDbConnId] = useState(isCurrentDb ? parentConnId : null);
  const [schemas, setSchemas] = useState(null);
  const [loading, setLoading] = useState(isCurrentDb); // load immediately if current db
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dbCtxMenu, setDbCtxMenu] = useState(null);

  useEffect(() => {
    if (!dbCtxMenu) return;
    const close = () => setDbCtxMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [dbCtxMenu]);

  // Load schemas for the current db on initial mount
  useEffect(() => {
    if (isCurrentDb && dbConnId) {
      window.yumbosql.getSchemas(dbConnId).then((result) => {
        setSchemas(result.success ? result.data : []);
        setLoading(false);
      });
    }
  }, []);

  const handleToggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen && schemas === null) {
      setLoading(true);
      setError(null);
      let cid = dbConnId;
      if (!cid) {
        const res = await window.yumbosql.connectToDatabase(parentConnId, dbName);
        if (!res.success) {
          setError(res.error);
          setLoading(false);
          setOpen(false);
          return;
        }
        cid = res.connId;
        setDbConnId(cid);
      }
      const result = await window.yumbosql.getSchemas(cid);
      setSchemas(result.success ? result.data : []);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!dbConnId) return;
    setLoading(true);
    const result = await window.yumbosql.getSchemas(dbConnId);
    setSchemas(result.success ? result.data : []);
    setLoading(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="tree-node">
      <div
        className="tree-item"
        onClick={handleToggle}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDbCtxMenu({ x: e.clientX, y: e.clientY }); }}
      >
        <span className="tree-arrow">{open ? '▾' : '▸'}</span>
        <span className="tree-icon">🗄</span>
        <span className="tree-label">{dbName}</span>
        {isCurrentDb && <span className="tree-badge badge-accent">{t('sidebar.badge_active')}</span>}
      </div>

      {open && (
        <div className="tree-children">
          {loading && <div className="tree-loading">{t('sidebar.loading')}</div>}
          {error && <div className="tree-error">⚠ {error}</div>}

          {!loading && !error && schemas !== null && dbConnId && (
            <>
              {/* Extensions – database level */}
              <LazyGroup
                icon="🧩"
                label="Extensions"
                loader={() => window.yumbosql.getExtensions(dbConnId)}
                renderItems={(items) =>
                  items.map((e) => (
                    <div key={e.name} className="tree-item tree-leaf">
                      <span className="tree-arrow-spacer" />
                      <span className="tree-icon">🧩</span>
                      <span className="tree-label">{e.name}</span>
                      <span className="tree-badge">{e.version}</span>
                    </div>
                  ))
                }
              />

              {/* Schemas */}
              {schemas.length === 0 && <div className="tree-empty">{t('sidebar.no_schemas')}</div>}
              {schemas.map((schema) => (
                <SchemaNode
                  key={schema.name}
                  connId={dbConnId}
                  schema={schema.name}
                  onOpenTab={onOpenTab}
                  onTableContext={onTableContext}
                  onGroupContext={onGroupContext}
                  defaultOpen={schema.name === 'public'}
                  refreshKey={refreshKey}
                  onRefresh={handleRefresh}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Database context menu */}
      {dbCtxMenu && (
        <div
          className="ctx-menu"
          style={{ top: dbCtxMenu.y, left: dbCtxMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ctx-menu-item" onClick={() => { handleRefresh(); setDbCtxMenu(null); }}>
            <span className="ctx-icon">↻</span> {t('sidebar.ctx.refresh')}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Schema node ────────────────────────────────────────────────
function SchemaNode({ connId, schema, onOpenTab, onTableContext, onGroupContext, defaultOpen, refreshKey, onRefresh }) {
  const { t } = useI18n();
  const tableRefresh = useRef(null);
  const viewRefresh = useRef(null);
  const matviewRefresh = useRef(null);
  const funcRefresh = useRef(null);
  const seqRefresh = useRef(null);
  const typeRefresh = useRef(null);

  const makeGroupCtx = (kind, refreshCbRef) => (e) => {
    onGroupContext(e, connId, schema, kind, () => refreshCbRef.current?.());
  };

  const [schemaCtxMenu, setSchemaCtxMenu] = useState(null);

  useEffect(() => {
    if (!schemaCtxMenu) return;
    const close = () => setSchemaCtxMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [schemaCtxMenu]);

  return (
    <>
    <TreeNode
      icon="🗂"
      label={schema}
      defaultOpen={defaultOpen}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSchemaCtxMenu({ x: e.clientX, y: e.clientY }); }}
    >
      <LazyGroup
        icon="⊞"
        label={t('sidebar.group_tables')}
        loader={() => window.yumbosql.getTables(connId, schema)}
        refreshKey={refreshKey}
        refreshRef={tableRefresh}
        onContextMenu={makeGroupCtx('table', tableRefresh)}
        renderItems={(tables) =>
          tables.map((t) => (
            <TableNode
              key={t.name}
              connId={connId}
              schema={schema}
              table={t.name}
              onTableContext={onTableContext}
              onGroupContext={onGroupContext}
              onOpenTab={onOpenTab}
              refreshKey={refreshKey}
            />
          ))
        }
      />

      <LazyGroup
        icon="◫"
        label={t('sidebar.group_views')}
        loader={() => window.yumbosql.getViews(connId, schema)}
        refreshRef={viewRefresh}
        onContextMenu={makeGroupCtx('view', viewRefresh)}
        renderItems={(views) =>
          views.map((v) => (
            <div
              key={v.name}
              className="tree-item tree-leaf tree-clickable"
              onClick={() => onOpenTab(connId, schema, v.name, 'table')}
            >
              <span className="tree-arrow-spacer" />
              <span className="tree-icon">◫</span>
              <span className="tree-label">{v.name}</span>
            </div>
          ))
        }
      />

      <LazyGroup
        icon="◨"
        label={t('sidebar.group_matviews')}
        loader={() => window.yumbosql.getMaterializedViews(connId, schema)}
        refreshRef={matviewRefresh}
        onContextMenu={makeGroupCtx('matview', matviewRefresh)}
        renderItems={(mvs) =>
          mvs.map((v) => (
            <div
              key={v.name}
              className="tree-item tree-leaf tree-clickable"
              onClick={() => onOpenTab(connId, schema, v.name, 'table')}
            >
              <span className="tree-arrow-spacer" />
              <span className="tree-icon">◨</span>
              <span className="tree-label">{v.name}</span>
            </div>
          ))
        }
      />

      <LazyGroup
        icon="ƒ"
        label={t('sidebar.group_functions')}
        loader={() => window.yumbosql.getFunctions(connId, schema)}
        refreshRef={funcRefresh}
        onContextMenu={makeGroupCtx('function', funcRefresh)}
        renderItems={(fns) =>
          fns.map((f, i) => (
            <div key={`${f.name}_${i}`} className="tree-item tree-leaf">
              <span className="tree-arrow-spacer" />
              <span className="tree-icon">{f.kind === 'procedure' ? '⚙' : 'ƒ'}</span>
              <span className="tree-label" title={`${f.name}(${f.args}) → ${f.return_type}`}>
                {f.name}({f.args})
              </span>
              {f.kind !== 'function' && <span className="tree-badge">{f.kind}</span>}
            </div>
          ))
        }
      />

      <LazyGroup
        icon="#"
        label={t('sidebar.group_sequences')}
        loader={() => window.yumbosql.getSequences(connId, schema)}
        refreshRef={seqRefresh}
        onContextMenu={makeGroupCtx('sequence', seqRefresh)}
        renderItems={(seqs) =>
          seqs.map((s) => (
            <div key={s.name} className="tree-item tree-leaf">
              <span className="tree-arrow-spacer" />
              <span className="tree-icon">#</span>
              <span className="tree-label">{s.name}</span>
            </div>
          ))
        }
      />

      <LazyGroup
        icon="◇"
        label={t('sidebar.group_types')}
        loader={() => window.yumbosql.getTypes(connId, schema)}
        refreshRef={typeRefresh}
        onContextMenu={makeGroupCtx('type', typeRefresh)}
        renderItems={(types) =>
          types.map((t) => (
            <div key={t.name} className="tree-item tree-leaf">
              <span className="tree-arrow-spacer" />
              <span className="tree-icon">◇</span>
              <span className="tree-label">{t.name}</span>
              <span className="tree-badge">{t.kind}</span>
            </div>
          ))
        }
      />
    </TreeNode>

    {/* Schema context menu */}
    {schemaCtxMenu && (
      <div
        className="ctx-menu"
        style={{ top: schemaCtxMenu.y, left: schemaCtxMenu.x }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ctx-menu-item" onClick={() => { if (onRefresh) onRefresh(); setSchemaCtxMenu(null); }}>
          <span className="ctx-icon">↻</span> {t('sidebar.ctx.refresh')}
        </div>
      </div>
    )}
    </>
  );
}

// ── Table node ─────────────────────────────────────────────────
function TableNode({ connId, schema, table, onTableContext, onGroupContext, onOpenTab, refreshKey }) {
  const colRefresh = useRef(null);
  const idxRefresh = useRef(null);
  const conRefresh = useRef(null);
  const trgRefresh = useRef(null);

  const makeGroupCtx = (kind, refreshCbRef) => (e) => {
    onGroupContext(e, connId, schema, kind, () => refreshCbRef.current?.());
  };

  const openAlterScript = (objectKind, objectName, extra) => {
    const fqn = `"${schema}"."${table}"`;
    let sql = '';
    switch (objectKind) {
      case 'column':
        sql = `-- Oszlop módosítása: ${objectName}\n` +
          `ALTER TABLE ${fqn} ALTER COLUMN "${objectName}" TYPE ${extra?.type || 'TEXT'};\n\n` +
          `-- Oszlop átnevezése:\n-- ALTER TABLE ${fqn} RENAME COLUMN "${objectName}" TO "new_name";\n\n` +
          `-- NOT NULL:\n-- ALTER TABLE ${fqn} ALTER COLUMN "${objectName}" SET NOT NULL;\n-- ALTER TABLE ${fqn} ALTER COLUMN "${objectName}" DROP NOT NULL;\n\n` +
          `-- Default:\n-- ALTER TABLE ${fqn} ALTER COLUMN "${objectName}" SET DEFAULT 'value';\n-- ALTER TABLE ${fqn} ALTER COLUMN "${objectName}" DROP DEFAULT;\n\n` +
          `-- Törlés:\n-- ALTER TABLE ${fqn} DROP COLUMN "${objectName}";\n`;
        break;
      case 'index':
        sql = `-- Index módosítása: ${objectName}\n` +
          `REINDEX INDEX "${schema}"."${objectName}";\n\n` +
          `-- Törlés:\n-- DROP INDEX "${schema}"."${objectName}";\n\n` +
          `-- Létrehozás:\n-- CREATE INDEX "${objectName}" ON ${fqn} ("column_name");\n`;
        break;
      case 'constraint':
        sql = `-- Constraint módosítása: ${objectName}\n` +
          `ALTER TABLE ${fqn} DROP CONSTRAINT "${objectName}";\n\n` +
          `-- Hozzáadás:\n-- ALTER TABLE ${fqn} ADD CONSTRAINT "${objectName}" ${extra?.definition || 'CHECK (true)'};\n`;
        break;
      case 'trigger':
        sql = `-- Trigger módosítása: ${objectName}\n` +
          `ALTER TABLE ${fqn} DISABLE TRIGGER "${objectName}";\n\n` +
          `-- Engedélyezés:\n-- ALTER TABLE ${fqn} ENABLE TRIGGER "${objectName}";\n\n` +
          `-- Törlés:\n-- DROP TRIGGER "${objectName}" ON ${fqn};\n`;
        break;
    }
    onOpenTab(connId, schema, table, 'script', sql, `ALTER ${objectKind.toUpperCase()}`);
  };

  return (
    <TreeNode
      icon="⊞"
      label={table}
      onContextMenu={(e) => onTableContext(e, connId, schema, table)}
    >
      <LazyGroup
        icon="│"
        label="Oszlopok"
        loader={() => window.yumbosql.getColumns(connId, schema, table)}
        refreshKey={refreshKey}
        refreshRef={colRefresh}
        onContextMenu={makeGroupCtx('column', colRefresh)}
        renderItems={(cols) =>
          cols.map((c) => (
            <div
              key={c.name}
              className="tree-item tree-leaf tree-clickable"
              onDoubleClick={() => openAlterScript('column', c.name, { type: c.type })}
            >
              <span className="tree-arrow-spacer" />
              <span className="tree-icon">•</span>
              <span className="tree-label">
                {c.name} <span className="tree-type">{c.type}</span>
              </span>
              {c.nullable === 'NO' && <span className="tree-badge badge-warn">NOT NULL</span>}
            </div>
          ))
        }
      />

      <LazyGroup
        icon="⚡"
        label="Indexek"
        loader={() => window.yumbosql.getIndexes(connId, schema, table)}
        refreshKey={refreshKey}
        refreshRef={idxRefresh}
        onContextMenu={makeGroupCtx('index', idxRefresh)}
        renderItems={(idxs) =>
          idxs.map((idx) => (
            <div
              key={idx.name}
              className="tree-item tree-leaf tree-clickable"
              onDoubleClick={() => openAlterScript('index', idx.name)}
            >
              <span className="tree-arrow-spacer" />
              <span className="tree-icon">⚡</span>
              <span className="tree-label" title={idx.definition}>{idx.name}</span>
              {idx.is_primary && <span className="tree-badge badge-accent">PK</span>}
              {!idx.is_primary && idx.is_unique && <span className="tree-badge badge-warn">UQ</span>}
            </div>
          ))
        }
      />

      <LazyGroup
        icon="🔗"
        label="Constraintek"
        loader={() => window.yumbosql.getConstraints(connId, schema, table)}
        refreshKey={refreshKey}
        refreshRef={conRefresh}
        onContextMenu={makeGroupCtx('constraint', conRefresh)}
        renderItems={(cons) =>
          cons.map((c) => (
            <div
              key={c.name}
              className="tree-item tree-leaf tree-clickable"
              onDoubleClick={() => openAlterScript('constraint', c.name, { definition: c.definition })}
            >
              <span className="tree-arrow-spacer" />
              <span className="tree-icon">🔗</span>
              <span className="tree-label" title={c.definition}>{c.name}</span>
              <span className="tree-badge">{c.type}</span>
            </div>
          ))
        }
      />

      <LazyGroup
        icon="⟐"
        label="Triggerek"
        loader={() => window.yumbosql.getTriggers(connId, schema, table)}
        refreshKey={refreshKey}
        refreshRef={trgRefresh}
        onContextMenu={makeGroupCtx('trigger', trgRefresh)}
        renderItems={(trgs) =>
          trgs.map((t) => (
            <div
              key={t.name}
              className="tree-item tree-leaf tree-clickable"
              onDoubleClick={() => openAlterScript('trigger', t.name)}
            >
              <span className="tree-arrow-spacer" />
              <span className="tree-icon">⟐</span>
              <span className="tree-label">{t.name}</span>
              <span className="tree-badge">{t.timing}</span>
            </div>
          ))
        }
      />
    </TreeNode>
  );
}
