import type { Appearance, CardSurface } from "@/domain/model";

export interface AzulPalette {
  id: string;
  label: string;
  field: string;
  cream: string;
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

export function isPaletteId(value: unknown): value is string {
  return typeof value === "string" && AZUL_PALETTES.some((palette) => palette.id === value);
}

export function isCardSurface(value: unknown): value is CardSurface {
  return value === "cream" || value === "blue";
}

export function applyAppearance(appearance: Appearance, root: HTMLElement): void {
  root.setAttribute("data-azul", appearance.palette);
  root.setAttribute("data-card-surface", appearance.cards);
}
