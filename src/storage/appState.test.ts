import { beforeEach, describe, expect, it } from "vitest";
import { makeLibrary, makeTag } from "@/test/factories";
import { STORAGE_KEYS } from "./keys";
import {
  DEFAULT_VIEW_MODE,
  loadLibrary,
  loadTags,
  loadViewMode,
  saveLibrary,
  saveTags,
  saveViewMode,
} from "./appState";

describe("app state persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("never writes a placeholder that is still being read", () => {
    const library = makeLibrary();
    library[0]?.children.push({
      id: "pending",
      type: "note",
      url: "https://example.com/in-flight",
      loading: true,
    });

    saveLibrary(library);

    expect(localStorage.getItem(STORAGE_KEYS.library)).not.toContain("in-flight");
    expect(loadLibrary()[0]?.children.some((node) => node.id === "pending")).toBe(false);
  });

  it("round-trips the library", () => {
    const library = makeLibrary();
    saveLibrary(library);
    expect(loadLibrary()).toEqual(library);
  });

  it("seeds a library when storage is empty", () => {
    const library = loadLibrary();
    expect(library.length).toBeGreaterThan(0);
    expect(library[0]?.name).toBe("Reading");
  });

  it("seeds a library when storage holds junk", () => {
    localStorage.setItem(STORAGE_KEYS.library, "{not json");
    expect(loadLibrary().length).toBeGreaterThan(0);

    localStorage.setItem(STORAGE_KEYS.library, "[]");
    expect(loadLibrary().length).toBeGreaterThan(0);
  });

  it("round-trips tags and seeds them when absent", () => {
    expect(loadTags().map((tag) => tag.name)).toContain("To read");

    const tags = [makeTag("Later", "red")];
    saveTags(tags);
    expect(loadTags()).toEqual(tags);
  });

  it("stores the view mode as a bare string for backwards compatibility", () => {
    saveViewMode("list");
    expect(localStorage.getItem(STORAGE_KEYS.view)).toBe("list");
    expect(loadViewMode()).toBe("list");
  });

  it("falls back to the default view mode", () => {
    expect(loadViewMode()).toBe(DEFAULT_VIEW_MODE);
    localStorage.setItem(STORAGE_KEYS.view, "gallery");
    expect(loadViewMode()).toBe(DEFAULT_VIEW_MODE);
  });
});
