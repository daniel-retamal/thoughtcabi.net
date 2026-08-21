import type { Folder, Library, LibraryNode, Note, PendingNote, Shelf, Tag } from "@/domain/model";
import type { IconName } from "@/icons/names";

let counter = 0;

function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}${counter}`;
}

export function resetFactories(): void {
  counter = 0;
}

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? nextId("n"),
    type: "note",
    title: "A saved page",
    description: "",
    tag: "",
    addedAt: 1_700_000_000_000,
    url: "https://example.com/a",
    domain: "example.com",
    siteName: "Example",
    cat: "link",
    catLabel: "Link",
    ...overrides,
  };
}

export function makePendingNote(overrides: Partial<PendingNote> = {}): PendingNote {
  return {
    id: overrides.id ?? nextId("n"),
    type: "note",
    url: "https://example.com/loading",
    addedAt: 1_700_000_000_000,
    loading: true,
    ...overrides,
  };
}

export function makeFolder(name: string, children: LibraryNode[] = [], id?: string): Folder {
  return { id: id ?? nextId("f"), type: "folder", name, children };
}

export function makeShelf(
  name: string,
  children: LibraryNode[] = [],
  id?: string,
  icon: IconName = "hash",
): Shelf {
  return { id: id ?? nextId("ch"), name, icon, children };
}

export function makeTag(name: string, color: string): Tag {
  return { name, color };
}

export function makeLibrary(): Library {
  return [
    makeShelf(
      "Reading",
      [
        makeFolder(
          "Essays",
          [
            makeNote({ id: "note-a", title: "On Rereading", tag: "To read" }),
            makeNote({ id: "note-b", title: "The Index Card" }),
          ],
          "folder-essays",
        ),
        makeFolder("Empty", [], "folder-empty"),
        makeNote({ id: "note-loose", title: "Loose note" }),
      ],
      "shelf-reading",
    ),
    makeShelf(
      "Research",
      [makeNote({ id: "note-c", title: "Zettelkasten", tag: "Reference" })],
      "shelf-research",
    ),
  ];
}
