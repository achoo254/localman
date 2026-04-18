/**
 * UI-only state for right-side panels (variables-in-request, etc).
 * Separate from data stores — no persistence except resizable width.
 *
 * [RED TEAM H10] focusVar uses nonce token so re-opening with same name
 * still triggers effect-based scroll/highlight.
 */

import { create } from 'zustand';

const WIDTH_STORAGE_KEY = 'localman_right_panel_width';
const RIGHT_PANEL_WIDTH_MIN = 280;
const RIGHT_PANEL_WIDTH_MAX = 480;
const RIGHT_PANEL_WIDTH_DEFAULT = 320;

function clampRightPanelWidth(w: number): number {
  return Math.max(RIGHT_PANEL_WIDTH_MIN, Math.min(RIGHT_PANEL_WIDTH_MAX, w));
}

function loadWidth(): number {
  if (typeof window === 'undefined') return RIGHT_PANEL_WIDTH_DEFAULT;
  const raw = window.localStorage.getItem(WIDTH_STORAGE_KEY);
  if (!raw) return RIGHT_PANEL_WIDTH_DEFAULT;
  const n = Number(raw);
  return Number.isFinite(n) ? clampRightPanelWidth(n) : RIGHT_PANEL_WIDTH_DEFAULT;
}

export interface FocusVarToken {
  name: string;
  nonce: number;
}

interface UiPanelStore {
  variablesPanelOpen: boolean;
  focusVar: FocusVarToken | null;
  width: number;
  open: (focusVarName?: string) => void;
  close: () => void;
  toggle: () => void;
  clearFocus: () => void;
  setWidth: (w: number) => void;
}

export const RIGHT_PANEL_WIDTH = {
  MIN: RIGHT_PANEL_WIDTH_MIN,
  MAX: RIGHT_PANEL_WIDTH_MAX,
  DEFAULT: RIGHT_PANEL_WIDTH_DEFAULT,
};

export const useUiPanelStore = create<UiPanelStore>((set, get) => ({
  variablesPanelOpen: false,
  focusVar: null,
  width: loadWidth(),

  open(focusVarName) {
    set({
      variablesPanelOpen: true,
      focusVar: focusVarName
        ? { name: focusVarName, nonce: Date.now() + Math.random() }
        : null,
    });
  },
  close() {
    set({ variablesPanelOpen: false, focusVar: null });
  },
  toggle() {
    const next = !get().variablesPanelOpen;
    set({ variablesPanelOpen: next, focusVar: next ? get().focusVar : null });
  },
  clearFocus() {
    set({ focusVar: null });
  },
  setWidth(w) {
    const clamped = clampRightPanelWidth(w);
    set({ width: clamped });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WIDTH_STORAGE_KEY, String(clamped));
    }
  },
}));
