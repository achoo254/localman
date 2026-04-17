/**
 * Group history entries by date: Today, Yesterday, Last 7 days, Older.
 */

export type DateGroupKey = 'today' | 'yesterday' | 'last7' | 'older';

export function getDateGroupKey(timestamp: string): DateGroupKey {
  const date = new Date(timestamp);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const sevenDaysStart = new Date(todayStart);
  sevenDaysStart.setDate(sevenDaysStart.getDate() - 7);

  if (date >= todayStart) return 'today';
  if (date >= yesterdayStart) return 'yesterday';
  if (date >= sevenDaysStart) return 'last7';
  return 'older';
}

export function getDateGroupLabel(key: DateGroupKey): string {
  switch (key) {
    case 'today': return 'Today';
    case 'yesterday': return 'Yesterday';
    case 'last7': return 'Last 7 days';
    case 'older': return 'Older';
    default: return key;
  }
}

export function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return date.toLocaleDateString();
}
