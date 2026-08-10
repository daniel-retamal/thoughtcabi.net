import {
  isFolder,
  isNote,
  isPendingNote,
  type Channel,
  type Folder,
  type Library,
  type LibraryLocation,
  type LibraryNode,
  type Note,
  type NoteEntry,
  type NodeId,
  type PendingNote,
} from "@/domain/model";

export type Container = Channel | Folder;

export class EmptyLibraryError extends Error {
  constructor() {
    super("The library must always contain at least one channel");
    this.name = "EmptyLibraryError";
  }
}

export function firstChannel(library: Library): Channel {
  const [channel] = library;
  if (!channel) throw new EmptyLibraryError();
  return channel;
}

export function isCabinetEmpty(library: Library): boolean {
  return library.every((channel) => channel.children.length === 0);
}

export function findChannel(library: Library, channelId: NodeId): Channel | undefined {
  return library.find((channel) => channel.id === channelId);
}

export function requireChannel(library: Library, channelId: NodeId): Channel {
  return findChannel(library, channelId) ?? firstChannel(library);
}

export function containerAtPath(root: Container, path: readonly NodeId[]): Container {
  let container: Container = root;
  for (const segment of path) {
    const next = container.children.find(
      (child): child is Folder => child.id === segment && isFolder(child),
    );
    if (!next) break;
    container = next;
  }
  return container;
}

export function containerAt(library: Library, location: LibraryLocation): Container {
  return containerAtPath(requireChannel(library, location.channelId), location.path);
}

export function pathToFolder(root: Container, folderId: NodeId): NodeId[] {
  const walk = (container: Container, trail: NodeId[]): NodeId[] | null => {
    for (const child of container.children) {
      if (!isFolder(child)) continue;
      const nextTrail = [...trail, child.id];
      if (child.id === folderId) return nextTrail;
      const found = walk(child, nextTrail);
      if (found) return found;
    }
    return null;
  };
  return walk(root, []) ?? [];
}

export function eachNode(
  library: Library,
  visit: (node: LibraryNode, channel: Channel, path: NodeId[]) => void,
): void {
  for (const channel of library) {
    const walk = (container: Container, path: NodeId[]): void => {
      for (const child of container.children) {
        visit(child, channel, path);
        if (isFolder(child)) walk(child, [...path, child.id]);
      }
    };
    walk(channel, []);
  }
}

export function findNode(library: Library, nodeId: NodeId): LibraryNode | undefined {
  let found: LibraryNode | undefined;
  eachNode(library, (node) => {
    if (node.id === nodeId) found = node;
  });
  return found;
}

export function findFolder(library: Library, folderId: NodeId): Folder | undefined {
  const node = findNode(library, folderId);
  return node && isFolder(node) ? node : undefined;
}

export function locateNode(library: Library, nodeId: NodeId): LibraryLocation | undefined {
  let location: LibraryLocation | undefined;
  eachNode(library, (node, channel, path) => {
    if (node.id === nodeId) location = { channelId: channel.id, path };
  });
  return location;
}

export function locateFolder(
  library: Library,
  folderId: NodeId,
): { location: LibraryLocation; name: string } | null {
  for (const channel of library) {
    const path = pathToFolder(channel, folderId);
    if (path.length > 0 && path[path.length - 1] === folderId) {
      return {
        location: { channelId: channel.id, path },
        name: containerAtPath(channel, path).name,
      };
    }
  }
  return null;
}

export interface NodePlacement {
  location: LibraryLocation;
  index: number;
  node: LibraryNode;
}

function placementWithin(
  container: Container,
  location: LibraryLocation,
  nodeId: NodeId,
): NodePlacement | null {
  const index = container.children.findIndex((child) => child.id === nodeId);
  const node = container.children[index];
  if (node) return { location, index, node };

  for (const child of container.children) {
    if (!isFolder(child)) continue;
    const nested = { channelId: location.channelId, path: [...location.path, child.id] };
    const found = placementWithin(child, nested, nodeId);
    if (found) return found;
  }

  return null;
}

export function placementOf(library: Library, nodeId: NodeId): NodePlacement | null {
  for (const channel of library) {
    const found = placementWithin(channel, { channelId: channel.id, path: [] }, nodeId);
    if (found) return found;
  }
  return null;
}

export interface PendingPlacement {
  node: PendingNote;
  location: LibraryLocation;
}

export function pendingPlacements(library: Library): PendingPlacement[] {
  const placements: PendingPlacement[] = [];
  eachNode(library, (node, channel, path) => {
    if (isPendingNote(node)) {
      placements.push({ node, location: { channelId: channel.id, path } });
    }
  });
  return placements;
}

export function parentContainerName(library: Library, nodeId: NodeId): string | undefined {
  let name: string | undefined;
  for (const channel of library) {
    const walk = (container: Container, containerName: string): void => {
      for (const child of container.children) {
        if (child.id === nodeId) name = containerName;
        else if (isFolder(child)) walk(child, child.name);
      }
    };
    walk(channel, channel.name);
  }
  return name;
}

export function collectNotes(container: Container): Note[] {
  const notes: Note[] = [];
  const walk = (node: Container): void => {
    for (const child of node.children) {
      if (isFolder(child)) walk(child);
      else if (isNote(child)) notes.push(child);
    }
  };
  walk(container);
  return notes;
}

export interface ChildCounts {
  notes: number;
  folders: number;
}

export function directCounts(container: Container): ChildCounts {
  let notes = 0;
  let folders = 0;
  for (const child of container.children) {
    if (isFolder(child)) folders += 1;
    else notes += 1;
  }
  return { notes, folders };
}

export function splitChildren(container: Container): {
  folders: Folder[];
  notes: NoteEntry[];
} {
  const folders: Folder[] = [];
  const notes: NoteEntry[] = [];
  for (const child of container.children) {
    if (isFolder(child)) folders.push(child);
    else notes.push(child);
  }
  return { folders, notes };
}

export function folderContains(folder: Folder, nodeId: NodeId): boolean {
  for (const child of folder.children) {
    if (child.id === nodeId) return true;
    if (isFolder(child) && folderContains(child, nodeId)) return true;
  }
  return false;
}
