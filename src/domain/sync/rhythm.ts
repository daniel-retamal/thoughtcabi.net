import type { Cadence } from "./types";

export interface Rhythm {
  pollFocused: number;
  pollVisible: number;
  pushDebounce: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const FOLDER_RHYTHM: Rhythm = {
  pollFocused: 5 * SECOND,
  pollVisible: 15 * SECOND,
  pushDebounce: 10 * SECOND,
};

export const NETWORK_RHYTHM: Rhythm = {
  pollFocused: 20 * SECOND,
  pollVisible: MINUTE,
  pushDebounce: 2.5 * SECOND,
};

export const REPO_RHYTHM: Rhythm = {
  pollFocused: HOUR,
  pollVisible: HOUR,
  pushDebounce: HOUR,
};

export const BACKOFF: readonly number[] = [5 * SECOND, 15 * SECOND, MINUTE];

export function backoffAfter(failures: number): number {
  return BACKOFF[Math.min(failures, BACKOFF.length) - 1] ?? BACKOFF[0] ?? SECOND;
}

export function pollEvery(rhythm: Rhythm, cadence: Cadence, focused: boolean): number | null {
  if (cadence === "manual") return null;
  if (cadence === "hourly") return HOUR;
  return focused ? rhythm.pollFocused : rhythm.pollVisible;
}

export function pushAfter(rhythm: Rhythm, cadence: Cadence): number | null {
  if (cadence === "manual") return null;
  return cadence === "hourly" ? HOUR : rhythm.pushDebounce;
}
