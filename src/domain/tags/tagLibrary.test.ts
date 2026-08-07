import { describe, expect, it } from "vitest";
import type { Tag } from "@/domain/model";
import { MAX_TAGS, TAG_PALETTE } from "./palette";
import {
  addTag,
  availableColors,
  canAddTag,
  findTag,
  isPaletteFull,
  recolorTag,
  removeTag,
  renameTag,
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
  it("excludes colours already in use", () => {
    const colors = availableColors([{ name: "a", color: RED }]);
    expect(colors).not.toContain(RED);
    expect(colors).toHaveLength(MAX_TAGS - 1);
  });

  it("keeps the tag's own colour available while editing", () => {
    expect(availableColors([{ name: "a", color: RED }], RED)).toContain(RED);
  });
});

describe("addTag", () => {
  it("adds a named tag on a free colour", () => {
    expect(addTag([], "  To read  ", RED)).toEqual([{ name: "To read", color: RED }]);
  });

  it("refuses a duplicate colour", () => {
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

  it("recolours only the matching tag", () => {
    expect(recolorTag(tags, "Reference", RED)[1]?.color).toBe(RED);
  });

  it("removes only the matching tag", () => {
    expect(removeTag(tags, "To read")).toEqual([{ name: "Reference", color: AMBER }]);
  });

  it("leaves the input arrays alone", () => {
    const snapshot = JSON.stringify(tags);
    renameTag(tags, "To read", "Later");
    recolorTag(tags, "Reference", RED);
    removeTag(tags, "To read");
    expect(JSON.stringify(tags)).toBe(snapshot);
  });
});
