import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { STORAGE_KEYS } from "@/storage/keys";
import { usePreferences } from "./usePreferences";

function remoteWrite(value: string): void {
  act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEYS.preferences,
        newValue: value,
        storageArea: localStorage,
      }),
    );
  });
}

describe("usePreferences", () => {
  it("starts from the defaults and paints them onto the document", () => {
    const { result } = renderHook(() => usePreferences());

    expect(result.current.preferences).toEqual({
      view: "grid",
      palette: "bento",
      cards: "cream",
    });
    expect(document.documentElement).toHaveAttribute("data-azul", "bento");
    expect(document.documentElement).toHaveAttribute("data-card-surface", "cream");
  });

  it("persists the view and the appearance to the same key", () => {
    const { result } = renderHook(() => usePreferences());

    act(() => result.current.setView("list"));
    act(() => result.current.updateAppearance({ palette: "ink" }));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.preferences) ?? "null")).toEqual({
      view: "list",
      palette: "ink",
      cards: "cream",
    });
  });

  it("keeps a remote palette change when this tab changes the view", () => {
    const { result } = renderHook(() => usePreferences());

    remoteWrite(JSON.stringify({ view: "grid", palette: "sapphire", cards: "blue" }));
    act(() => result.current.setView("list"));

    expect(result.current.preferences).toEqual({
      view: "list",
      palette: "sapphire",
      cards: "blue",
    });
  });

  it("applies an adopted palette to the document", () => {
    renderHook(() => usePreferences());

    remoteWrite(JSON.stringify({ view: "grid", palette: "halo", cards: "blue" }));

    expect(document.documentElement).toHaveAttribute("data-azul", "halo");
    expect(document.documentElement).toHaveAttribute("data-card-surface", "blue");
  });
});
