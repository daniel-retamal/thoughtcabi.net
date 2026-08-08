import type { StorageKey } from "./keys";

export type WriteOutcome = "ok" | "quota" | "unavailable";

const QUOTA_ERROR_NAMES = new Set(["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"]);
const QUOTA_ERROR_CODES = new Set([22, 1014]);

const lastWritten = new Map<StorageKey, string>();

export function storageArea(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return (
    (typeof name === "string" && QUOTA_ERROR_NAMES.has(name)) ||
    (typeof code === "number" && QUOTA_ERROR_CODES.has(code))
  );
}

export function readRaw(key: StorageKey): string | null {
  const store = storageArea();
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key: StorageKey, value: string): WriteOutcome {
  const store = storageArea();
  if (!store) return "unavailable";
  try {
    store.setItem(key, value);
    lastWritten.set(key, value);
    return "ok";
  } catch (error) {
    return isQuotaError(error) ? "quota" : "unavailable";
  }
}

export function clearKey(key: StorageKey): void {
  const store = storageArea();
  if (!store) return;
  try {
    store.removeItem(key);
    lastWritten.delete(key);
  } catch {
    return;
  }
}

export function parseJson<T>(raw: string | null, parse: (value: unknown) => T | null): T | null {
  if (raw === null) return null;
  try {
    return parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function readJson<T>(key: StorageKey, parse: (value: unknown) => T | null): T | null {
  return parseJson(readRaw(key), parse);
}

export function writeJson(key: StorageKey, value: unknown): WriteOutcome {
  try {
    return writeRaw(key, JSON.stringify(value));
  } catch {
    return "unavailable";
  }
}

export function isSelfWrite(key: StorageKey, raw: string | null): boolean {
  return raw !== null && lastWritten.get(key) === raw;
}

export function forgetSelfWrites(): void {
  lastWritten.clear();
}
