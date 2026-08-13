import { eachNode } from "@/domain/library/tree";
import { isFolder, isNote, type Library, type Tag } from "@/domain/model";

export interface CabinetSummary {
  shelves: number;
  folders: number;
  notes: number;
  tags: number;
}

export function summarizeCabinet(library: Library, tags: readonly Tag[]): CabinetSummary {
  let folders = 0;
  let notes = 0;

  eachNode(library, (node) => {
    if (isFolder(node)) folders += 1;
    else if (isNote(node)) notes += 1;
  });

  return { shelves: library.length, folders, notes, tags: tags.length };
}
