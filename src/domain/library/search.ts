import {
  isFolder,
  isNote,
  type Folder,
  type Library,
  type NodeId,
  type Note,
} from "@/domain/model";
import { eachNode } from "./tree";

export type Located<T> = T & { channelId: NodeId };

export interface SearchResults {
  notes: Located<Note>[];
  folders: Located<Folder>[];
}

export function noteHaystack(note: Note): string {
  return [note.title, note.description, note.domain, note.siteName, note.catLabel, note.tag]
    .map((part) => part ?? "")
    .join(" ")
    .toLowerCase();
}

export function noteMatches(note: Note, query: string): boolean {
  return noteHaystack(note).includes(query);
}

export function searchLibrary(library: Library, rawQuery: string): SearchResults {
  const query = rawQuery.trim().toLowerCase();
  const results: SearchResults = { notes: [], folders: [] };
  if (!query) return results;

  eachNode(library, (node, channel) => {
    if (isFolder(node)) {
      if (node.name.toLowerCase().includes(query)) {
        results.folders.push({ ...node, channelId: channel.id });
      }
    } else if (isNote(node) && noteMatches(node, query)) {
      results.notes.push({ ...node, channelId: channel.id });
    }
  });

  return results;
}

export function notesWithTag(library: Library, tagName: string): Located<Note>[] {
  const notes: Located<Note>[] = [];
  eachNode(library, (node, channel) => {
    if (isNote(node) && node.tag === tagName) {
      notes.push({ ...node, channelId: channel.id });
    }
  });
  return notes;
}
