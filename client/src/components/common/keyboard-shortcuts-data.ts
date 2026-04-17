export interface ShortcutGroup {
  category: string;
  items: Array<[string, string]>;
}

export const KEYBOARD_SHORTCUTS: ShortcutGroup[] = [
  { category: 'General', items: [['Ctrl + /', 'Shortcuts'], ['Ctrl + T', 'New request tab']] },
  { category: 'Request', items: [['Ctrl + Enter', 'Send request']] },
  { category: 'Editor', items: [['Ctrl + Z', 'Undo']] },
];
