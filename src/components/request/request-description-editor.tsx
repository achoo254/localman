/**
 * Collapsible markdown description editor/preview for requests.
 * Default collapsed if description is empty; toggles between edit and preview modes.
 */

import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Pencil, Eye } from 'lucide-react';
import Markdown from 'react-markdown';

interface RequestDescriptionEditorProps {
  description: string;
  onChange: (description: string) => void;
}

export function RequestDescriptionEditor({ description, onChange }: RequestDescriptionEditorProps) {
  const [isOpen, setIsOpen] = useState(!!description);
  const [mode, setMode] = useState<'edit' | 'preview'>(description ? 'preview' : 'edit');

  const handleToggle = useCallback(() => {
    setIsOpen(v => !v);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(m => (m === 'edit' ? 'preview' : 'edit'));
  }, []);

  return (
    <div className="border-b border-[var(--color-bg-tertiary)]">
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span className="font-medium">Description</span>
        {!description && <span className="text-slate-600 ml-1">(empty)</span>}
      </button>

      {isOpen && (
        <div className="px-3 pb-2">
          {/* Mode toggle */}
          <div className="flex justify-end mb-1">
            <button
              type="button"
              onClick={toggleMode}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              title={mode === 'edit' ? 'Preview' : 'Edit'}
            >
              {mode === 'edit' ? <Eye className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
              {mode === 'edit' ? 'Preview' : 'Edit'}
            </button>
          </div>

          {mode === 'edit' ? (
            <textarea
              value={description}
              onChange={e => onChange(e.target.value)}
              placeholder="Add a description (supports Markdown)..."
              className="w-full min-h-[60px] max-h-[160px] resize-y rounded-md border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] px-2.5 py-2 text-xs text-slate-300 placeholder-slate-600 focus:border-[var(--color-accent)] focus:outline-none font-mono"
              rows={3}
            />
          ) : (
            <div className="prose-sm prose-invert max-w-none rounded-md bg-[var(--color-bg-primary)] px-2.5 py-2 text-xs text-slate-300 min-h-[40px] [&_p]:m-0 [&_p]:mb-1 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-slate-800 [&_pre]:p-2 [&_pre]:rounded [&_a]:text-[var(--color-accent)]">
              {description ? (
                <Markdown>{description}</Markdown>
              ) : (
                <span className="text-slate-600 italic">No description</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
