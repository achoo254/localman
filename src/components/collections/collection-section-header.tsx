/**
 * Collapsible section header for Personal / Team workspace sections in the sidebar.
 */

import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

interface CollectionSectionHeaderProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onCreateCollection?: () => void;
}

export function CollectionSectionHeader({
  title,
  isCollapsed,
  onToggle,
  onCreateCollection,
}: CollectionSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 group">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {title}
      </button>
      {onCreateCollection && (
        <button
          type="button"
          onClick={onCreateCollection}
          className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-slate-500 hover:text-slate-300 hover:bg-[var(--color-bg-tertiary)] transition-opacity"
          title="Create collection"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
