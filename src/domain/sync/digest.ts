import type { Cabinet } from "@/domain/model";
import { canonicalCabinet } from "./canonical";

const FNV_PRIME = 0x01000193;
const FNV_BASIS = 0x811c9dc5;
const SECOND_BASIS = 0x9dc5811c;

function fnv1a(text: string, basis: number): string {
  let hash = basis;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), FNV_PRIME);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function digestOf(text: string): string {
  return fnv1a(text, FNV_BASIS) + fnv1a(text, SECOND_BASIS);
}

export function cabinetDigest(cabinet: Cabinet): string {
  return digestOf(canonicalCabinet(cabinet));
}
