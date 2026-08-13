import { describe, expect, it } from "vitest";
import { makeFolder, makeNote, makeShelf, makeTag } from "@/test/factories";
import { collectNotes } from "@/domain/library/tree";
import type { Cabinet } from "@/domain/model";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { mergeCabinets, sameName } from "./mergeCabinets";

const [RED, AMBER, YELLOW] = TAG_PALETTE;

function base(): Cabinet {
  return {
    library: [
      makeShelf("Reading", [makeNote({ id: "mine", title: "Mine" })], "ch-reading"),
      makeShelf("Research", [], "ch-research"),
    ],
    tags: [makeTag("To read", RED)],
  };
}

function taggedNote(tag: string) {
  return makeNote({ id: `note-${tag}`, title: tag, tag });
}

describe("mergeCabinets", () => {
  it("pours a shelf whose name is already taken into the one that has it", () => {
    const merged = mergeCabinets(base(), {
      library: [makeShelf("Reading", [makeNote({ id: "theirs", title: "Theirs" })], "ch-x")],
      tags: [],
    });

    expect(merged.library).toHaveLength(2);
    expect(merged.library[0]?.children.map((node) => node.id)).toEqual(["mine", "theirs"]);
  });

  it("matches a shelf name whatever its case or padding", () => {
    const merged = mergeCabinets(base(), {
      library: [makeShelf("  reading ", [makeNote({ id: "theirs" })], "ch-x")],
      tags: [],
    });

    expect(merged.library).toHaveLength(2);
    expect(merged.library[0]?.name).toBe("Reading");
  });

  it("adds a shelf whose name is new", () => {
    const merged = mergeCabinets(base(), {
      library: [makeShelf("Recipes", [makeNote({ id: "theirs" })], "ch-x")],
      tags: [],
    });

    expect(merged.library.map((shelf) => shelf.name)).toEqual([
      "Reading",
      "Research",
      "Recipes",
    ]);
  });

  it("folds two arriving shelves that share a name into one", () => {
    const merged = mergeCabinets(base(), {
      library: [
        makeShelf("Recipes", [makeNote({ id: "one" })], "ch-x"),
        makeShelf("Recipes", [makeNote({ id: "two" })], "ch-y"),
      ],
      tags: [],
    });

    expect(merged.library).toHaveLength(3);
    expect(merged.library[2]?.children.map((node) => node.id)).toEqual(["one", "two"]);
  });

  it("keeps folders and everything under them intact", () => {
    const merged = mergeCabinets(base(), {
      library: [
        makeShelf("Recipes", [makeFolder("Bread", [makeNote({ id: "deep" })], "f-x")], "ch-x"),
      ],
      tags: [],
    });

    expect(merged.library[2]?.children[0]).toMatchObject({ type: "folder", name: "Bread" });
    expect(collectNotes(merged.library[2]!).map((note) => note.id)).toEqual(["deep"]);
  });

  it("keeps the tag it already has when an arriving one shares its name", () => {
    const merged = mergeCabinets(base(), {
      library: [makeShelf("Recipes", [taggedNote("To read")], "ch-x")],
      tags: [makeTag("To read", AMBER)],
    });

    expect(merged.tags).toEqual([{ name: "To read", color: RED }]);
    expect(collectNotes(merged.library[2]!)[0]?.tag).toBe("To read");
  });

  it("gives an arriving tag a free color when its own is spoken for", () => {
    const merged = mergeCabinets(base(), {
      library: [makeShelf("Recipes", [taggedNote("Later")], "ch-x")],
      tags: [makeTag("Later", RED)],
    });

    expect(merged.tags).toEqual([
      { name: "To read", color: RED },
      { name: "Later", color: AMBER },
    ]);
    expect(collectNotes(merged.library[2]!)[0]?.tag).toBe("Later");
  });

  it("keeps an arriving tag's own color when nothing else claims it", () => {
    const merged = mergeCabinets(base(), {
      library: [makeShelf("Recipes", [taggedNote("Later")], "ch-x")],
      tags: [makeTag("Later", YELLOW)],
    });

    expect(merged.tags[1]).toEqual({ name: "Later", color: YELLOW });
  });

  it("drops a tag the palette has no room for, and clears it from its cards", () => {
    const full: Cabinet = {
      library: [makeShelf("Reading", [], "ch-reading")],
      tags: TAG_PALETTE.map((color, index) => makeTag(`Tag ${index}`, color)),
    };

    const merged = mergeCabinets(full, {
      library: [makeShelf("Recipes", [taggedNote("Ninth")], "ch-x")],
      tags: [makeTag("Ninth", RED)],
    });

    expect(merged.tags).toHaveLength(TAG_PALETTE.length);
    expect(collectNotes(merged.library[1]!)[0]?.tag).toBe("");
  });

  it("clears a tag an arriving card carries without its cabinet listing it", () => {
    const merged = mergeCabinets(base(), {
      library: [makeShelf("Recipes", [taggedNote("Ghost")], "ch-x")],
      tags: [],
    });

    expect(merged.tags).toEqual([{ name: "To read", color: RED }]);
    expect(collectNotes(merged.library[2]!)[0]?.tag).toBe("");
  });

  it("leaves the cabinet it merged into untouched", () => {
    const original = base();
    const snapshot = JSON.stringify(original);

    mergeCabinets(original, {
      library: [makeShelf("Reading", [makeNote({ id: "theirs" })], "ch-x")],
      tags: [makeTag("Later", AMBER)],
    });

    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe("sameName", () => {
  it("ignores case and surrounding space", () => {
    expect(sameName("  Reading ", "reading")).toBe(true);
    expect(sameName("Reading", "Research")).toBe(false);
  });
});
