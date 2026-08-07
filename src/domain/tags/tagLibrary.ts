import type { Tag } from "@/domain/model";
import { MAX_TAGS, TAG_PALETTE } from "./palette";

export function findTag(tags: readonly Tag[], name: string | null): Tag | undefined {
  if (!name) return undefined;
  return tags.find((tag) => tag.name === name);
}

export function availableColors(tags: readonly Tag[], keepColor?: string): string[] {
  return TAG_PALETTE.filter(
    (color) => color === keepColor || !tags.some((tag) => tag.color === color),
  );
}

export function isPaletteFull(tags: readonly Tag[]): boolean {
  return tags.length >= MAX_TAGS;
}

export function canAddTag(tags: readonly Tag[], name: string, color: string): boolean {
  if (!name.trim() || !color) return false;
  if (isPaletteFull(tags)) return false;
  return !tags.some(
    (tag) => tag.color === color || tag.name.toLowerCase() === name.trim().toLowerCase(),
  );
}

export function addTag(tags: readonly Tag[], name: string, color: string): Tag[] {
  const trimmed = name.trim();
  if (!canAddTag(tags, trimmed, color)) return [...tags];
  return [...tags, { name: trimmed, color }];
}

export function renameTag(tags: readonly Tag[], from: string, to: string): Tag[] {
  return tags.map((tag) => (tag.name === from ? { ...tag, name: to } : tag));
}

export function recolorTag(tags: readonly Tag[], name: string, color: string): Tag[] {
  return tags.map((tag) => (tag.name === name ? { ...tag, color } : tag));
}

export function removeTag(tags: readonly Tag[], name: string): Tag[] {
  return tags.filter((tag) => tag.name !== name);
}
