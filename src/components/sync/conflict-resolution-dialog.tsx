/**
 * Conflict resolution dialog — modal showing all unresolved field conflicts.
 * Non-dismissable until all conflicts resolved. Per-field pick or bulk actions.
 */

import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useConflictStore, type ConflictEntry, type FieldResolution } from "../../stores/conflict-store";
import { resolveConflict } from "../../services/sync/conflict-queue";
import { ConflictFieldDiff } from "./conflict-field-diff";

export function ConflictResolutionDialog() {
  const conflicts = useConflictStore((s) => s.conflicts);
  const open = conflicts.length > 0;

  if (!open) return null;

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg max-h-[80vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] p-5 shadow-xl">
          <Dialog.Title className="flex items-center gap-2 text-sm font-semibold text-yellow-400">
            <span>⚠</span>
            <span>Sync Conflicts ({conflicts.length})</span>
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-gray-400">
            Other users changed the same fields you edited. Pick which version to keep for each field.
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            {conflicts.map((conflict) => (
              <ConflictCard key={conflict.id} conflict={conflict} />
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ConflictCard({ conflict }: { conflict: ConflictEntry }) {
  const [resolutions, setResolutions] = useState<Record<string, FieldResolution>>({});
  const [submitting, setSubmitting] = useState(false);

  const allResolved = conflict.conflictingFields.every((f) => resolutions[f]);

  const setFieldResolution = useCallback((field: string, choice: FieldResolution) => {
    setResolutions((prev) => ({ ...prev, [field]: choice }));
  }, []);

  const bulkResolve = useCallback((choice: FieldResolution) => {
    const bulk: Record<string, FieldResolution> = {};
    for (const field of conflict.conflictingFields) {
      bulk[field] = choice;
    }
    setResolutions(bulk);
  }, [conflict.conflictingFields]);

  const handleApply = async () => {
    if (!allResolved) return;
    setSubmitting(true);
    try {
      await resolveConflict(
        conflict.id,
        conflict.entityType,
        conflict.entityId,
        conflict.serverVersion,
        resolutions,
        conflict.serverValues,
        conflict.clientValues,
      );
    } catch (err) {
      console.error("Failed to resolve conflict:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-primary)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium">
          {conflict.entityType}: {conflict.entityName}
        </span>
        <span className="text-[10px] text-gray-500">
          {conflict.conflictingFields.length} field(s)
        </span>
      </div>

      {conflict.autoMergedFields.length > 0 && (
        <div className="mb-2 text-[10px] text-green-400">
          Auto-merged: {conflict.autoMergedFields.join(", ")}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {conflict.conflictingFields.map((field) => (
          <ConflictFieldDiff
            key={field}
            field={field}
            serverValue={conflict.serverValues[field]}
            clientValue={conflict.clientValues[field]}
            resolution={resolutions[field] ?? null}
            onResolve={(choice) => setFieldResolution(field, choice)}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => bulkResolve("server")}
            className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-green-500/10 hover:text-green-400"
          >
            Accept All Server
          </button>
          <button
            type="button"
            onClick={() => bulkResolve("client")}
            className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-blue-500/10 hover:text-blue-400"
          >
            Accept All Mine
          </button>
        </div>
        <button
          type="button"
          onClick={handleApply}
          disabled={!allResolved || submitting}
          className="rounded bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}
