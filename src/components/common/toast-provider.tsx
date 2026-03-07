/**
 * Radix Toast provider and imperative toast() helper for app-wide notifications.
 */

import { useEffect } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { create } from 'zustand';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error';
}

interface ToastStore {
  toasts: ToastItem[];
  add: (item: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (item) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...item, id }] }));
    // Dismiss is handled by ToastRoot effect only; no duplicate timeout here
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(title: string, options?: { description?: string; variant?: ToastItem['variant'] }): void {
  useToastStore.getState().add({ title, description: options?.description, variant: options?.variant });
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <Toast.Provider swipeDirection="right">
      {children}
      <Toast.Viewport className="fixed bottom-0 right-0 z-[100] flex max-w-[380px] flex-col gap-2 p-4 outline-none">
        {toasts.map((t) => (
          <ToastRoot key={t.id} item={t} onOpenChange={(open) => !open && remove(t.id)} />
        ))}
      </Toast.Viewport>
    </Toast.Provider>
  );
}

function ToastRoot({
  item,
  onOpenChange,
}: {
  item: ToastItem;
  onOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onOpenChange(false), 4000);
    return () => clearTimeout(t);
  }, [item.id, onOpenChange]);

  const isError = item.variant === 'error';
  const isSuccess = item.variant === 'success';
  const className = isError
    ? 'bg-red-950/90 border-red-500/50 text-red-200'
    : isSuccess
      ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
      : 'bg-[var(--color-bg-tertiary)] border-[var(--color-bg-tertiary)] text-[var(--foreground)]';

  return (
    <Toast.Root
      className={`rounded-lg border p-4 shadow-lg ${className}`}
      onOpenChange={onOpenChange}
    >
      <Toast.Title className="text-sm font-medium">{item.title}</Toast.Title>
      {item.description && (
        <Toast.Description className="mt-1 text-xs opacity-90">{item.description}</Toast.Description>
      )}
    </Toast.Root>
  );
}
