import { STORAGE_KEYS } from "@/storage/keys";
import { readJson, writeJson } from "@/storage/localStore";

export interface AzulPalette {
  id: string;
  label: string;
  field: string;
  cream: string;
}

export type CardSurface = "cream" | "blue";

export interface Appearance {
  palette: string;
  cards: CardSurface;
}

export const AZUL_PALETTES: readonly [AzulPalette, ...AzulPalette[]] = [
  { id: "bento", label: "Bento", field: "#101C86", cream: "#F2ECDE" },
  { id: "halo", label: "Halo", field: "#0F1A6B", cream: "#F1EBDC" },
  { id: "sapphire", label: "Sapphire", field: "#0D2350", cream: "#F3EFE4" },
  { id: "ink", label: "Ink", field: "#0B1026", cream: "#EFEADC" },
];

export const DEFAULT_APPEARANCE: Appearance = { palette: "bento", cards: "cream" };

export function paletteById(id: string): AzulPalette {
  return AZUL_PALETTES.find((palette) => palette.id === id) ?? AZUL_PALETTES[0];
}

function parseAppearance(value: unknown): Appearance | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const palette = AZUL_PALETTES.some((entry) => entry.id === record.palette)
    ? (record.palette as string)
    : DEFAULT_APPEARANCE.palette;
  const cards: CardSurface =
    record.cards === "cream" || record.cards === "blue" ? record.cards : DEFAULT_APPEARANCE.cards;
  return { palette, cards };
}

export function loadAppearance(): Appearance {
  return readJson(STORAGE_KEYS.appearance, parseAppearance) ?? { ...DEFAULT_APPEARANCE };
}

export function saveAppearance(appearance: Appearance): void {
  writeJson(STORAGE_KEYS.appearance, appearance);
}

export function applyAppearance(appearance: Appearance, root: HTMLElement): void {
  root.setAttribute("data-azul", appearance.palette);
  root.setAttribute("data-card-surface", appearance.cards);
}
