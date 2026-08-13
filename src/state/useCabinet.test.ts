import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { makeLibrary, makeNote, makeShelf, makeTag } from "@/test/factories";
import { STORAGE_KEYS } from "@/storage/keys";
import { useCabinet } from "./useCabinet";

function remoteWrite(value: string | null): void {
  act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEYS.cabinet,
        newValue: value,
        storageArea: localStorage,
      }),
    );
  });
}

describe("useCabinet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports a healthy write", () => {
    const { result } = renderHook(() => useCabinet());
    expect(result.current.storageStatus).toBe("ok");
  });

  it("surfaces a refused write instead of swallowing it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });

    const { result } = renderHook(() => useCabinet());
    expect(result.current.storageStatus).toBe("quota");
  });

  it("adopts what another tab wrote", () => {
    const { result } = renderHook(() => useCabinet());

    remoteWrite(
      JSON.stringify({
        library: [makeShelf("Remote", [makeNote({ id: "remote-note" })], "shelf-remote")],
        tags: [makeTag("Remote tag", "red")],
      }),
    );

    expect(result.current.cabinet.library.map((shelf) => shelf.name)).toEqual(["Remote"]);
    expect(result.current.cabinet.tags.map((tag) => tag.name)).toEqual(["Remote tag"]);
  });

  it("ignores the echo of its own write", () => {
    const { result } = renderHook(() => useCabinet());
    const before = result.current.cabinet;

    remoteWrite(localStorage.getItem(STORAGE_KEYS.cabinet));

    expect(result.current.cabinet).toBe(before);
  });

  it("holds its ground when another tab writes something unreadable", () => {
    const { result } = renderHook(() => useCabinet());
    const before = result.current.cabinet;

    remoteWrite("{not json");
    remoteWrite(null);

    expect(result.current.cabinet).toBe(before);
  });

  it("stops listening once unmounted", () => {
    const { result, unmount } = renderHook(() => useCabinet());
    const before = result.current.cabinet;
    unmount();

    remoteWrite(JSON.stringify({ library: makeLibrary(), tags: [] }));

    expect(result.current.cabinet).toBe(before);
  });
});
