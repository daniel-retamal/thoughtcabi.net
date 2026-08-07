import { describe, expect, it } from "vitest";
import { parseLibrary, parseTags, parseViewMode } from "./parsers";

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

  it("rejects anything that is not a non-empty array of channels", () => {
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
      cover: null,
    });
  });

  it("keeps pending placeholders intact", () => {
    const node = parseLibrary([
      { id: "c", name: "C", children: [{ id: "p", type: "note", loading: true }] },
    ])?.[0]?.children[0];
    expect(node).toEqual({ id: "p", type: "note", loading: true });
  });

  it("drops children that carry no id", () => {
    const channel = parseLibrary([{ id: "c", name: "C", children: [{ type: "note" }, 7, null] }]);
    expect(channel?.[0]?.children).toEqual([]);
  });

  it("preserves a hand-added image but not an empty one", () => {
    const withImage = parseLibrary([
      { id: "c", name: "C", children: [{ id: "n", image: "data:x" }] },
    ]);
    expect(withImage?.[0]?.children[0]).toHaveProperty("image", "data:x");

    const withoutImage = parseLibrary([{ id: "c", name: "C", children: [{ id: "n", image: "" }] }]);
    expect(withoutImage?.[0]?.children[0]).not.toHaveProperty("image");
  });

  it("normalizes an unrecognized category", () => {
    const note = parseLibrary([
      { id: "c", name: "C", children: [{ id: "n", cat: "weird", cover: { cat: "weird" } }] },
    ])?.[0]?.children[0];
    expect(note).toMatchObject({ cat: "link", cover: { cat: "link", color: "#888", glyph: "•" } });
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
