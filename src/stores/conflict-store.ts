/**
 * Zustand store for unresolved sync conflicts — ephemeral (not persisted).
 * Conflicts come from merge engine via WS or HTTP push responses.
 */

import { create } from "zustand";

export interface ConflictEntry {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  conflictingFields: string[];
  serverValues: Record<string, unknown>;
  clientValues: Record<string, unknown>;
  serverVersion: number;
  autoMergedFields: string[];
  createdAt: string;
}

/** Per-field resolution choice */
export type FieldResolution = "server" | "client";

interface ConflictStore {
  conflicts: ConflictEntry[];
  hasConflicts: () => boolean;

  addConflict: (entry: ConflictEntry) => void;
  removeConflict: (id: string) => void;
  clearAll: () => void;
}

export const useConflictStore = create<ConflictStore>((set, get) => ({
  conflicts: [],

  hasConflicts: () => get().conflicts.length > 0,

  addConflict(entry) {
    set((state) => ({
      conflicts: [...state.conflicts, entry],
    }));
  },

  removeConflict(id) {
    set((state) => ({
      conflicts: state.conflicts.filter((c) => c.id !== id),
    }));
  },

  clearAll() {
    set({ conflicts: [] });
  },
}));
