import {
  isFolder,
  isNote,
  isPendingNote,
  type Cabinet,
  type Folder,
  type Library,
  type LibraryNode,
  type NodeId,
  type Shelf,
} from "@/domain/model";
import type { Container } from "@/domain/library/tree";
import type { IdFactory } from "@/domain/transfer/reidentify";
import { nodeFingerprint, shelfFingerprint } from "./canonical";
import { arrivals } from "./arrivals";
import { mergeTags } from "./mergeTags";

export interface MergeReport {
  added: readonly NodeId[];
  updated: readonly NodeId[];
  deleted: number;
  parked: readonly NodeId[];
}

export interface MergeOptions {
  createId: IdFactory;
  conflictsFolder: string;
}

export interface MergeResult {
  cabinet: Cabinet;
  report: MergeReport;
}

type Renaming = ReadonlyMap<string, string>;

interface Placed {
  node: LibraryNode;
  parent: NodeId;
  shelf: NodeId;
}

interface TreeIndex {
  shelves: Shelf[];
  nodes: Map<NodeId, Placed>;
  order: Map<NodeId, NodeId[]>;
}

function indexOf(library: Library): TreeIndex {
  const nodes = new Map<NodeId, Placed>();
  const order = new Map<NodeId, NodeId[]>();

  const walk = (container: Container, shelf: NodeId): void => {
    const ids: NodeId[] = [];
    for (const child of container.children) {
      if (isPendingNote(child)) continue;
      ids.push(child.id);
      nodes.set(child.id, { node: child, parent: container.id, shelf });
      if (isFolder(child)) walk(child, shelf);
    }
    order.set(container.id, ids);
  };

  for (const shelf of library) walk(shelf, shelf.id);
  return { shelves: [...library], nodes, order };
}

function retagged<T extends LibraryNode>(node: T, renaming: Renaming): T {
  if (!isNote(node) || !node.tag) return node;
  return { ...node, tag: renaming.get(node.tag) ?? "" };
}

function unchanged(one?: Placed, other?: Placed): boolean {
  if (!one || !other) return false;
  return nodeFingerprint(one.node) === nodeFingerprint(other.node);
}

function parentFor(base?: Placed, local?: Placed, remote?: Placed): NodeId {
  const survivor = remote ?? local ?? base;
  if (!base) return survivor?.parent ?? "";
  if (remote && remote.parent !== base.parent) return remote.parent;
  if (local && local.parent !== base.parent) return local.parent;
  return survivor?.parent ?? base.parent;
}

function uniqueIds(...groups: Iterable<NodeId>[]): NodeId[] {
  return [...new Set(groups.flatMap((group) => [...group]))];
}

function mergeShelves(base: TreeIndex, local: TreeIndex, remote: TreeIndex): Shelf[] {
  const shelfBy = (index: TreeIndex) => new Map(index.shelves.map((shelf) => [shelf.id, shelf]));
  const inBase = shelfBy(base);
  const inLocal = shelfBy(local);
  const inRemote = shelfBy(remote);

  const chosen = new Map<NodeId, Shelf>();
  for (const id of uniqueIds(inRemote.keys(), inLocal.keys())) {
    const wasThere = inBase.get(id);
    const mine = inLocal.get(id);
    const theirs = inRemote.get(id);

    if (!wasThere) {
      const shelf = theirs ?? mine;
      if (shelf) chosen.set(id, shelf);
      continue;
    }

    const same = (shelf?: Shelf) =>
      shelf !== undefined && shelfFingerprint(shelf) === shelfFingerprint(wasThere);

    if (mine && theirs) chosen.set(id, same(mine) ? theirs : same(theirs) ? mine : theirs);
    else if (mine && !same(mine)) chosen.set(id, mine);
    else if (theirs && !same(theirs)) chosen.set(id, theirs);
  }

  const ordered = orderedBy(
    [...chosen.keys()],
    remote.shelves.map((shelf) => shelf.id),
    local.shelves.map((shelf) => shelf.id),
    base.shelves.map((shelf) => shelf.id),
  )
    .map((id) => chosen.get(id))
    .filter((shelf): shelf is Shelf => shelf !== undefined);

  if (ordered.length > 0) return ordered;
  return remote.shelves.length > 0 ? remote.shelves : local.shelves;
}

function orderedBy(
  members: readonly NodeId[],
  fromRemote: readonly NodeId[],
  fromLocal: readonly NodeId[],
  fromBase: readonly NodeId[],
): NodeId[] {
  const wanted = new Set(members);
  const placed = new Set<NodeId>();
  const result: NodeId[] = [];

  for (const id of fromRemote) {
    if (wanted.has(id) && !placed.has(id)) {
      result.push(id);
      placed.add(id);
    }
  }

  for (const id of uniqueIds(fromLocal, fromBase, members)) {
    if (!wanted.has(id) || placed.has(id)) continue;
    const at = precedingIndex(result, fromLocal, id);
    if (at < 0) result.push(id);
    else result.splice(at + 1, 0, id);
    placed.add(id);
  }

  return result;
}

function precedingIndex(
  result: readonly NodeId[],
  fromLocal: readonly NodeId[],
  id: NodeId,
): number {
  for (let cursor = fromLocal.indexOf(id) - 1; cursor >= 0; cursor -= 1) {
    const previous = fromLocal[cursor];
    const at = previous === undefined ? -1 : result.indexOf(previous);
    if (at >= 0) return at;
  }
  return -1;
}

export function mergeThree(
  base: Cabinet,
  local: Cabinet,
  remote: Cabinet,
  options: MergeOptions,
): MergeResult {
  const wasThere = indexOf(base.library);
  const mine = indexOf(local.library);
  const theirs = indexOf(remote.library);

  const tags = mergeTags(base.tags, local.tags, remote.tags);
  const shelves = mergeShelves(wasThere, mine, theirs);
  const shelfIds = new Set(shelves.map((shelf) => shelf.id));
  const fallbackShelf = shelves[0]?.id ?? "";

  const kept = new Map<NodeId, Placed>();
  const parked: { shelf: NodeId; node: LibraryNode }[] = [];

  for (const id of uniqueIds(theirs.nodes.keys(), mine.nodes.keys(), wasThere.nodes.keys())) {
    const before = wasThere.nodes.get(id);
    const ours = mine.nodes.get(id);
    const yours = theirs.nodes.get(id);

    const take = (side: Placed | undefined, renaming: Renaming): void => {
      if (!side) return;
      kept.set(id, {
        node: retagged(side.node, renaming),
        parent: parentFor(before, ours, yours),
        shelf: side.shelf,
      });
    };

    if (!before) {
      take(yours ?? ours, yours ? tags.fromRemote : tags.fromLocal);
      continue;
    }

    if (!ours && !yours) continue;

    if (!yours) {
      if (!unchanged(ours, before)) take(ours, tags.fromLocal);
      continue;
    }

    if (!ours) {
      if (!unchanged(yours, before)) take(yours, tags.fromRemote);
      continue;
    }

    if (unchanged(ours, before) || unchanged(ours, yours)) {
      take(yours, tags.fromRemote);
      continue;
    }

    if (unchanged(yours, before)) {
      take(ours, tags.fromLocal);
      continue;
    }

    take(yours, tags.fromRemote);
    if (isNote(ours.node)) {
      parked.push({
        shelf: shelfIds.has(ours.shelf) ? ours.shelf : fallbackShelf,
        node: { ...retagged(ours.node, tags.fromLocal), id: options.createId("n") },
      });
    }
  }

  const shelfHolding = (id: NodeId): NodeId => {
    const home = kept.get(id)?.shelf ?? "";
    return shelfIds.has(home) ? home : fallbackShelf;
  };

  const survives = (id: NodeId): boolean => shelfIds.has(id) || isFolderKept(kept, id);

  const settleParents = (): Map<NodeId, NodeId> => {
    const anywhere = (id: NodeId): NodeId | undefined =>
      (theirs.nodes.get(id) ?? mine.nodes.get(id) ?? wasThere.nodes.get(id))?.parent;

    const parents = new Map<NodeId, NodeId>();

    for (const [id, placed] of kept) {
      let parent = placed.parent;
      const seen = new Set<NodeId>([id]);
      while (!survives(parent)) {
        const up = anywhere(parent);
        if (up === undefined || seen.has(up)) break;
        seen.add(parent);
        parent = up;
      }
      parents.set(id, survives(parent) ? parent : shelfHolding(id));
    }

    for (const id of parents.keys()) {
      const seen = new Set<NodeId>();
      let cursor: NodeId | undefined = id;
      while (cursor !== undefined && !shelfIds.has(cursor)) {
        if (seen.has(cursor)) {
          parents.set(id, shelfHolding(id));
          break;
        }
        seen.add(cursor);
        cursor = parents.get(cursor);
      }
    }

    return parents;
  };

  const parents = settleParents();

  const members = new Map<NodeId, NodeId[]>();
  for (const [id, parent] of parents) {
    const group = members.get(parent);
    if (group) group.push(id);
    else members.set(parent, [id]);
  }

  const childrenOf = (container: NodeId): LibraryNode[] =>
    orderedBy(
      members.get(container) ?? [],
      theirs.order.get(container) ?? [],
      mine.order.get(container) ?? [],
      wasThere.order.get(container) ?? [],
    )
      .map((id) => kept.get(id))
      .filter((placed): placed is Placed => placed !== undefined)
      .map(({ node }) => (isFolder(node) ? { ...node, children: childrenOf(node.id) } : node));

  const library: Library = shelves.map((shelf) => ({
    ...shelf,
    children: childrenOf(shelf.id),
  }));

  const cabinet: Cabinet = {
    library: park(library, parked, options),
    tags: tags.tags,
  };

  const deleted = [...mine.nodes.keys()].filter((id) => !kept.has(id)).length;

  return {
    cabinet,
    report: { ...arrivals(local, cabinet), deleted, parked: parked.map((entry) => entry.node.id) },
  };
}

function isFolderKept(kept: ReadonlyMap<NodeId, Placed>, id: NodeId): boolean {
  const node = kept.get(id)?.node;
  return node !== undefined && isFolder(node);
}

function park(
  library: Library,
  parked: readonly { shelf: NodeId; node: LibraryNode }[],
  options: MergeOptions,
): Library {
  if (parked.length === 0) return library;

  return library.map((shelf) => {
    const arriving = parked.filter((entry) => entry.shelf === shelf.id).map((entry) => entry.node);
    if (arriving.length === 0) return shelf;

    const existing = shelf.children.find(
      (child): child is Folder => isFolder(child) && child.name === options.conflictsFolder,
    );

    if (existing) {
      return {
        ...shelf,
        children: shelf.children.map((child) =>
          child === existing
            ? { ...existing, children: [...existing.children, ...arriving] }
            : child,
        ),
      };
    }

    const folder: Folder = {
      id: options.createId("f"),
      type: "folder",
      name: options.conflictsFolder,
      children: arriving,
    };

    return { ...shelf, children: [...shelf.children, folder] };
  });
}
