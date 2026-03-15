/**
 * Body viewer with Pretty (JSON tree), Raw, and Preview (HTML) tabs.
 */

import { useState, useEffect } from 'react';
import { JsonViewer } from './json-viewer';
import { RawViewer } from './raw-viewer';
import { HtmlPreview } from './html-preview';

type ViewMode = 'pretty' | 'raw' | 'preview';

interface ResponseBodyViewerProps {
  body: string;
  contentType: string;
}

function isJsonLike(ct: string): boolean {
  return /json|javascript/.test(ct);
}

function isHtml(ct: string): boolean {
  return /html/.test(ct);
}

function defaultMode(contentType: string): ViewMode {
  if (isJsonLike(contentType)) return 'pretty';
  if (isHtml(contentType)) return 'preview';
  return 'raw';
}

export function ResponseBodyViewer({ body, contentType }: ResponseBodyViewerProps) {
  const [mode, setMode] = useState<ViewMode>(() => defaultMode(contentType));
  const showPretty = isJsonLike(contentType);
  const showPreview = isHtml(contentType);

  // Reset mode when contentType changes between responses
  useEffect(() => {
    setMode(defaultMode(contentType));
  }, [contentType]);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex gap-1 border-b border-[var(--color-bg-tertiary)] px-2 py-1 shrink-0">
        {showPretty && (
          <button
            type="button"
            onClick={() => setMode('pretty')}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${mode === 'pretty' ? 'bg-[var(--color-bg-tertiary)] text-[var(--foreground)] shadow-sm' : 'text-slate-400 hover:text-[var(--foreground)] hover:bg-white/[0.03]'}`}
          >
            Pretty
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode('raw')}
          className={`rounded px-3 py-1 text-sm font-medium transition-colors ${mode === 'raw' ? 'bg-[var(--color-bg-tertiary)] text-[var(--foreground)] shadow-sm' : 'text-slate-400 hover:text-[var(--foreground)] hover:bg-white/[0.03]'}`}
        >
          Raw
        </button>
        {showPreview && (
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${mode === 'preview' ? 'bg-[var(--color-bg-tertiary)] text-[var(--foreground)] shadow-sm' : 'text-slate-400 hover:text-[var(--foreground)] hover:bg-white/[0.03]'}`}
          >
            Preview
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {mode === 'pretty' && <JsonViewer body={body} />}
        {mode === 'raw' && <RawViewer body={body} />}
        {mode === 'preview' && <HtmlPreview body={body} />}
      </div>
    </div>
  );
}
