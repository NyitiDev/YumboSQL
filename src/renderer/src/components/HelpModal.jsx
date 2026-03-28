import React, { useEffect, useRef } from 'react';
import userguideRaw from '../../../../USERGUIDE.md?raw';
import { useI18n } from '../i18n/I18nContext';
import './HelpModal.css';

// ── Minimal markdown → HTML renderer ──────────────────────────
const TOKEN = '\uFFFD';

function renderMarkdown(md) {
  // 1. Extract fenced code blocks to prevent processing their content
  const blocks = [];
  const text = md.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code) => {
    blocks.push(code);
    return `${TOKEN}${blocks.length - 1}${TOKEN}`;
  });

  const inlineFmt = (s) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="help-ic">$1</code>')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '<span class="help-link">$1</span>');

  const lines = text.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block token
    const codeMatch = line.match(new RegExp(`${TOKEN}(\\d+)${TOKEN}`));
    if (codeMatch) {
      out.push(`<pre class="help-pre"><code>${blocks[parseInt(codeMatch[1])]}</code></pre>`);
      i++; continue;
    }

    // Table (line starts with |)
    if (line.trimStart().startsWith('|')) {
      const tLines = [];
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tLines.push(lines[i]);
        i++;
      }
      if (tLines.length >= 3) {
        const cells = (row) =>
          row.split('|').slice(1, -1).map((c) => c.trim());
        const headers = cells(tLines[0])
          .map((c) => `<th>${inlineFmt(c)}</th>`)
          .join('');
        const rows = tLines
          .slice(2)
          .filter((r) => r.trim())
          .map(
            (row) =>
              '<tr>' +
              cells(row)
                .map((c) => `<td>${inlineFmt(c)}</td>`)
                .join('') +
              '</tr>'
          )
          .join('');
        out.push(
          `<table class="help-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
        );
      }
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---') {
      out.push('<hr class="help-hr">');
      i++; continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    if (h3) { out.push(`<h3 class="help-h3">${inlineFmt(h3[1])}</h3>`); i++; continue; }
    const h2 = line.match(/^## (.+)/);
    if (h2) { out.push(`<h2 class="help-h2">${inlineFmt(h2[1])}</h2>`); i++; continue; }
    const h1 = line.match(/^# (.+)/);
    if (h1) { out.push(`<h1 class="help-h1">${inlineFmt(h1[1])}</h1>`); i++; continue; }

    // Blockquote
    if (line.startsWith('> ')) {
      const bqLines = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(lines[i].slice(2));
        i++;
      }
      out.push(`<blockquote class="help-bq">${inlineFmt(bqLines.join(' '))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(`<li>${inlineFmt(lines[i].slice(2))}</li>`);
        i++;
      }
      out.push(`<ul class="help-ul">${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(`<li>${inlineFmt(lines[i].replace(/^\d+\. /, ''))}</li>`);
        i++;
      }
      out.push(`<ol class="help-ol">${items.join('')}</ol>`);
      continue;
    }

    // Blank line
    if (line.trim() === '') { i++; continue; }

    // Paragraph – collect consecutive text lines
    const pLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^[#>|`]/) &&
      !lines[i].match(/^[-*] /) &&
      !lines[i].match(/^\d+\. /) &&
      lines[i].trim() !== '---' &&
      !lines[i].match(new RegExp(`${TOKEN}\\d+${TOKEN}`))
    ) {
      pLines.push(lines[i]);
      i++;
    }
    if (pLines.length > 0) {
      out.push(`<p class="help-p">${inlineFmt(pLines.join(' '))}</p>`);
    }
  }

  return out.join('\n');
}

const htmlContent = renderMarkdown(userguideRaw);

// ── Component ──────────────────────────────────────────────────
export default function HelpModal({ onClose }) {
  const { t } = useI18n();
  const contentRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="help-overlay" onClick={onClose}>
      <div
        className="help-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="help-header">
          <span className="help-title">{t('help.modal_title')}</span>
          <button className="btn btn-ghost btn-sm help-close" onClick={onClose}>✕</button>
        </div>
        <div
          className="help-content"
          ref={contentRef}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
}
