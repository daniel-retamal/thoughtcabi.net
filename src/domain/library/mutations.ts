import {
  isFolder,
  isNote,
  isPendingNote,
  type Folder,
  type Library,
  type LibraryLocation,
  type LibraryNode,
  type NodeId,
  type Note,
  type Shelf,
} from "@/domain/model";
import { containerAtPath, findNode, findShelf, pathToFolder } from "./tree";

type NotePatch = Partial<Note> | null;

function mapChildren(
  nodes: readonly LibraryNode[],
  transform: (nodes: readonly LibraryNode[]) => LibraryNode[],
): LibraryNode[] {
  return nodes.map((node) =>
    isFolder(node) ? { ...node, children: transform(node.children) } : node,
  );
}

function withShelfChildren(
  library: Library,
  transform: (nodes: readonly LibraryNode[]) => LibraryNode[],
): Library {
  return library.map((shelf) => ({ ...shelf, children: transform(shelf.children) }));
}

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length);
}

export function insertAt(
  library: Library,
  location: LibraryLocation,
  node: LibraryNode,
  index = 0,
): Library {
  const insertInto = (nodes: readonly LibraryNode[]): LibraryNode[] => {
    const next = [...nodes];
    next.splice(clampIndex(index, next.length), 0, node);
    return next;
  };

  const shelf = findShelf(library, location.shelfId);
  if (!shelf) return library;

  const targetId = containerAtPath(shelf, location.path).id;

  if (targetId === shelf.id) {
    return library.map((entry) =>
      entry.id === shelf.id ? { ...entry, children: insertInto(entry.children) } : entry,
    );
  }

  const descend = (nodes: readonly LibraryNode[]): LibraryNode[] =>
    nodes.map((child) => {
      if (!isFolder(child)) return child;
      if (child.id === targetId) return { ...child, children: insertInto(child.children) };
      return { ...child, children: descend(child.children) };
    });

  return library.map((entry) =>
    entry.id === shelf.id ? { ...entry, children: descend(entry.children) } : entry,
  );
}

export function addChild(library: Library, location: LibraryLocation, node: LibraryNode): Library {
  return insertAt(library, location, node, 0);
}

export function removeNode(library: Library, nodeId: NodeId): Library {
  const prune = (nodes: readonly LibraryNode[]): LibraryNode[] =>
    mapChildren(
      nodes.filter((node) => node.id !== nodeId),
      prune,
    );
  return withShelfChildren(library, prune);
}

export function withoutPendingNotes(library: Library): Library {
  const prune = (nodes: readonly LibraryNode[]): LibraryNode[] =>
    mapChildren(
      nodes.filter((node) => !isPendingNote(node)),
      prune,
    );
  return withShelfChildren(library, prune);
}

export function replaceNode(
  library: Library,
  nodeId: NodeId,
  update: (node: LibraryNode) => LibraryNode,
): Library {
  const replace = (nodes: readonly LibraryNode[]): LibraryNode[] =>
    nodes.map((node) => {
      if (node.id === nodeId) return update(node);
      return isFolder(node) ? { ...node, children: replace(node.children) } : node;
    });
  return withShelfChildren(library, replace);
}

export function renameFolder(library: Library, folderId: NodeId, name: string): Library {
  return replaceNode(library, folderId, (node) => (isFolder(node) ? { ...node, name } : node));
}

export function patchNotes(library: Library, patch: (note: Note) => NotePatch): Library {
  const apply = (nodes: readonly LibraryNode[]): LibraryNode[] =>
    nodes.map((node) => {
      if (isFolder(node)) return { ...node, children: apply(node.children) };
      if (!isNote(node)) return node;
      const changes = patch(node);
      return changes ? { ...node, ...changes } : node;
    });
  return withShelfChildren(library, apply);
}

export function moveIntoFolder(library: Library, nodeId: NodeId, folderId: NodeId): Library {
  if (nodeId === folderId) return library;

  const node = findNode(library, nodeId);
  if (!node) return library;

  const detached = removeNode(library, nodeId);
  const stillExists = detached.some(
    (shelf) => pathToFolder(shelf, folderId).at(-1) === folderId,
  );
  if (!stillExists) return library;

  const insertInto = (nodes: readonly LibraryNode[]): LibraryNode[] =>
    nodes.map((child) => {
      if (!isFolder(child)) return child;
      if (child.id === folderId) return { ...child, children: [node, ...child.children] };
      return { ...child, children: insertInto(child.children) };
    });

  return withShelfChildren(detached, insertInto);
}

export function moveToLocation(
  library: Library,
  nodeId: NodeId,
  location: LibraryLocation,
): Library {
  const node = findNode(library, nodeId);
  if (!node) return library;
  if (!findShelf(library, location.shelfId)) return library;

  return insertAt(removeNode(library, nodeId), location, node, 0);
}

export function reorderWithinLocation(
  library: Library,
  location: LibraryLocation,
  nodeId: NodeId,
  beforeId: NodeId | null,
): Library {
  const node = findNode(library, nodeId);
  const shelf = findShelf(library, location.shelfId);
  if (!node || !shelf) return library;

  const detached = removeNode(library, nodeId);
  const target = containerAtPath(
    findShelf(detached, location.shelfId) ?? shelf,
    location.path,
  );
  const siblings = target.children;
  const beforeIndex = beforeId == null ? -1 : siblings.findIndex((c) => c.id === beforeId);
  const index = beforeIndex < 0 ? siblings.length : beforeIndex;

  return insertAt(detached, location, node, index);
}

export function reorderShelves(
  library: Library,
  shelfId: NodeId,
  beforeId: NodeId | null,
): Library {
  const index = library.findIndex((shelf) => shelf.id === shelfId);
  if (index < 0) return library;

  const next = [...library];
  const [moved] = next.splice(index, 1);
  if (!moved) return library;

  const beforeIndex = beforeId == null ? -1 : next.findIndex((c) => c.id === beforeId);
  next.splice(beforeIndex < 0 ? next.length : beforeIndex, 0, moved);
  return next;
}

export function addShelf(library: Library, shelf: Shelf): Library {
  return [...library, shelf];
}

export function insertShelf(library: Library, index: number, shelf: Shelf): Library {
  const next = [...library];
  next.splice(clampIndex(index, next.length), 0, shelf);
  return next;
}

export function updateShelf(
  library: Library,
  shelfId: NodeId,
  changes: Partial<Pick<Shelf, "name" | "icon">>,
): Library {
  return library.map((shelf) =>
    shelf.id === shelfId ? { ...shelf, ...changes } : shelf,
  );
}

export function removeShelf(library: Library, shelfId: NodeId): Library {
  const remaining = library.filter((shelf) => shelf.id !== shelfId);
  return remaining.length > 0 ? remaining : library;
}

export function createFolder(id: NodeId, name: string): Folder {
  return { id, type: "folder", name, children: [] };
}
