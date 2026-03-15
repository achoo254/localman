/**
 * Dropdown to select active environment.
 */

import * as Select from '@radix-ui/react-select';
import type { Environment } from '../../types/models';

interface EnvironmentSelectorProps {
  environments: Environment[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}

export function EnvironmentSelector({
  environments,
  activeId,
  onSelect,
  disabled = false,
}: EnvironmentSelectorProps) {
  const value = activeId ?? '__none__';

  return (
    <Select.Root
      value={value}
      onValueChange={v => onSelect(v === '__none__' ? null : v)}
      disabled={disabled}
    >
      <Select.Trigger
        className="flex min-w-[140px] items-center gap-1.5 rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-left text-sm outline-none hover:bg-[var(--color-bg-tertiary)] focus:ring-1 focus:ring-[var(--color-accent)]"
        aria-label="Active environment"
      >
        <Select.Value placeholder="No Environment" />
        <Select.Icon className="ml-1 opacity-70">▼</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="overflow-hidden rounded-lg border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] shadow-lg"
          position="popper"
          sideOffset={4}
        >
          <Select.Item
            value="__none__"
            className="cursor-pointer px-3 py-2 text-sm outline-none hover:bg-[var(--color-bg-tertiary)] focus:bg-[var(--color-bg-tertiary)]"
          >
            <Select.ItemText>No Environment</Select.ItemText>
          </Select.Item>
          {environments.map(env => (
            <Select.Item
              key={env.id}
              value={env.id}
              className="cursor-pointer px-3 py-2 text-sm outline-none hover:bg-[var(--color-bg-tertiary)] focus:bg-[var(--color-bg-tertiary)]"
            >
              <Select.ItemText>{env.name}</Select.ItemText>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
