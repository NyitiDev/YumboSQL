import React from 'react';
import './Titlebar.css';

export default function Titlebar({ hasConnections, onNewConnection }) {
  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-title">YumboSQL</span>
      </div>
      <div className="titlebar-actions">
        <button className="btn btn-ghost btn-sm" onClick={onNewConnection} title="Új kapcsolat">
          ＋ Kapcsolat
        </button>
      </div>
    </div>
  );
}
