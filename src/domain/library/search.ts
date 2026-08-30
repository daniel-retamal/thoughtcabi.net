import {
  isFolder,
  isNote,
  type Folder,
  type Library,
  type NodeId,
  type Note,
} from "@/domain/model";
import type { CategoryLabels } from "@/i18n/copy";
import { eachNode } from "./tree";

export type Located<T> = T & { shelfId: NodeId };

export interface SearchResults {
  notes: Located<Note>[];
  folders: Located<Folder>[];
}

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function foldForSearch(value: string): string {
  return value.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

export function noteHaystack(note: Note, labels: CategoryLabels): string {
  return foldForSearch(
    [note.title, note.description, note.domain, note.siteName, labels[note.cat], note.tag]
      .map((part) => part ?? "")
      .join(" "),
  );
}

export function noteMatches(note: Note, query: string, labels: CategoryLabels): boolean {
  return noteHaystack(note, labels).includes(query);
}

export function searchLibrary(
  library: Library,
  rawQuery: string,
  labels: CategoryLabels,
): SearchResults {
  const query = foldForSearch(rawQuery.trim());
  const results: SearchResults = { notes: [], folders: [] };
  if (!query) return results;

  eachNode(library, (node, shelf) => {
    if (isFolder(node)) {
      if (foldForSearch(node.name).includes(query)) {
        results.folders.push({ ...node, shelfId: shelf.id });
      }
    } else if (isNote(node) && noteMatches(node, query, labels)) {
      results.notes.push({ ...node, shelfId: shelf.id });
    }
  });

  return results;
}

export function notesWithTag(library: Library, tagName: string): Located<Note>[] {
  const notes: Located<Note>[] = [];
  eachNode(library, (node, shelf) => {
    if (isNote(node) && node.tag === tagName) {
      notes.push({ ...node, shelfId: shelf.id });
    }
  });
  return notes;
}
