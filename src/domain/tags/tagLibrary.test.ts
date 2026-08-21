import { describe, expect, it } from "vitest";
import type { Tag } from "@/domain/model";
import { MAX_TAGS, TAG_PALETTE } from "./palette";
import {
  addTag,
  availableColors,
  canAddTag,
  findTag,
  insertTag,
  isPaletteFull,
  recolorTag,
  removeTag,
  renameTag,
  reorderTags,
} from "./tagLibrary";

const RED = TAG_PALETTE[0];
const AMBER = TAG_PALETTE[1];

function fullPalette(): Tag[] {
  return TAG_PALETTE.map((color, index) => ({ name: `tag-${index}`, color }));
}

describe("findTag", () => {
  it("looks a tag up by name", () => {
    const tags = [{ name: "To read", color: RED }];
    expect(findTag(tags, "To read")?.color).toBe(RED);
    expect(findTag(tags, "Missing")).toBeUndefined();
    expect(findTag(tags, null)).toBeUndefined();
    expect(findTag(tags, "")).toBeUndefined();
  });
});

describe("availableColors", () => {
  it("excludes colors already in use", () => {
    const colors = availableColors([{ name: "a", color: RED }]);
    expect(colors).not.toContain(RED);
    expect(colors).toHaveLength(MAX_TAGS - 1);
  });

  it("keeps the tag's own color available while editing", () => {
    expect(availableColors([{ name: "a", color: RED }], RED)).toContain(RED);
  });
});

describe("addTag", () => {
  it("adds a named tag on a free color", () => {
    expect(addTag([], "  To read  ", RED)).toEqual([{ name: "To read", color: RED }]);
  });

  it("refuses a duplicate color", () => {
    const tags = [{ name: "a", color: RED }];
    expect(addTag(tags, "b", RED)).toEqual(tags);
  });

  it("refuses a duplicate name regardless of case", () => {
    const tags = [{ name: "To read", color: RED }];
    expect(addTag(tags, "to read", AMBER)).toEqual(tags);
  });

  it("refuses an empty name and refuses to exceed the palette", () => {
    expect(addTag([], "   ", RED)).toEqual([]);
    expect(addTag(fullPalette(), "one more", RED)).toHaveLength(MAX_TAGS);
    expect(isPaletteFull(fullPalette())).toBe(true);
    expect(canAddTag(fullPalette(), "x", RED)).toBe(false);
  });
});

describe("renameTag, recolorTag and removeTag", () => {
  const tags = [
    { name: "To read", color: RED },
    { name: "Reference", color: AMBER },
  ];

  it("renames only the matching tag", () => {
    expect(renameTag(tags, "To read", "Later")).toEqual([
      { name: "Later", color: RED },
      { name: "Reference", color: AMBER },
    ]);
  });

  it("recolors only the matching tag", () => {
    expect(recolorTag(tags, "Reference", RED)[1]?.color).toBe(RED);
  });

  it("removes only the matching tag", () => {
    expect(removeTag(tags, "To read")).toEqual([{ name: "Reference", color: AMBER }]);
  });

  it("puts a removed tag back in the place it held", () => {
    const without = removeTag(tags, "To read");
    expect(insertTag(without, 0, { name: "To read", color: RED })).toEqual(tags);
  });

  it("will not insert a name that is already there", () => {
    expect(insertTag(tags, 0, { name: "Reference", color: RED })).toEqual(tags);
  });

  it("leaves the input arrays alone", () => {
    const snapshot = JSON.stringify(tags);
    renameTag(tags, "To read", "Later");
    recolorTag(tags, "Reference", RED);
    removeTag(tags, "To read");
    expect(JSON.stringify(tags)).toBe(snapshot);
  });
});

describe("reorderTags", () => {
  const tags = [
    { name: "To read", color: RED },
    { name: "Reference", color: AMBER },
    { name: "Later", color: TAG_PALETTE[2] },
  ];

  const names = (list: readonly Tag[]): string[] => list.map((tag) => tag.name);

  it("moves a tag in front of the one it was dropped on", () => {
    expect(names(reorderTags(tags, "Later", "Reference"))).toEqual([
      "To read",
      "Later",
      "Reference",
    ]);
  });

  it("sends a tag to the end when nothing follows the drop", () => {
    expect(names(reorderTags(tags, "To read", null))).toEqual(["Reference", "Later", "To read"]);
  });

  it("appends rather than losing a tag when the anchor is unknown", () => {
    expect(names(reorderTags(tags, "To read", "Gone"))).toEqual(["Reference", "Later", "To read"]);
  });

  it("leaves the list alone when the tag itself is unknown", () => {
    expect(names(reorderTags(tags, "Gone", "Reference"))).toEqual(names(tags));
  });

  it("leaves the input array alone", () => {
    const snapshot = JSON.stringify(tags);
    reorderTags(tags, "Later", "To read");
    expect(JSON.stringify(tags)).toBe(snapshot);
  });
});
