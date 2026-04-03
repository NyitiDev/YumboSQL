import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { EditorView, keymap, placeholder, Decoration } from '@codemirror/view';
import { EditorState, Compartment, StateEffect, StateField } from '@codemirror/state';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { autocompletion } from '@codemirror/autocomplete';
import { useI18n } from '../i18n/I18nContext';
import './SqlEditor.css';

const setErrorLineEffect = StateEffect.define();
const clearErrorEffect = StateEffect.define();
const errorLineField = StateField.define({
  create() { return Decoration.none; },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(clearErrorEffect)) return Decoration.none;
      if (effect.is(setErrorLineEffect)) {
        const lineNum = effect.value;
        if (lineNum < 1 || lineNum > tr.state.doc.lines) return Decoration.none;
        const line = tr.state.doc.line(lineNum);
        return Decoration.set([Decoration.line({ class: 'cm-error-line' }).range(line.from)]);
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const SqlEditor = forwardRef(function SqlEditor({ onRun, onSave, initialValue }, ref) {
  const { t } = useI18n();
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const placeholderCompartment = useRef(new Compartment());
  const onRunRef = useRef(onRun);
  const onSaveRef = useRef(onSave);
  onRunRef.current = onRun;
  onSaveRef.current = onSave;

  useImperativeHandle(ref, () => ({
    getContent: () => viewRef.current ? viewRef.current.state.doc.toString() : '',
    setErrorLine: (lineNum) => {
      if (!viewRef.current) return;
      const view = viewRef.current;
      view.dispatch({ effects: setErrorLineEffect.of(lineNum) });
      const doc = view.state.doc;
      if (lineNum >= 1 && lineNum <= doc.lines) {
        const line = doc.line(lineNum);
        view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: 'center' }) });
      }
    },
    clearError: () => {
      if (!viewRef.current) return;
      viewRef.current.dispatch({ effects: clearErrorEffect.of(null) });
    },
  }), []);

  const runQuery = useCallback(() => {
    if (!viewRef.current) return;
    const doc = viewRef.current.state.doc.toString().trim();
    if (doc && onRunRef.current) {
      onRunRef.current(doc);
    }
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const runKeymap = keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          runQuery();
          return true;
        },
      },
      {
        key: 'Mod-s',
        run: () => {
          if (onSaveRef.current) onSaveRef.current();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: initialValue || '',
      extensions: [
        runKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        history(),
        sql({ dialect: PostgreSQL }),
        autocompletion(),
        oneDark,
        placeholderCompartment.current.of(placeholder(t('sql_editor.placeholder'))),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '13px',
          },
          '.cm-content': {
            fontFamily: 'var(--font-mono)',
            padding: '12px',
          },
          '.cm-gutters': {
            background: '#161b22',
            border: 'none',
            color: '#6e7681',
          },
          '.cm-activeLineGutter': {
            background: '#1c2128',
          },
          '.cm-activeLine': {
            background: 'rgba(56, 139, 253, 0.06)',
          },
          '.cm-cursor': {
            borderLeftColor: '#58a6ff',
          },
          '.cm-selectionBackground': {
            background: 'rgba(56, 139, 253, 0.2) !important',
          },
        }),
        EditorView.lineWrapping,
        errorLineField,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  // Live-update placeholder when language changes
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: placeholderCompartment.current.reconfigure(placeholder(t('sql_editor.placeholder'))),
    });
  }, [t]);

  return (
    <div className="sql-editor-wrapper">
      <div className="sql-editor-toolbar">
        <button className="btn btn-primary btn-sm" onClick={runQuery}>
          {t('sql_editor.run_btn')}
        </button>
        {onSave && (
          <button className="btn btn-ghost btn-sm" onClick={onSave} title={t('sql_editor.save_title')}>
            {t('sql_editor.save_btn')}
          </button>
        )}
        <span className="sql-editor-hint">Cmd+Enter</span>
      </div>
      <div className="sql-editor" ref={editorRef} />
    </div>
  );
});

export default SqlEditor;
