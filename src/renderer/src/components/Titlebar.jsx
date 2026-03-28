import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';
import HelpModal from './HelpModal';
import './Titlebar.css';

export default function Titlebar({ hasConnections, onNewConnection }) {
  const { lang, setLang, langs, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langSubOpen, setLangSubOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setLangSubOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const handleLangSelect = (l) => {
    setLang(l);
    setMenuOpen(false);
    setLangSubOpen(false);
  };

  return (
    <>
      <div className="titlebar">
        <div className="titlebar-drag">
          <span className="titlebar-title">YumboSQL</span>
        </div>
        <div className="titlebar-actions">
          {/* Settings menu */}
          <div className="settings-wrap" ref={menuRef}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setMenuOpen((o) => !o); setLangSubOpen(false); }}
              title={t('titlebar.settings_btn')}
            >
              {t('titlebar.settings_btn')}
            </button>

            {menuOpen && (
              <div className="settings-dropdown">
                {/* Language submenu */}
                <div
                  className="settings-item"
                  onMouseEnter={() => setLangSubOpen(true)}
                  onMouseLeave={() => setLangSubOpen(false)}
                >
                  <span>🌐</span>
                  <span>{t('titlebar.settings_lang_menu')}</span>
                  <span className="settings-item-arrow">▸</span>

                  {langSubOpen && (
                    <div className="settings-sub">
                      {langs.map((l) => (
                        <div
                          key={l}
                          className={`settings-lang-item${l === lang ? ' active' : ''}`}
                          onClick={() => handleLangSelect(l)}
                        >
                          {l === lang && <span>✓</span>}
                          {l !== lang && <span className="settings-lang-placeholder" />}
                          <span>{l.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="settings-sep" />

                {/* Help */}
                <div
                  className="settings-item"
                  onClick={() => { setHelpOpen(true); setMenuOpen(false); }}
                >
                  <span>❓</span>
                  <span>{t('titlebar.settings_help_menu')}</span>
                </div>
              </div>
            )}
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={onNewConnection}
            title={t('titlebar.new_connection_title')}
          >
            {t('titlebar.new_connection_btn')}
          </button>
        </div>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </>
  );
}
