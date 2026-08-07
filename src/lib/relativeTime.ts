const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const elapsed = now - timestamp;
  if (elapsed < 45 * SECOND) return "just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;

  const days = Math.floor(elapsed / DAY);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(elapsed / WEEK);
  if (weeks < 5) return `${weeks}w ago`;

  return `${Math.floor(elapsed / MONTH)}mo ago`;
}
