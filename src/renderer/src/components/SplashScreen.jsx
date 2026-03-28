import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import './SplashScreen.css';

export default function SplashScreen({ onContinue }) {
  const { t } = useI18n();
  const handleContinue = async () => {
    await window.yumbosql.splashDone();
    onContinue();
  };

  return (
    <div className="splash">
      <div className="splash-logo-wrap">
        <img src="/logo_transparent.png" alt="YumboSQL" className="splash-logo" />
      </div>
      <div className="splash-text">
        <h1 className="splash-title">YumboSQL</h1>
        <p className="splash-subtitle">{t('splash.subtitle')}</p>
      </div>
      <button className="btn btn-primary splash-btn" onClick={handleContinue}>
        {t('splash.continue_btn')}
      </button>
    </div>
  );
}
