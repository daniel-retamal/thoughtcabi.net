import type { NodeId } from "./model";

let sequence = 1;

export type IdPrefix = "n" | "f" | "ch" | "t" | "l" | "id";

export function createId(prefix: IdPrefix = "id"): NodeId {
  const suffix = Math.random().toString(36).slice(2, 6);
  const ordinal = sequence;
  sequence += 1;
  return `${prefix}_${ordinal}_${suffix}`;
}

export function resetIdSequence(): void {
  sequence = 1;
}
