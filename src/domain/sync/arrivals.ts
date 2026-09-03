import { eachNode } from "@/domain/library/tree";
import { isPendingNote, type Cabinet, type NodeId } from "@/domain/model";
import { nodeFingerprint } from "./canonical";

export interface Arrivals {
  added: readonly NodeId[];
  updated: readonly NodeId[];
}

function fingerprints(cabinet: Cabinet): Map<NodeId, string> {
  const prints = new Map<NodeId, string>();
  eachNode(cabinet.library, (node) => {
    if (!isPendingNote(node)) prints.set(node.id, nodeFingerprint(node));
  });
  return prints;
}

export function arrivals(before: Cabinet, after: Cabinet): Arrivals {
  const was = fingerprints(before);
  const added: NodeId[] = [];
  const updated: NodeId[] = [];

  for (const [id, print] of fingerprints(after)) {
    const previous = was.get(id);
    if (previous === undefined) added.push(id);
    else if (previous !== print) updated.push(id);
  }

  return { added, updated };
}

export function arrivedIds(what: Arrivals): NodeId[] {
  return [...what.added, ...what.updated];
}
