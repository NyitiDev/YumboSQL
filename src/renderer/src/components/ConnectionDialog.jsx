import React, { useState, useEffect } from 'react';
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
      setTestResult('Sikeres kapcsolat!');
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
          <h2>Kapcsolódás PostgreSQL szerverhez</h2>
          {onClose && (
            <button className="btn btn-ghost" onClick={onClose}>✕</button>
          )}
        </div>

        <div className="dialog-body">
          {/* Connection history */}
          {history.length > 0 && (
            <div className="conn-history">
              <div className="conn-history-label">Korábbi kapcsolatok</div>
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
                      title="Törlés"
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-row">
            <label>Host</label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => updateField('host', e.target.value)}
              placeholder="localhost"
            />
          </div>
          <div className="form-row">
            <label>Port</label>
            <input
              type="text"
              value={config.port}
              onChange={(e) => updateField('port', e.target.value)}
              placeholder="5432"
            />
          </div>
          <div className="form-row">
            <label>Felhasználó</label>
            <input
              type="text"
              value={config.user}
              onChange={(e) => updateField('user', e.target.value)}
              placeholder="postgres"
            />
          </div>
          <div className="form-row">
            <label>Jelszó</label>
            <input
              type="password"
              value={config.password}
              onChange={(e) => updateField('password', e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>Adatbázis</label>
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
              SSL kapcsolat
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
            {testing ? 'Tesztelés…' : 'Kapcsolat tesztelése'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={testing || connecting}
          >
            {connecting ? 'Kapcsolódás…' : 'Kapcsolódás'}
          </button>
        </div>
      </div>
    </div>
  );
}
