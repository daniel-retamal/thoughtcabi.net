import { describe, expect, it } from "vitest";
import {
  COLOR_FAMILIES,
  THEME_COLORS,
  colorById,
  familyOfColor,
  toCardSurface,
  toColorId,
} from "./colors";

describe("COLOR_FAMILIES", () => {
  it("runs one ladder per family, the same depth on each", () => {
    const depths = COLOR_FAMILIES.map((family) => family.colors.length);
    expect(COLOR_FAMILIES.map((family) => family.id)).toEqual(["blue", "green"]);
    expect(new Set(depths).size).toBe(1);
  });

  it("gives every depth its own id and its own field", () => {
    expect(new Set(THEME_COLORS.map((color) => color.id)).size).toBe(THEME_COLORS.length);
    expect(new Set(THEME_COLORS.map((color) => color.field)).size).toBe(THEME_COLORS.length);
  });

  it("darkens down each ladder", () => {
    for (const family of COLOR_FAMILIES) {
      const steps = family.colors.map((color) => luminance(color.field));
      expect([...steps].sort((a, b) => b - a)).toEqual(steps);
    }
  });
});

function luminance(field: string): number {
  const channels = [1, 3, 5].map((at) => Number.parseInt(field.slice(at, at + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

describe("colorById", () => {
  it("falls back to the first color rather than throwing", () => {
    expect(colorById("emerald").label).toBe("Emerald");
    expect(colorById("chartreuse").id).toBe("ultramarine");
  });
});

describe("familyOfColor", () => {
  it("names the family a depth belongs to", () => {
    expect(familyOfColor("navy").label).toBe("Blue");
    expect(familyOfColor("pine").label).toBe("Green");
    expect(familyOfColor("chartreuse").label).toBe("Blue");
  });
});

describe("toColorId", () => {
  it("keeps a save made under the old names", () => {
    expect(toColorId("bento")).toBe("ultramarine");
    expect(toColorId("halo")).toBe("cobalt");
    expect(toColorId("sapphire")).toBe("navy");
    expect(toColorId("ink")).toBe("midnight");
  });

  it("rejects what it does not know", () => {
    expect(toColorId("chartreuse")).toBeNull();
    expect(toColorId(7)).toBeNull();
  });
});

describe("toCardSurface", () => {
  it("reads the surface a save made before green called the color one", () => {
    expect(toCardSurface("blue")).toBe("color");
    expect(toCardSurface("color")).toBe("color");
    expect(toCardSurface("cream")).toBe("cream");
    expect(toCardSurface("green")).toBeNull();
  });
});
