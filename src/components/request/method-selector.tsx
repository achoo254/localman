/**
 * HTTP method dropdown with color coding.
 */

import * as Select from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import type { HttpMethod } from '../../types/enums';
import { METHOD_COLORS } from '../../utils/method-colors';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

interface MethodSelectorProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
  disabled?: boolean;
}

export function MethodSelector({ value, onChange, disabled }: MethodSelectorProps) {
  return (
    <Select.Root value={value} onValueChange={v => onChange(v as HttpMethod)} disabled={disabled}>
      <Select.Trigger
        aria-label="HTTP method"
        className="flex min-w-[100px] items-center justify-center gap-1 rounded border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] px-3 py-2 font-mono text-sm font-medium outline-none hover:bg-[var(--color-bg-tertiary)] focus:ring-1 focus:ring-[var(--color-accent)]"
        style={{ color: METHOD_COLORS[value] }}
      >
        <Select.Value />
        <Select.Icon className="ml-1 opacity-70">
          <ChevronDown className="h-3.5 w-3.5" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="overflow-hidden rounded-md border border-[var(--color-bg-tertiary)] bg-[var(--color-bg-secondary)] shadow-lg"
          position="popper"
          sideOffset={4}
        >
          {METHODS.map(m => (
            <Select.Item
              key={m}
              value={m}
              className="flex cursor-pointer px-3 py-2 font-mono text-sm outline-none hover:bg-[var(--color-bg-tertiary)] focus:bg-[var(--color-bg-tertiary)]"
              style={{ color: METHOD_COLORS[m] }}
            >
              <Select.ItemText>{m}</Select.ItemText>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
