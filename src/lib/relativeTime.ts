import type { TimeCopy } from "@/i18n/copy";
import { countedTemplate, format } from "@/i18n/format";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export function relativeTime(timestamp: number, copy: TimeCopy, now: number = Date.now()): string {
  const elapsed = now - timestamp;
  if (elapsed < 45 * SECOND) return copy.justNow;
  if (elapsed < HOUR) return format(copy.minutes, { n: Math.floor(elapsed / MINUTE) });
  if (elapsed < DAY) return format(copy.hours, { n: Math.floor(elapsed / HOUR) });

  const days = Math.floor(elapsed / DAY);
  if (days === 1) return copy.yesterday;
  if (days < 7) return format(copy.days, { n: days });

  const weeks = Math.floor(elapsed / WEEK);
  if (weeks < 5) return format(copy.weeks, { n: weeks });

  return countedTemplate(copy.months, Math.floor(elapsed / MONTH));
}
