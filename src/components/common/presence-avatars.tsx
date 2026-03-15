/**
 * Presence avatars — small colored circles showing who's online in a workspace.
 * Shows up to 3 avatars + "+N" overflow. Tooltip with name and status.
 */

import * as Tooltip from '@radix-ui/react-tooltip';
import { usePresenceStore, type UserPresence } from '../../stores/presence-store';

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-orange-500',
  'bg-rose-500',
  'bg-cyan-500',
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function statusLabel(status: UserPresence['status']): string {
  switch (status) {
    case 'editing': return 'Editing';
    case 'active': return 'Viewing';
    case 'idle': return 'Idle';
    default: return 'Online';
  }
}

interface AvatarProps {
  user: UserPresence;
  size?: number;
}

function Avatar({ user, size = 24 }: AvatarProps) {
  const color = getAvatarColor(user.userId);
  const initials = getInitials(user.userName || user.userId);
  const label = `${user.userName} — ${statusLabel(user.status)}`;

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            className={`${color} flex items-center justify-center rounded-full text-white font-semibold select-none shrink-0 ring-2 ring-[var(--color-bg-primary)]`}
            style={{ width: size, height: size, fontSize: size * 0.38 }}
            aria-label={label}
          >
            {initials}
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="rounded bg-[var(--color-bg-tertiary)] px-2 py-1 text-xs text-slate-200 shadow-md border border-[var(--color-bg-tertiary)]"
            sideOffset={4}
          >
            {label}
            <Tooltip.Arrow className="fill-[var(--color-bg-tertiary)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

interface PresenceAvatarsProps {
  workspaceId: string;
  /** Filter by entity ID (e.g. current request) — omit to show all workspace presence */
  entityId?: string;
  maxVisible?: number;
  avatarSize?: number;
}

export function PresenceAvatars({
  workspaceId,
  entityId,
  maxVisible = 3,
  avatarSize = 24,
}: PresenceAvatarsProps) {
  const getWorkspacePresence = usePresenceStore(s => s.getWorkspacePresence);
  const allPresence = getWorkspacePresence(workspaceId);

  const users = entityId
    ? allPresence.filter(u => u.entityId === entityId)
    : allPresence;

  if (users.length === 0) return null;

  const visible = users.slice(0, maxVisible);
  const overflow = users.length - maxVisible;

  return (
    <div className="flex items-center" style={{ gap: -(avatarSize / 4) }}>
      {visible.map(user => (
        <Avatar key={user.userId} user={user} size={avatarSize} />
      ))}
      {overflow > 0 && (
        <div
          className="flex items-center justify-center rounded-full bg-slate-700 text-slate-300 font-semibold shrink-0 ring-2 ring-[var(--color-bg-primary)]"
          style={{ width: avatarSize, height: avatarSize, fontSize: avatarSize * 0.38 }}
          title={`${overflow} more online`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
