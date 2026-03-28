import React, { useState, useRef, useCallback, useEffect } from 'react';
import SqlEditor from './SqlEditor';
import DataGrid from './DataGrid';
import { useI18n } from '../i18n/I18nContext';
import './MainPanel.css';

function useSplitPane(defaultFraction = 0.4) {
  const [fraction, setFraction] = useState(defaultFraction);
  const layoutRef = useRef(null);
  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    const layout = layoutRef.current;
    if (!layout) return;
    const onMouseMove = (mv) => {
      const rect = layout.getBoundingClientRect();
      const ratio = (mv.clientY - rect.top) / rect.height;
      setFraction(Math.min(0.85, Math.max(0.1, ratio)));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);
  return { fraction, layoutRef, handleDividerMouseDown };
}

export default function MainPanel({ defaultConnId, connections, tabs, activeTabId, onSelectTab, onCloseTab, onOpenTab }) {
  const { t } = useI18n();
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [queryTime, setQueryTime] = useState(null);
  // connId used by the SQL editor tab (can be selected when multiple connections exist)
  const [editorConnId, setEditorConnId] = useState(defaultConnId);
  const editorRefs = useRef({});
  const { fraction: editorFraction, layoutRef, handleDividerMouseDown } = useSplitPane(0.4);
  const tabsScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons);
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScrollButtons); ro.disconnect(); };
  }, [updateScrollButtons]);

  // Auto-scroll active tab into view
  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector('.panel-tab.active');
    if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    updateScrollButtons();
  }, [activeTabId, tabs, updateScrollButtons]);

  const scrollTabs = useCallback((dir) => {
    const el = tabsScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 160, behavior: 'smooth' });
  }, []);

  // Keep editorConnId in sync: if the current one disconnects, fall back to first available
  React.useEffect(() => {
    if (!connections || connections.length === 0) return;
    if (!connections.some((c) => c.connId === editorConnId)) {
      setEditorConnId(connections[0].connId);
    }
  }, [connections, editorConnId]);

  const getEditorRef = (key) => {
    if (!editorRefs.current[key]) {
      editorRefs.current[key] = { current: null };
    }
    return editorRefs.current[key];
  };

  const handleSave = useCallback((tabKey, defaultName) => {
    const ref = editorRefs.current[tabKey];
    const content = ref?.current?.getContent?.() || '';
    if (!content.trim()) return;
    window.yumbosql.saveSqlFile(content, defaultName);
  }, []);

  const handleRunQuery = async (sql) => {
    setQueryError(null);
    setQueryResult(null);
    const start = performance.now();
    const result = await window.yumbosql.query(editorConnId, sql);
    const elapsed = Math.round(performance.now() - start);
    setQueryTime(elapsed);
    if (result.success) {
      setQueryResult(result.data);
    } else {
      setQueryError(result.error);
    }
  };

  const activeTableTab = tabs.find((t) => t.id === activeTabId && t.type === 'table');
  const isEditorActive = activeTabId === 'editor';

  return (
    <div className="main-panel">
      {/* Tabs */}
      <div className="panel-tabs-bar">
        {canScrollLeft && (
          <button className="tabs-scroll-btn" onClick={() => scrollTabs(-1)} aria-label="Scroll tabs left">
            ‹
          </button>
        )}
        <div className="panel-tabs" ref={tabsScrollRef}>
          <button
            className={`panel-tab ${isEditorActive ? 'active' : ''}`}
            onClick={() => onSelectTab('editor')}
          >
            {t('panel.tab_sql_editor')}
          </button>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`panel-tab ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
            >
              <span className="tab-label">{tab.label}</span>
              <span
                className="tab-close"
                onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                title={t('panel.tab_close_title')}
              >✕</span>
            </button>
          ))}
        </div>
        {canScrollRight && (
          <button className="tabs-scroll-btn" onClick={() => scrollTabs(1)} aria-label="Scroll tabs right">
            ›
          </button>
        )}
      </div>

      {/* Content */}
      <div className="panel-content">
        {/* SQL Editor – always rendered, hidden when inactive */}
        <div className="editor-layout" ref={layoutRef} style={{ display: isEditorActive ? 'flex' : 'none' }}>
          <div className="editor-top" style={{ flex: `0 0 ${(editorFraction * 100).toFixed(2)}%`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <SqlEditor
              ref={getEditorRef('editor')}
              onRun={handleRunQuery}
              onSave={() => handleSave('editor', 'query.sql')}
            />
          </div>
          <div className="panel-divider" onMouseDown={handleDividerMouseDown} />
          <div className="results-area">
            {/* Connection selector for the SQL editor (shown only when multiple connections) */}
            {connections && connections.length > 1 && (
              <div className="editor-conn-selector">
                <span className="editor-conn-label">🔌</span>
                <select
                  className="editor-conn-select"
                  value={editorConnId}
                  onChange={(e) => setEditorConnId(e.target.value)}
                >
                  {connections.map(({ connId, config }) => (
                    <option key={connId} value={connId}>
                      {config.user}@{config.host}:{config.port}/{config.database}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {queryError && (
              <div className="query-error">
                <span className="error-icon">✕</span>
                {queryError}
              </div>
            )}
            {queryResult && (
              <>
                <div className="results-status">
                  <span className="badge badge-success">
                    {queryResult.command} — {queryResult.rowCount ?? queryResult.rows.length} {t('panel.results_row_suffix')}
                  </span>
                  <span className="results-time">{queryTime} ms</span>
                </div>
                {queryResult.rows.length > 0 && (
                  <DataGrid
                    fields={queryResult.fields}
                    rows={queryResult.rows}
                  />
                )}
              </>
            )}
            {!queryResult && !queryError && (
              <div className="results-placeholder">
                {t('panel.query_placeholder')}
              </div>
            )}
          </div>
        </div>

        {/* Table data tabs – only active one rendered (no editor state to preserve) */}
        {activeTableTab && (
          <TableView
            connId={activeTableTab.connId || defaultConnId}
            schema={activeTableTab.schema}
            table={activeTableTab.table}
            onEditRow={onOpenTab ? (row) => onOpenTab(activeTableTab.connId || defaultConnId, activeTableTab.schema, activeTableTab.table, 'editrecord', row) : undefined}
          />
        )}

        {/* Structure tabs – keep alive */}
        {tabs.filter((t) => t.type === 'structure').map((tab) => (
          <div key={tab.id} style={{ display: activeTabId === tab.id ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            <StructureView connId={tab.connId || defaultConnId} schema={tab.schema} table={tab.table} editorRef={getEditorRef(tab.id)} onSave={() => handleSave(tab.id, `${tab.table}_ddl.sql`)} />
          </div>
        ))}

        {/* Script tabs – keep alive */}
        {tabs.filter((t) => t.type === 'script').map((tab) => (
          <div key={tab.id} style={{ display: activeTabId === tab.id ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            <ScriptView
              connId={tab.connId || defaultConnId}
              tab={tab}
              editorRef={getEditorRef(tab.id)}
              onSave={() => handleSave(tab.id, `${tab.table || 'script'}.sql`)}
            />
          </div>
        ))}

        {/* New record tabs – keep alive */}
        {tabs.filter((t) => t.type === 'newrecord').map((tab) => (
          <div key={tab.id} style={{ display: activeTabId === tab.id ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            <NewRecordView connId={tab.connId || defaultConnId} schema={tab.schema} table={tab.table} />
          </div>
        ))}

        {/* Edit record tabs – keep alive */}
        {tabs.filter((t) => t.type === 'editrecord').map((tab) => (
          <div key={tab.id} style={{ display: activeTabId === tab.id ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            <EditRecordView connId={tab.connId || defaultConnId} schema={tab.schema} table={tab.table} rowData={tab.rowData} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Inline table viewer for Object Explorer selection */
function TableView({ connId, schema, table, onEditRow }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 100;

  React.useEffect(() => {
    load(0);
  }, [connId, schema, table]);

  const load = async (newOffset) => {
    setLoading(true);
    const result = await window.yumbosql.getTableData(connId, schema, table, LIMIT, newOffset);
    if (result.success) {
      setData(result.data);
      setOffset(newOffset);
    }
    setLoading(false);
  };

  if (loading && !data) {
    return <div className="results-placeholder">{t('panel.loading')}</div>;
  }

  if (!data) return null;

  return (
    <div className="table-view">
      <div className="results-status">
        <span className="badge badge-info">
          {schema}.{table} — {data.total} {t('panel.pager_total_suffix')}
        </span>
        <div className="pager">
          <button
            className="btn btn-ghost btn-sm"
            disabled={offset === 0}
            onClick={() => load(Math.max(0, offset - LIMIT))}
          >
            {t('panel.pager_prev')}
          </button>
          <span className="pager-info">
            {offset + 1}–{Math.min(offset + LIMIT, data.total)} / {data.total}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={offset + LIMIT >= data.total}
            onClick={() => load(offset + LIMIT)}
          >
            {t('panel.pager_next')}
          </button>
        </div>
      </div>
      <DataGrid fields={data.fields} rows={data.rows} onRowDoubleClick={onEditRow} />
    </div>
  );
}

/* Structure editor – loads ALTER TABLE DDL into a SqlEditor */
function StructureView({ connId, schema, table, editorRef, onSave }) {
  const { t } = useI18n();
  const [ddl, setDdl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [queryTime, setQueryTime] = useState(null);
  const { fraction, layoutRef: splitRef, handleDividerMouseDown } = useSplitPane(0.4);

  React.useEffect(() => {
    setLoading(true);
    window.yumbosql.getTableDDL(connId, schema, table).then((res) => {
      if (res.success) setDdl(res.data);
      setLoading(false);
    });
  }, [connId, schema, table]);

  const handleRunQuery = async (sql) => {
    setQueryError(null);
    setQueryResult(null);
    const start = performance.now();
    const result = await window.yumbosql.query(connId, sql);
    const elapsed = Math.round(performance.now() - start);
    setQueryTime(elapsed);
    if (result.success) {
      setQueryResult(result.data);
    } else {
      setQueryError(result.error);
    }
  };

  if (loading) {
    return <div className="results-placeholder">{t('panel.structure_loading')}</div>;
  }

  return (
    <div className="editor-layout" ref={splitRef}>
      <div className="editor-top" style={{ flex: `0 0 ${(fraction * 100).toFixed(2)}%`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <SqlEditor ref={editorRef} onRun={handleRunQuery} onSave={onSave} initialValue={ddl || ''} />
      </div>
      <div className="panel-divider" onMouseDown={handleDividerMouseDown} />
      <div className="results-area">
        {queryError && (
          <div className="query-error">
            <span className="error-icon">✕</span>
            {queryError}
          </div>
        )}
        {queryResult && (
          <div className="results-status">
            <span className="badge badge-success">
              {queryResult.command || 'OK'} — {t('panel.results_ok_suffix')}
            </span>
            <span className="results-time">{queryTime} ms</span>
          </div>
        )}
        {!queryResult && !queryError && (
          <div className="results-placeholder">
            {t('panel.structure_placeholder')}
          </div>
        )}
      </div>
    </div>
  );
}

/* Script tab – generated SQL template */
function ScriptView({ connId, tab, editorRef, onSave }) {
  const { t } = useI18n();
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [queryTime, setQueryTime] = useState(null);
  const { fraction, layoutRef: splitRef, handleDividerMouseDown } = useSplitPane(0.4);

  const handleRunQuery = async (sql) => {
    setQueryError(null);
    setQueryResult(null);
    const start = performance.now();
    const result = await window.yumbosql.query(connId, sql);
    const elapsed = Math.round(performance.now() - start);
    setQueryTime(elapsed);
    if (result.success) {
      setQueryResult(result.data);
    } else {
      setQueryError(result.error);
    }
  };

  return (
    <div className="editor-layout" ref={splitRef}>
      <div className="editor-top" style={{ flex: `0 0 ${(fraction * 100).toFixed(2)}%`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <SqlEditor ref={editorRef} onRun={handleRunQuery} onSave={onSave} initialValue={tab.initialSql || ''} />
      </div>
      <div className="panel-divider" onMouseDown={handleDividerMouseDown} />
      <div className="results-area">
        {queryError && (
          <div className="query-error">
            <span className="error-icon">✕</span>
            {queryError}
          </div>
        )}
        {queryResult && (
          <>
            <div className="results-status">
              <span className="badge badge-success">
                {queryResult.command || 'OK'} — {queryResult.rowCount ?? queryResult.rows?.length ?? 0} sor
              </span>
              <span className="results-time">{queryTime} ms</span>
            </div>
            {queryResult.rows?.length > 0 && (
              <DataGrid fields={queryResult.fields} rows={queryResult.rows} />
            )}
          </>
        )}
        {!queryResult && !queryError && (
          <div className="results-placeholder">
            {t('panel.script_placeholder')}
          </div>
        )}
      </div>
    </div>
  );
}

/* New record form – loads columns and renders typed inputs */
function NewRecordView({ connId, schema, table }) {
  const { t } = useI18n();
  const [columns, setColumns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    setLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    window.yumbosql.getColumns(connId, schema, table).then((res) => {
      if (res.success) {
        setColumns(res.data);
        const init = {};
        res.data.forEach((c) => {
          if (!isAutoFill(c)) init[c.name] = '';
        });
        setValues(init);
      }
      setLoading(false);
    });
  }, [connId, schema, table]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const res = await window.yumbosql.insertRow(connId, schema, table, values);
    setSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      // Reset form
      const init = {};
      columns.forEach((c) => { if (!isAutoFill(c)) init[c.name] = ''; });
      setValues(init);
    } else {
      setSaveError(res.error);
    }
  };

  if (loading) return <div className="results-placeholder">{t('panel.fields_loading')}</div>;
  if (!columns) return <div className="results-placeholder">{t('panel.fields_error')}</div>;

  return (
    <div className="new-record-view">
      <div className="new-record-header">
        <span className="new-record-title">{t('panel.new_record_prefix')} — <span className="new-record-table">{schema}.{table}</span></span>
      </div>
      <div className="new-record-form">
        {columns.map((col) => (
          <div key={col.name} className="new-record-row">
            <div className="new-record-label">
              <span className="new-record-col-name">{col.name}</span>
              <span className="new-record-col-type">{col.type}</span>
              {col.nullable === 'NO' && !isAutoFill(col) && <span className="new-record-required" title={t('panel.required_title')}>*</span>}
              {isAutoFill(col) && <span className="new-record-auto" title={t('panel.auto_title')}>auto</span>}
            </div>
            <ColumnInput
              col={col}
              value={values[col.name] ?? ''}
              onChange={(v) => handleChange(col.name, v)}
              disabled={isAutoFill(col)}
            />
          </div>
        ))}
      </div>
      <div className="new-record-actions">
        {saveError && <span className="new-record-error">{saveError}</span>}
        {saveSuccess && <span className="new-record-ok">{t('panel.record_saved')}</span>}
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? t('panel.saving_btn') : t('panel.save_btn')}
        </button>
      </div>
    </div>
  );
}

function isAutoFill(col) {
  if (col.is_identity === 'YES') return true;
  if (col.is_generated === 'ALWAYS') return true;
  if (col.default_value && col.default_value.startsWith('nextval(')) return true;
  return false;
}

function formatValueForInput(col, value) {
  if (value === null || value === undefined) return '';
  const type = col.type.toLowerCase();
  if (value instanceof Date) {
    if (type === 'date') return value.toISOString().slice(0, 10);
    if (type.startsWith('timestamp') || type.startsWith('time')) return value.toISOString().slice(0, 19);
    return value.toISOString();
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/* Edit record form – pre-filled from a row, uses UPDATE on save */
function EditRecordView({ connId, schema, table, rowData }) {
  const { t } = useI18n();
  const [columns, setColumns] = useState(null);
  const [pkCols, setPkCols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    setLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    Promise.all([
      window.yumbosql.getColumns(connId, schema, table),
      window.yumbosql.getPrimaryKeyColumns(connId, schema, table),
    ]).then(([colsRes, pkRes]) => {
      if (colsRes.success) {
        setColumns(colsRes.data);
        const init = {};
        colsRes.data.forEach((c) => {
          if (!isAutoFill(c)) init[c.name] = formatValueForInput(c, rowData?.[c.name]);
        });
        setValues(init);
      }
      if (pkRes.success) setPkCols(pkRes.data);
      setLoading(false);
    });
  }, [connId, schema, table, rowData]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSubmit = async () => {
    if (pkCols.length === 0) {
      setSaveError(t('panel.no_pk_save_error'));
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const pkValues = {};
    pkCols.forEach((k) => { pkValues[k] = rowData?.[k]; });
    const res = await window.yumbosql.updateRow(connId, schema, table, values, pkValues);
    setSaving(false);
    if (res.success) {
      setSaveSuccess(true);
    } else {
      setSaveError(res.error);
    }
  };

  if (loading) return <div className="results-placeholder">{t('panel.fields_loading')}</div>;
  if (!columns) return <div className="results-placeholder">{t('panel.fields_error')}</div>;

  return (
    <div className="new-record-view">
      <div className="new-record-header">
        <span className="new-record-title">{t('panel.edit_record_prefix')} — <span className="new-record-table">{schema}.{table}</span></span>
        {pkCols.length === 0 && (
          <span className="new-record-error" style={{ marginLeft: 12 }}>{t('panel.no_pk_warning')}</span>
        )}
      </div>
      <div className="new-record-form">
        {columns.map((col) => {
          const isPk = pkCols.includes(col.name);
          const auto = isAutoFill(col);
          return (
            <div key={col.name} className="new-record-row">
              <div className="new-record-label">
                <span className="new-record-col-name">{col.name}</span>
                <span className="new-record-col-type">{col.type}</span>
                {col.nullable === 'NO' && !auto && !isPk && <span className="new-record-required" title={t('panel.required_title')}>*</span>}
                {isPk && <span className="new-record-pk" title={t('panel.pk_title')}>PK</span>}
                {auto && <span className="new-record-auto" title={t('panel.auto_title')}>auto</span>}
              </div>
              <ColumnInput
                col={col}
                value={values[col.name] ?? ''}
                onChange={(v) => handleChange(col.name, v)}
                disabled={auto}
              />
            </div>
          );
        })}
      </div>
      <div className="new-record-actions">
        {saveError && <span className="new-record-error">{saveError}</span>}
        {saveSuccess && <span className="new-record-ok">{t('panel.record_saved')}</span>}
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || pkCols.length === 0}>
          {saving ? t('panel.saving_btn') : t('panel.save_btn')}
        </button>
      </div>
    </div>
  );
}

function ColumnInput({ col, value, onChange, disabled }) {
  const { t } = useI18n();
  const type = col.type.toLowerCase();
  const cls = `new-record-input${disabled ? ' new-record-input-disabled' : ''}`;

  if (disabled) {
    return (
      <input
        type="text"
        className={`${cls} new-record-text`}
        value={col.default_value || ''}
        disabled
        placeholder={t('panel.auto_placeholder')}
      />
    );
  }

  // Boolean
  if (type === 'boolean') {
    return (
      <select className={`${cls} new-record-select`} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('panel.bool_null_option')}</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  // Date / time
  if (type === 'date') {
    return <input type="date" className={`${cls} new-record-date`} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (type.startsWith('timestamp') || type === 'time without time zone' || type === 'time with time zone') {
    return <input type="datetime-local" className={`${cls} new-record-date`} step="1" value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  // Numeric
  if (
    type === 'integer' || type === 'bigint' || type === 'smallint' ||
    type === 'numeric' || type === 'decimal' || type === 'real' ||
    type === 'double precision' || type.startsWith('int')
  ) {
    return <input type="number" className={`${cls} new-record-number`} value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  // JSON / array – textarea
  if (type === 'json' || type === 'jsonb' || type === 'array' || type.endsWith('[]')) {
    return (
      <textarea
        className={`${cls} new-record-textarea`}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    );
  }

  // Default: text
  return <input type="text" className={`${cls} new-record-text`} value={value} onChange={(e) => onChange(e.target.value)} />;
}
