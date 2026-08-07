import {
  isFolder,
  isNote,
  isPendingNote,
  type Channel,
  type Folder,
  type Library,
  type LibraryLocation,
  type LibraryNode,
  type NodeId,
  type Note,
} from "@/domain/model";
import { containerAtPath, findChannel, findNode, pathToFolder } from "./tree";

type NotePatch = Partial<Note> | null;

function mapChildren(
  nodes: readonly LibraryNode[],
  transform: (nodes: readonly LibraryNode[]) => LibraryNode[],
): LibraryNode[] {
  return nodes.map((node) =>
    isFolder(node) ? { ...node, children: transform(node.children) } : node,
  );
}

function withChannelChildren(
  library: Library,
  transform: (nodes: readonly LibraryNode[]) => LibraryNode[],
): Library {
  return library.map((channel) => ({ ...channel, children: transform(channel.children) }));
}

export function insertAt(
  library: Library,
  location: LibraryLocation,
  node: LibraryNode,
  index = 0,
): Library {
  const insertInto = (nodes: readonly LibraryNode[]): LibraryNode[] => {
    const next = [...nodes];
    next.splice(Math.min(Math.max(index, 0), next.length), 0, node);
    return next;
  };

  const channel = findChannel(library, location.channelId);
  if (!channel) return library;

  const targetId = containerAtPath(channel, location.path).id;

  if (targetId === channel.id) {
    return library.map((entry) =>
      entry.id === channel.id ? { ...entry, children: insertInto(entry.children) } : entry,
    );
  }

  const descend = (nodes: readonly LibraryNode[]): LibraryNode[] =>
    nodes.map((child) => {
      if (!isFolder(child)) return child;
      if (child.id === targetId) return { ...child, children: insertInto(child.children) };
      return { ...child, children: descend(child.children) };
    });

  return library.map((entry) =>
    entry.id === channel.id ? { ...entry, children: descend(entry.children) } : entry,
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
  return withChannelChildren(library, prune);
}

export function withoutPendingNotes(library: Library): Library {
  const prune = (nodes: readonly LibraryNode[]): LibraryNode[] =>
    mapChildren(
      nodes.filter((node) => !isPendingNote(node)),
      prune,
    );
  return withChannelChildren(library, prune);
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
  return withChannelChildren(library, replace);
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
  return withChannelChildren(library, apply);
}

export function moveIntoFolder(library: Library, nodeId: NodeId, folderId: NodeId): Library {
  if (nodeId === folderId) return library;

  const node = findNode(library, nodeId);
  if (!node) return library;

  const detached = removeNode(library, nodeId);
  const stillExists = detached.some(
    (channel) => pathToFolder(channel, folderId).at(-1) === folderId,
  );
  if (!stillExists) return library;

  const insertInto = (nodes: readonly LibraryNode[]): LibraryNode[] =>
    nodes.map((child) => {
      if (!isFolder(child)) return child;
      if (child.id === folderId) return { ...child, children: [node, ...child.children] };
      return { ...child, children: insertInto(child.children) };
    });

  return withChannelChildren(detached, insertInto);
}

export function moveToLocation(
  library: Library,
  nodeId: NodeId,
  location: LibraryLocation,
): Library {
  const node = findNode(library, nodeId);
  if (!node) return library;
  if (!findChannel(library, location.channelId)) return library;

  return insertAt(removeNode(library, nodeId), location, node, 0);
}

export function reorderWithinLocation(
  library: Library,
  location: LibraryLocation,
  nodeId: NodeId,
  beforeId: NodeId | null,
): Library {
  const node = findNode(library, nodeId);
  const channel = findChannel(library, location.channelId);
  if (!node || !channel) return library;

  const detached = removeNode(library, nodeId);
  const target = containerAtPath(
    findChannel(detached, location.channelId) ?? channel,
    location.path,
  );
  const siblings = target.children;
  const beforeIndex = beforeId == null ? -1 : siblings.findIndex((c) => c.id === beforeId);
  const index = beforeIndex < 0 ? siblings.length : beforeIndex;

  return insertAt(detached, location, node, index);
}

export function reorderChannels(
  library: Library,
  channelId: NodeId,
  beforeId: NodeId | null,
): Library {
  const index = library.findIndex((channel) => channel.id === channelId);
  if (index < 0) return library;

  const next = [...library];
  const [moved] = next.splice(index, 1);
  if (!moved) return library;

  const beforeIndex = beforeId == null ? -1 : next.findIndex((c) => c.id === beforeId);
  next.splice(beforeIndex < 0 ? next.length : beforeIndex, 0, moved);
  return next;
}

export function addChannel(library: Library, channel: Channel): Library {
  return [...library, channel];
}

export function updateChannel(
  library: Library,
  channelId: NodeId,
  changes: Partial<Pick<Channel, "name" | "icon">>,
): Library {
  return library.map((channel) =>
    channel.id === channelId ? { ...channel, ...changes } : channel,
  );
}

export function removeChannel(library: Library, channelId: NodeId): Library {
  const remaining = library.filter((channel) => channel.id !== channelId);
  return remaining.length > 0 ? remaining : library;
}

export function createFolder(id: NodeId, name: string): Folder {
  return { id, type: "folder", name, children: [] };
}
