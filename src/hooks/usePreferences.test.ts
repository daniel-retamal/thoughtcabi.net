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
      color: "ultramarine",
      cards: "cream",
    });
    expect(document.documentElement).toHaveAttribute("data-color", "ultramarine");
    expect(document.documentElement).toHaveAttribute("data-card-surface", "cream");
  });

  it("persists the view and the appearance to the same key", () => {
    const { result } = renderHook(() => usePreferences());

    act(() => result.current.setView("list"));
    act(() => result.current.updateAppearance({ color: "midnight" }));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.preferences) ?? "null")).toEqual({
      view: "list",
      color: "midnight",
      cards: "cream",
    });
  });

  it("keeps a remote color change when this tab changes the view", () => {
    const { result } = renderHook(() => usePreferences());

    remoteWrite(JSON.stringify({ view: "grid", color: "emerald", cards: "color" }));
    act(() => result.current.setView("list"));

    expect(result.current.preferences).toEqual({
      view: "list",
      color: "emerald",
      cards: "color",
    });
  });

  it("applies an adopted color to the document", () => {
    renderHook(() => usePreferences());

    remoteWrite(JSON.stringify({ view: "grid", color: "viridian", cards: "color" }));

    expect(document.documentElement).toHaveAttribute("data-color", "viridian");
    expect(document.documentElement).toHaveAttribute("data-card-surface", "color");
  });
});
