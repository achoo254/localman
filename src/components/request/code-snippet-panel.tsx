/**
 * Code snippet panel: language selector, syntax-highlighted read-only display, copy button.
 * Generates code snippets from the current request using PreparedRequest.
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { generateSnippet, SNIPPET_LANGUAGES } from '../../services/snippet-generators';
import { prepareRequest } from '../../services/request-preparer';
import { useEnvironmentStore } from '../../stores/environment-store';
import { toast } from '../common/toast-provider';
import type { ApiRequest } from '../../types/models';

const STORAGE_KEY = 'localman:snippet-lang';

function getPersistedLang(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'curl';
  } catch {
    return 'curl';
  }
}

interface CodeSnippetPanelProps {
  request: ApiRequest;
}

export function CodeSnippetPanel({ request }: CodeSnippetPanelProps) {
  const [lang, setLang] = useState(getPersistedLang);
  const [copied, setCopied] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const getInterpolationContext = useEnvironmentStore(s => s.getInterpolationContext);
  const environments = useEnvironmentStore(s => s.environments);
  // Track active env to trigger snippet regeneration on env switch
  const activeEnvId = environments.find(e => e.is_active)?.id;

  const snippet = useMemo(() => {
    const ctx = getInterpolationContext();
    try {
      const prepared = prepareRequest(request, ctx);
      return generateSnippet(prepared, lang);
    } catch {
      return '// Could not generate snippet (check request body type)';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- activeEnvId triggers regeneration on env switch
  }, [request, lang, getInterpolationContext, activeEnvId]);

  // Get CodeMirror language extension based on mode
  const langExtension = useMemo(() => {
    const meta = SNIPPET_LANGUAGES.find(l => l.key === lang);
    const mode = meta?.codemirrorMode || 'shell';
    // Only load JS extension since it's already available; others get plain text
    if (mode === 'javascript') return [javascript()];
    return [];
  }, [lang]);

  // Create/destroy editor only when language changes
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const state = EditorState.create({
      doc: snippet,
      extensions: [
        ...langExtension,
        oneDark,
        EditorView.editable.of(false),
        EditorState.readOnly.of(true),
        EditorView.theme({
          '&': { fontSize: '12.5px', maxHeight: '260px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-gutters': { display: 'none' },
        }),
      ],
    });

    // Clear container to prevent stacked editors on rapid language switching
    editorContainerRef.current.innerHTML = '';
    const view = new EditorView({ state, parent: editorContainerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Recreate only on language change; snippet updates handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langExtension]);

  // Update doc content without recreating the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === snippet) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: snippet } });
  }, [snippet]);

  const handleLangChange = useCallback((key: string) => {
    setLang(key);
    try { localStorage.setItem(STORAGE_KEY, key); } catch { /* noop */ }
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      toast('Copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('Failed to copy', { variant: 'error' });
    }
  }, [snippet]);

  return (
    <div className="border border-[var(--color-bg-tertiary)] rounded-lg bg-[var(--color-bg-secondary)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-bg-tertiary)]">
        <span className="text-xs font-medium text-slate-400">Code Snippet</span>
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="relative">
            <select
              value={lang}
              onChange={e => handleLangChange(e.target.value)}
              className="appearance-none bg-[var(--color-bg-tertiary)] text-xs text-slate-300 rounded-md pl-2.5 pr-6 py-1 border border-transparent hover:border-slate-600 focus:border-[var(--color-accent)] focus:outline-none cursor-pointer"
            >
              {SNIPPET_LANGUAGES.map(l => (
                <option key={l.key} value={l.key}>{l.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
          </div>

          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code display */}
      <div ref={editorContainerRef} className="min-h-[60px] max-h-[260px] overflow-auto" />
    </div>
  );
}
