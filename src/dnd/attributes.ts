import type { LibraryLocation } from "@/domain/model";

export const DND_ATTR = {
  dragKind: "data-drag-kind",
  dragId: "data-drag-id",
  folderTarget: "data-folder-target",
  tagDroppable: "data-tag-droppable",
  shelfRow: "data-shelf-row",
  tagRow: "data-tag-row",
  shelfTarget: "data-shelf-target",
  crumb: "data-crumb",
  locationDrop: "data-location-drop",
  nav: "data-nav",
  spring: "data-spring",
  zone: "data-zone",
} as const;

export const DND_CLASS = {
  active: "dnd-active",
  source: "dnd-source",
  ghost: "dnd-ghost",
  tagGhost: "dnd-tag-ghost",
  indicator: "dnd-indicator",
  over: "dnd-over",
  spring: "dnd-spring",
} as const;

export const SCROLLABLE_SELECTOR = ".body, .sidebar, .dest-menu";
export const CONTENT_BODY_SELECTOR = ".body";
export const GHOST_STRIP_SELECTOR =
  ".card-actions,.folder-actions,.row-actions,.lib-edit,.row-chevron";

export function serializeLocation(location: LibraryLocation): string {
  return JSON.stringify(location);
}

export function readLocation(element: Element | null): LibraryLocation | null {
  const raw = element?.getAttribute(DND_ATTR.nav);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.shelfId !== "string") return null;
    const path = Array.isArray(record.path)
      ? record.path.filter((segment): segment is string => typeof segment === "string")
      : [];
    return { shelfId: record.shelfId, path };
  } catch {
    return null;
  }
}

export function readAttr(element: Element | null, attribute: string): string | null {
  return element?.getAttribute(attribute) ?? null;
}
