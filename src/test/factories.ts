import type { Channel, Folder, Library, LibraryNode, Note, Tag } from "@/domain/model";
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

export function makeFolder(name: string, children: LibraryNode[] = [], id?: string): Folder {
  return { id: id ?? nextId("f"), type: "folder", name, children };
}

export function makeChannel(
  name: string,
  children: LibraryNode[] = [],
  id?: string,
  icon: IconName = "hash",
): Channel {
  return { id: id ?? nextId("ch"), name, icon, children };
}

export function makeTag(name: string, color: string): Tag {
  return { name, color };
}

export function makeLibrary(): Library {
  return [
    makeChannel(
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
      "channel-reading",
    ),
    makeChannel(
      "Research",
      [makeNote({ id: "note-c", title: "Zettelkasten", tag: "Reference" })],
      "channel-research",
    ),
  ];
}
