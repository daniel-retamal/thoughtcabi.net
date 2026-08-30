import { describe, expect, it } from "vitest";
import { EN_NAMES } from "@/test/factories";
import * as parsers from "./parsers";
import { parsePreferences, parseTags, parseViewMode } from "./parsers";

const parseLibrary = (value: unknown) => parsers.parseLibrary(value, EN_NAMES);
const parseCabinet = (value: unknown) => parsers.parseCabinet(value, EN_NAMES);

describe("parseLibrary", () => {
  it("accepts a well-formed library", () => {
    const library = parseLibrary([
      {
        id: "c1",
        name: "Reading",
        icon: "book-open",
        children: [
          { id: "f1", type: "folder", name: "Essays", children: [{ id: "n1", type: "note" }] },
        ],
      },
    ]);
    expect(library).toHaveLength(1);
    expect(library?.[0]?.icon).toBe("book-open");
  });

  it("rejects anything that is not a non-empty array of shelves", () => {
    expect(parseLibrary(null)).toBeNull();
    expect(parseLibrary("nope")).toBeNull();
    expect(parseLibrary([])).toBeNull();
    expect(parseLibrary([{ name: "no id" }])).toBeNull();
  });

  it("falls back to a safe icon for unknown values", () => {
    expect(parseLibrary([{ id: "c", name: "C", icon: "not-an-icon" }])?.[0]?.icon).toBe("hash");
  });

  it("fills in missing note fields rather than dropping the note", () => {
    const note = parseLibrary([{ id: "c", name: "C", children: [{ id: "n" }] }])?.[0]?.children[0];
    expect(note).toMatchObject({
      id: "n",
      type: "note",
      title: "",
      description: "",
      tag: "",
      url: "",
      cat: "link",
    });
    expect(note).not.toHaveProperty("siteImage");
    expect(note).not.toHaveProperty("favicon");
  });

  it("keeps pending placeholders intact, url and all", () => {
    const node = parseLibrary([
      {
        id: "c",
        name: "C",
        children: [
          {
            id: "p",
            type: "note",
            url: "https://example.com/x",
            addedAt: 1_700_000_000_000,
            loading: true,
          },
        ],
      },
    ])?.[0]?.children[0];
    expect(node).toEqual({
      id: "p",
      type: "note",
      url: "https://example.com/x",
      addedAt: 1_700_000_000_000,
      loading: true,
    });
  });

  it("drops children that carry no id", () => {
    const shelf = parseLibrary([{ id: "c", name: "C", children: [{ type: "note" }, 7, null] }]);
    expect(shelf?.[0]?.children).toEqual([]);
  });

  it("preserves a hand-added image but not an empty one", () => {
    const withImage = parseLibrary([
      { id: "c", name: "C", children: [{ id: "n", image: "data:x" }] },
    ]);
    expect(withImage?.[0]?.children[0]).toHaveProperty("image", "data:x");

    const withoutImage = parseLibrary([{ id: "c", name: "C", children: [{ id: "n", image: "" }] }]);
    expect(withoutImage?.[0]?.children[0]).not.toHaveProperty("image");
  });

  it("keeps the site's own image and favicon apart from the user's", () => {
    const note = parseLibrary([
      {
        id: "c",
        name: "C",
        children: [
          {
            id: "n",
            image: "data:user",
            siteImage: "https://example.com/og.png",
            favicon: "https://example.com/favicon.ico",
          },
        ],
      },
    ])?.[0]?.children[0];
    expect(note).toMatchObject({
      image: "data:user",
      siteImage: "https://example.com/og.png",
      favicon: "https://example.com/favicon.ico",
    });
  });

  it("drops a cover left over from an older save", () => {
    const note = parseLibrary([
      { id: "c", name: "C", children: [{ id: "n", cover: { color: "#888", glyph: "E" } }] },
    ])?.[0]?.children[0];
    expect(note).not.toHaveProperty("cover");
  });

  it("normalizes an unrecognized category", () => {
    const note = parseLibrary([{ id: "c", name: "C", children: [{ id: "n", cat: "weird" }] }])?.[0]
      ?.children[0];
    expect(note).toMatchObject({ cat: "link" });
  });

  it("keeps the category of a note saved under the old discussion name", () => {
    const note = parseLibrary([{ id: "c", name: "C", children: [{ id: "n", cat: "hn" }] }])?.[0]
      ?.children[0];
    expect(note).toMatchObject({ cat: "forum" });
  });
});

describe("parseTags", () => {
  it("keeps only complete tags", () => {
    expect(parseTags([{ name: "a", color: "red" }, { name: "b" }, { color: "blue" }, 3])).toEqual([
      { name: "a", color: "red" },
    ]);
  });

  it("rejects a non-array", () => {
    expect(parseTags({})).toBeNull();
  });
});

describe("parseViewMode", () => {
  it("accepts only the two known views", () => {
    expect(parseViewMode("grid")).toBe("grid");
    expect(parseViewMode("list")).toBe("list");
    expect(parseViewMode("gallery")).toBeNull();
    expect(parseViewMode(null)).toBeNull();
  });
});

describe("parseCabinet", () => {
  it("reads the library and tags out of one value", () => {
    const cabinet = parseCabinet({
      library: [{ id: "c", name: "C", children: [] }],
      tags: [{ name: "Later", color: "red" }],
    });
    expect(cabinet?.library).toHaveLength(1);
    expect(cabinet?.tags).toEqual([{ name: "Later", color: "red" }]);
  });

  it("rejects anything without a usable library", () => {
    expect(parseCabinet(null)).toBeNull();
    expect(parseCabinet([])).toBeNull();
    expect(parseCabinet({ tags: [] })).toBeNull();
    expect(parseCabinet({ library: [] })).toBeNull();
  });

  it("accepts a library whose tags are missing or unusable", () => {
    expect(parseCabinet({ library: [{ id: "c", name: "C" }] })?.tags).toEqual([]);
    expect(parseCabinet({ library: [{ id: "c", name: "C" }], tags: "nope" })?.tags).toEqual([]);
  });
});

describe("parsePreferences", () => {
  it("accepts a complete value", () => {
    expect(
      parsePreferences({
        view: "list",
        color: "emerald",
        cards: "color",
        sidebar: "rail",
        onboarded: true,
      }),
    ).toEqual({
      view: "list",
      color: "emerald",
      cards: "color",
      sidebar: "rail",
      sidebarWidth: 268,
      language: "en",
      onboarded: true,
    });
  });

  it("carries a save made under the old color names over to the new ones", () => {
    expect(parsePreferences({ view: "grid", palette: "sapphire", cards: "blue" })).toEqual({
      view: "grid",
      color: "navy",
      cards: "color",
      sidebar: "wide",
      sidebarWidth: 268,
      language: "en",
      onboarded: false,
    });
    expect(parsePreferences({ palette: "bento" })?.color).toBe("ultramarine");
    expect(parsePreferences({ palette: "halo" })?.color).toBe("cobalt");
    expect(parsePreferences({ palette: "ink" })?.color).toBe("midnight");
  });

  it("defaults each field it cannot use", () => {
    expect(parsePreferences({})).toEqual({
      view: "grid",
      color: "ultramarine",
      cards: "cream",
      sidebar: "wide",
      sidebarWidth: 268,
      language: "en",
      onboarded: false,
    });
    expect(
      parsePreferences({ view: "list", color: "chartreuse", sidebar: "narrow", onboarded: "yes" }),
    ).toEqual({
      view: "list",
      color: "ultramarine",
      cards: "cream",
      sidebar: "wide",
      sidebarWidth: 268,
      language: "en",
      onboarded: false,
    });
  });

  it("clamps a dragged width back into the range the shell can render", () => {
    expect(parsePreferences({ sidebarWidth: 900 })?.sidebarWidth).toBe(380);
    expect(parsePreferences({ sidebarWidth: 40 })?.sidebarWidth).toBe(242);
    expect(parsePreferences({ sidebarWidth: "wide" })?.sidebarWidth).toBe(268);
    expect(parsePreferences({ sidebarWidth: 310 })?.sidebarWidth).toBe(310);
  });

  it("rejects anything that is not a record", () => {
    expect(parsePreferences(null)).toBeNull();
    expect(parsePreferences("grid")).toBeNull();
    expect(parsePreferences([])).toBeNull();
  });

  it("keeps English when the stored language is missing or unusable", () => {
    expect(parsePreferences({})?.language).toBe("en");
    expect(parsePreferences({ language: "fr" })?.language).toBe("en");
    expect(parsePreferences({ language: 7 })?.language).toBe("en");
  });

  it("takes a language it recognises", () => {
    expect(parsePreferences({ language: "es" })?.language).toBe("es");
  });
});
