import { describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./keys";
import { watchStorage } from "./watch";

function remoteChange(key: string | null, newValue: string | null, area: Storage = localStorage) {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue, storageArea: area }));
}

describe("watchStorage", () => {
  it("reports a change to the watched key", () => {
    const seen = vi.fn();
    const stop = watchStorage(STORAGE_KEYS.cabinet, seen);

    remoteChange(STORAGE_KEYS.cabinet, "fresh");

    expect(seen).toHaveBeenCalledWith("fresh");
    stop();
  });

  it("ignores other keys and other storage areas", () => {
    const seen = vi.fn();
    const stop = watchStorage(STORAGE_KEYS.cabinet, seen);

    remoteChange(STORAGE_KEYS.preferences, "fresh");
    remoteChange(STORAGE_KEYS.cabinet, "fresh", sessionStorage);

    expect(seen).not.toHaveBeenCalled();
    stop();
  });

  it("reports a null value when another tab clears storage outright", () => {
    const seen = vi.fn();
    const stop = watchStorage(STORAGE_KEYS.cabinet, seen);

    remoteChange(null, null);

    expect(seen).toHaveBeenCalledWith(null);
    stop();
  });

  it("stops reporting once unsubscribed", () => {
    const seen = vi.fn();
    watchStorage(STORAGE_KEYS.cabinet, seen)();

    remoteChange(STORAGE_KEYS.cabinet, "fresh");

    expect(seen).not.toHaveBeenCalled();
  });
});
