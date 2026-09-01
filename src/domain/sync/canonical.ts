import {
  isFolder,
  isNote,
  isPendingNote,
  type Cabinet,
  type LibraryNode,
  type Note,
  type Shelf,
  type Tag,
} from "@/domain/model";

type Fields = (string | number)[];

function noteFields(note: Note): Fields {
  return [
    "note",
    note.id,
    note.title,
    note.description,
    note.tag,
    note.addedAt,
    note.url,
    note.domain,
    note.siteName,
    note.cat,
    note.catLabel,
    note.image ?? "",
    note.siteImage ?? "",
    note.favicon ?? "",
  ];
}

function nodeFields(node: LibraryNode): Fields {
  if (isFolder(node)) return ["folder", node.id, node.name];
  return isNote(node) ? noteFields(node) : ["pending", node.id, node.url, node.addedAt];
}

function shelfFields(shelf: Shelf): Fields {
  return ["shelf", shelf.id, shelf.name, shelf.icon];
}

function tagFields(tag: Tag): Fields {
  return [tag.name, tag.color];
}

function branches(nodes: readonly LibraryNode[]): unknown[] {
  return nodes
    .filter((node) => !isPendingNote(node))
    .map((node) =>
      isFolder(node) ? [...nodeFields(node), branches(node.children)] : nodeFields(node),
    );
}

export function nodeFingerprint(node: LibraryNode): string {
  return JSON.stringify(nodeFields(node));
}

export function shelfFingerprint(shelf: Shelf): string {
  return JSON.stringify(shelfFields(shelf));
}

export function canonicalCabinet(cabinet: Cabinet): string {
  return JSON.stringify([
    cabinet.library.map((shelf) => [...shelfFields(shelf), branches(shelf.children)]),
    cabinet.tags.map(tagFields),
  ]);
}
