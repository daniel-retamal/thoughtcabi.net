import { afterEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./keys";
import { clearKey, isSelfWrite, readJson, readRaw, writeJson, writeRaw } from "./localStore";

function throwOnWrite(error: unknown): void {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw error;
  });
}

describe("write outcomes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports a successful write", () => {
    expect(writeRaw(STORAGE_KEYS.preferences, "x")).toBe("ok");
  });

  it("recognizes a quota failure by name", () => {
    throwOnWrite(new DOMException("full", "QuotaExceededError"));
    expect(writeRaw(STORAGE_KEYS.cabinet, "x")).toBe("quota");
  });

  it("recognizes Firefox's quota failure", () => {
    throwOnWrite(Object.assign(new Error("full"), { name: "NS_ERROR_DOM_QUOTA_REACHED" }));
    expect(writeRaw(STORAGE_KEYS.cabinet, "x")).toBe("quota");

    throwOnWrite(Object.assign(new Error("full"), { code: 1014 }));
    expect(writeRaw(STORAGE_KEYS.cabinet, "x")).toBe("quota");
  });

  it("treats any other failure as unavailable storage", () => {
    throwOnWrite(new DOMException("denied", "SecurityError"));
    expect(writeRaw(STORAGE_KEYS.cabinet, "x")).toBe("unavailable");
  });

  it("reports unavailable rather than throwing on unserializable values", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(writeJson(STORAGE_KEYS.cabinet, cyclic)).toBe("unavailable");
  });
});

describe("reads", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for a key that was never written", () => {
    expect(readRaw(STORAGE_KEYS.cabinet)).toBeNull();
  });

  it("degrades to null rather than throwing on unreadable storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(readRaw(STORAGE_KEYS.cabinet)).toBeNull();
  });

  it("degrades to null on malformed JSON", () => {
    localStorage.setItem(STORAGE_KEYS.cabinet, "{not json");
    expect(readJson(STORAGE_KEYS.cabinet, (value) => value)).toBeNull();
  });
});

describe("isSelfWrite", () => {
  it("recognizes the exact value this tab last wrote", () => {
    writeRaw(STORAGE_KEYS.cabinet, "mine");
    expect(isSelfWrite(STORAGE_KEYS.cabinet, "mine")).toBe(true);
    expect(isSelfWrite(STORAGE_KEYS.cabinet, "theirs")).toBe(false);
    expect(isSelfWrite(STORAGE_KEYS.cabinet, null)).toBe(false);
  });

  it("keeps each key's last write apart", () => {
    writeRaw(STORAGE_KEYS.cabinet, "shared");
    expect(isSelfWrite(STORAGE_KEYS.preferences, "shared")).toBe(false);
  });

  it("forgets a key once it is cleared", () => {
    writeRaw(STORAGE_KEYS.cabinet, "mine");
    clearKey(STORAGE_KEYS.cabinet);
    expect(isSelfWrite(STORAGE_KEYS.cabinet, "mine")).toBe(false);
  });
});
