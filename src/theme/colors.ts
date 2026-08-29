import type { Appearance, CardSurface } from "@/domain/model";

export interface ThemeColor {
  id: string;
  label: string;
  field: string;
  paper: string;
  plate: string;
  light?: true;
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
      {
        id: "ultramarine",
        label: "Ultramarine",
        field: "#101C86",
        paper: "#F2ECDE",
        plate: "#1D2CA1",
      },
      { id: "cobalt", label: "Cobalt", field: "#0F1A6B", paper: "#F1EBDC", plate: "#1B2893" },
      { id: "navy", label: "Navy", field: "#0D2350", paper: "#F3EFE4", plate: "#19366A" },
      { id: "midnight", label: "Midnight", field: "#0B1026", paper: "#EFEADC", plate: "#171D3F" },
    ],
  },
  {
    id: "green",
    label: "Green",
    colors: [
      { id: "emerald", label: "Emerald", field: "#00603A", paper: "#F3EBDD", plate: "#078050" },
      { id: "viridian", label: "Viridian", field: "#0D4A34", paper: "#F2EADB", plate: "#197050" },
      { id: "forest", label: "Forest", field: "#0F3B2C", paper: "#F3EEE4", plate: "#1B5340" },
      { id: "pine", label: "Pine", field: "#0A2018", paper: "#F0E9DB", plate: "#16382C" },
    ],
  },
  {
    id: "mono",
    label: "Mono",
    colors: [
      {
        id: "paper",
        label: "Paper",
        field: "#F7F5F0",
        paper: "#FFFFFF",
        plate: "#1C1B19",
        light: true,
      },
      {
        id: "linen",
        label: "Linen",
        field: "#E6E2DA",
        paper: "#FBFAF7",
        plate: "#22211E",
        light: true,
      },
      { id: "graphite", label: "Graphite", field: "#2A2A2C", paper: "#F2F0EA", plate: "#3A3A3E" },
      { id: "onyx", label: "Onyx", field: "#0C0C0D", paper: "#F0EEE8", plate: "#1A1A1E" },
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
  root.setAttribute("data-field", colorById(appearance.color).light ? "light" : "dark");
}
