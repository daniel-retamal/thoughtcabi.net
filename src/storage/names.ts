import type { Copy } from "@/i18n/copy";

export interface CabinetNames {
  seedShelf: string;
  untitledShelf: string;
  untitledFolder: string;
}

export function cabinetNames(copy: Copy): CabinetNames {
  return {
    seedShelf: copy.seed.shelfName,
    untitledShelf: copy.fallback.untitledShelf,
    untitledFolder: copy.fallback.untitledFolder,
  };
}
