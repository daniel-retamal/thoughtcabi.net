import type { IdPrefix } from "@/domain/ids";
import { isFolder, type Cabinet, type LibraryNode, type NodeId } from "@/domain/model";

export type IdFactory = (prefix: IdPrefix) => NodeId;

export function withFreshIds(cabinet: Cabinet, createNodeId: IdFactory): Cabinet {
  const rebuild = (nodes: readonly LibraryNode[]): LibraryNode[] =>
    nodes.map((node) =>
      isFolder(node)
        ? { ...node, id: createNodeId("f"), children: rebuild(node.children) }
        : { ...node, id: createNodeId("n") },
    );

  return {
    library: cabinet.library.map((shelf) => ({
      ...shelf,
      id: createNodeId("ch"),
      children: rebuild(shelf.children),
    })),
    tags: cabinet.tags,
  };
}
