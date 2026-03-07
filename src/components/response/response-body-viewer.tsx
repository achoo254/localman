/**
 * Body viewer with Pretty (JSON tree), Raw, and Preview (HTML) tabs.
 */

import { useState } from 'react';
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

export function ResponseBodyViewer({ body, contentType }: ResponseBodyViewerProps) {
  const [mode, setMode] = useState<ViewMode>(() =>
    isJsonLike(contentType) ? 'pretty' : isHtml(contentType) ? 'preview' : 'raw'
  );
  const showPretty = isJsonLike(contentType);
  const showPreview = isHtml(contentType);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex gap-1 border-b border-[var(--color-bg-tertiary)] px-2 py-1 shrink-0">
        {showPretty && (
          <button
            type="button"
            onClick={() => setMode('pretty')}
            className={`rounded px-2 py-1 text-sm ${mode === 'pretty' ? 'bg-[var(--color-accent)] text-white' : 'text-gray-400 hover:text-[var(--foreground)]'}`}
          >
            Pretty
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode('raw')}
          className={`rounded px-2 py-1 text-sm ${mode === 'raw' ? 'bg-[var(--color-accent)] text-white' : 'text-gray-400 hover:text-[var(--foreground)]'}`}
        >
          Raw
        </button>
        {showPreview && (
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`rounded px-2 py-1 text-sm ${mode === 'preview' ? 'bg-[var(--color-accent)] text-white' : 'text-gray-400 hover:text-[var(--foreground)]'}`}
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
