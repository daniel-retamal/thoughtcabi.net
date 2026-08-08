import type { Appearance, CardSurface } from "@/domain/model";

export interface ThemeColor {
  id: string;
  label: string;
  field: string;
  cream: string;
}

export interface ColorFamily {
  id: string;
  label: string;
  colors: readonly [ThemeColor, ...ThemeColor[]];
}

export const COLOR_FAMILIES: readonly [ColorFamily, ...ColorFamily[]] = [
  {
    id: "blue",
    label: "Blue",
    colors: [
      { id: "ultramarine", label: "Ultramarine", field: "#101C86", cream: "#F2ECDE" },
      { id: "cobalt", label: "Cobalt", field: "#0F1A6B", cream: "#F1EBDC" },
      { id: "navy", label: "Navy", field: "#0D2350", cream: "#F3EFE4" },
      { id: "midnight", label: "Midnight", field: "#0B1026", cream: "#EFEADC" },
    ],
  },
  {
    id: "green",
    label: "Green",
    colors: [
      { id: "emerald", label: "Emerald", field: "#00603A", cream: "#F3EBDD" },
      { id: "viridian", label: "Viridian", field: "#0D4A34", cream: "#F2EADB" },
      { id: "forest", label: "Forest", field: "#0F3B2C", cream: "#F3EEE4" },
      { id: "pine", label: "Pine", field: "#0A2018", cream: "#F0E9DB" },
    ],
  },
];

export const THEME_COLORS: readonly ThemeColor[] = COLOR_FAMILIES.flatMap(
  (family) => family.colors,
);

const RENAMED_COLOR_IDS: Record<string, string> = {
  bento: "ultramarine",
  halo: "cobalt",
  sapphire: "navy",
  ink: "midnight",
};

export const DEFAULT_APPEARANCE: Appearance = { color: "ultramarine", cards: "cream" };

export function colorById(id: string): ThemeColor {
  return THEME_COLORS.find((color) => color.id === id) ?? COLOR_FAMILIES[0].colors[0];
}

export function familyOfColor(id: string): ColorFamily {
  return (
    COLOR_FAMILIES.find((family) => family.colors.some((color) => color.id === id)) ??
    COLOR_FAMILIES[0]
  );
}

export function toColorId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = RENAMED_COLOR_IDS[value] ?? value;
  return THEME_COLORS.some((color) => color.id === id) ? id : null;
}

export function toCardSurface(value: unknown): CardSurface | null {
  if (value === "cream") return "cream";
  if (value === "color" || value === "blue") return "color";
  return null;
}

export function applyAppearance(appearance: Appearance, root: HTMLElement): void {
  root.setAttribute("data-color", appearance.color);
  root.setAttribute("data-card-surface", appearance.cards);
}
