/**
 * CodeMirror 6 raw/XML body editor.
 */

import { useEffect, useRef } from 'react';
import { EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';

interface BodyRawEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'xml' | 'plain';
}

export function BodyRawEditor({ value, onChange, language = 'plain' }: BodyRawEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const state = EditorState.create({
      doc: value ?? '',
      extensions: [
        ...(language === 'xml' ? [xml()] : []),
        oneDark,
        EditorView.updateListener.of(update => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value ?? '' },
    });
  }, [value]);

  return <div ref={containerRef} className="min-h-[200px] rounded border border-[var(--color-bg-tertiary)]" />;
}
