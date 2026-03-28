import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import './ConnectionDialog.css';

const DEFAULT_CONFIG = {
  host: 'localhost',
  port: '5432',
  user: 'postgres',
  password: '',
  database: 'postgres',
  ssl: false,
};

export default function ConnectionDialog({ onConnect, onClose }) {
  const { t } = useI18n();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    window.yumbosql.loadConnectionHistory().then((res) => {
      if (res.success) setHistory(res.data);
    });
  }, []);

  const updateField = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setTestResult(null);
  };

  const selectHistory = (entry) => {
    setConfig({
      host: entry.host,
      port: String(entry.port),
      user: entry.user,
      password: '',
      database: entry.database,
      ssl: entry.ssl || false,
    });
    setError(null);
    setTestResult(null);
  };

  const removeHistory = async (entry, e) => {
    e.stopPropagation();
    await window.yumbosql.removeConnectionHistory(entry);
    const res = await window.yumbosql.loadConnectionHistory();
    if (res.success) setHistory(res.data);
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);
    const payload = { ...config, port: parseInt(config.port, 10) };
    const result = await window.yumbosql.testConnection(payload);
    setTesting(false);
    if (result.success) {
      setTestResult(t('conn_dialog.test_success'));
    } else {
      setError(result.error);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    const payload = { ...config, port: parseInt(config.port, 10) };
    const result = await window.yumbosql.connect(payload);
    setConnecting(false);
    if (result.success) {
      // Save to history (no password)
      await window.yumbosql.saveConnectionHistory({
        host: payload.host,
        port: payload.port,
        user: payload.user,
        database: payload.database,
        ssl: payload.ssl,
      });
      onConnect(result.connId, payload);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <div className="dialog-header">
          <h2>{t('conn_dialog.title')}</h2>
          {onClose && (
            <button className="btn btn-ghost" onClick={onClose}>✕</button>
          )}
        </div>

        <div className="dialog-body">
          {/* Connection history */}
          {history.length > 0 && (
            <div className="conn-history">
              <div className="conn-history-label">{t('conn_dialog.history_label')}</div>
              <div className="conn-history-list">
                {history.map((entry, i) => (
                  <div
                    key={i}
                    className="conn-history-item"
                    onClick={() => selectHistory(entry)}
                  >
                    <span className="conn-history-icon">🖥</span>
                    <span className="conn-history-info">
                      <span className="conn-history-main">
                        {entry.user}@{entry.host}:{entry.port}/{entry.database}
                      </span>
                      {entry.lastUsed && (
                        <span className="conn-history-date">
                          {new Date(entry.lastUsed).toLocaleDateString('hu-HU')}
                        </span>
                      )}
                    </span>
                    <button
                      className="conn-history-remove"
                      onClick={(e) => removeHistory(entry, e)}
                      title={t('conn_dialog.remove_title')}
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-row">
            <label>{t('conn_dialog.field_host')}</label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => updateField('host', e.target.value)}
              placeholder="localhost"
            />
          </div>
          <div className="form-row">
            <label>{t('conn_dialog.field_port')}</label>
            <input
              type="text"
              value={config.port}
              onChange={(e) => updateField('port', e.target.value)}
              placeholder="5432"
            />
          </div>
          <div className="form-row">
            <label>{t('conn_dialog.field_user')}</label>
            <input
              type="text"
              value={config.user}
              onChange={(e) => updateField('user', e.target.value)}
              placeholder="postgres"
            />
          </div>
          <div className="form-row">
            <label>{t('conn_dialog.field_password')}</label>
            <input
              type="password"
              value={config.password}
              onChange={(e) => updateField('password', e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>{t('conn_dialog.field_database')}</label>
            <input
              type="text"
              value={config.database}
              onChange={(e) => updateField('database', e.target.value)}
              placeholder="postgres"
            />
          </div>
          <div className="form-row form-row-checkbox">
            <label>
              <input
                type="checkbox"
                checked={config.ssl}
                onChange={(e) => updateField('ssl', e.target.checked)}
              />
              {t('conn_dialog.field_ssl')}
            </label>
          </div>

          {error && <div className="form-message form-error">{error}</div>}
          {testResult && <div className="form-message form-success">{testResult}</div>}
        </div>

        <div className="dialog-footer">
          <button
            className="btn btn-secondary"
            onClick={handleTest}
            disabled={testing || connecting}
          >
            {testing ? t('conn_dialog.testing_btn') : t('conn_dialog.test_btn')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={testing || connecting}
          >
            {connecting ? t('conn_dialog.connecting_btn') : t('conn_dialog.connect_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
