import { beforeEach, describe, expect, it } from "vitest";
import { makeLibrary, makeTag } from "@/test/factories";
import { LEGACY_KEYS, STORAGE_KEYS } from "./keys";
import {
  DEFAULT_PREFERENCES,
  loadCabinet,
  loadPreferences,
  saveCabinet,
  savePreferences,
} from "./appState";

describe("the cabinet", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips the library and tags as one value", () => {
    const cabinet = { library: makeLibrary(), tags: [makeTag("Later", "red")] };
    expect(saveCabinet(cabinet)).toBe("ok");
    expect(loadCabinet()).toEqual(cabinet);
  });

  it("never writes a placeholder that is still being read", () => {
    const library = makeLibrary();
    library[0]?.children.push({
      id: "pending",
      type: "note",
      url: "https://example.com/in-flight",
      loading: true,
    });

    saveCabinet({ library, tags: [] });

    expect(localStorage.getItem(STORAGE_KEYS.cabinet)).not.toContain("in-flight");
    expect(loadCabinet().library[0]?.children.some((node) => node.id === "pending")).toBe(false);
  });

  it("seeds when storage is empty", () => {
    const { library, tags } = loadCabinet();
    expect(library[0]?.name).toBe("Reading");
    expect(tags.map((tag) => tag.name)).toContain("To read");
  });

  it("keeps the bytes it could not parse before seeding over them", () => {
    localStorage.setItem(STORAGE_KEYS.cabinet, "{not json");

    expect(loadCabinet().library.length).toBeGreaterThan(0);
    expect(localStorage.getItem(STORAGE_KEYS.quarantine)).toBe("{not json");
  });

  it("quarantines a well-formed value that holds no channels", () => {
    localStorage.setItem(STORAGE_KEYS.cabinet, '{"library":[],"tags":[]}');

    expect(loadCabinet().library.length).toBeGreaterThan(0);
    expect(localStorage.getItem(STORAGE_KEYS.quarantine)).toBe('{"library":[],"tags":[]}');
  });

  it("leaves no quarantine behind when storage was simply empty", () => {
    loadCabinet();
    expect(localStorage.getItem(STORAGE_KEYS.quarantine)).toBeNull();
  });
});

describe("migrating from the four original keys", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("folds the old library and tags into the cabinet and drops the old keys", () => {
    const library = makeLibrary();
    const tags = [makeTag("Later", "red")];
    localStorage.setItem(LEGACY_KEYS.library, JSON.stringify(library));
    localStorage.setItem(LEGACY_KEYS.tags, JSON.stringify(tags));

    expect(loadCabinet()).toEqual({ library, tags });
    expect(localStorage.getItem(STORAGE_KEYS.cabinet)).toContain("On Rereading");
    expect(localStorage.getItem(LEGACY_KEYS.library)).toBeNull();
    expect(localStorage.getItem(LEGACY_KEYS.tags)).toBeNull();
  });

  it("seeds the half that is missing rather than losing the half that is there", () => {
    localStorage.setItem(LEGACY_KEYS.tags, JSON.stringify([makeTag("Later", "red")]));

    const { library, tags } = loadCabinet();
    expect(library[0]?.name).toBe("Reading");
    expect(tags).toEqual([makeTag("Later", "red")]);
  });

  it("reads the view mode back out of its bare string and drops the old keys", () => {
    localStorage.setItem(LEGACY_KEYS.view, "list");
    localStorage.setItem(LEGACY_KEYS.appearance, '{"palette":"ink","cards":"blue"}');

    expect(loadPreferences()).toEqual({ view: "list", color: "midnight", cards: "color" });
    expect(localStorage.getItem(LEGACY_KEYS.view)).toBeNull();
    expect(localStorage.getItem(LEGACY_KEYS.appearance)).toBeNull();
  });

  it("defaults the axis that has no legacy value", () => {
    localStorage.setItem(LEGACY_KEYS.view, "list");
    expect(loadPreferences()).toEqual({ ...DEFAULT_PREFERENCES, view: "list" });
  });

  it("does not run once the new keys exist", () => {
    localStorage.setItem(LEGACY_KEYS.view, "list");
    savePreferences({ ...DEFAULT_PREFERENCES, color: "cobalt" });

    expect(loadPreferences().view).toBe(DEFAULT_PREFERENCES.view);
    expect(localStorage.getItem(LEGACY_KEYS.view)).toBe("list");
  });
});

describe("preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips as one JSON value", () => {
    const preferences = { view: "list", color: "forest", cards: "color" } as const;
    expect(savePreferences(preferences)).toBe("ok");
    expect(loadPreferences()).toEqual(preferences);
  });

  it("falls back to the defaults when storage is empty", () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it("repairs each field on its own rather than discarding the whole value", () => {
    localStorage.setItem(
      STORAGE_KEYS.preferences,
      '{"view":"gallery","color":"chartreuse","cards":"color"}',
    );

    expect(loadPreferences()).toEqual({
      view: DEFAULT_PREFERENCES.view,
      color: DEFAULT_PREFERENCES.color,
      cards: "color",
    });
  });
});
