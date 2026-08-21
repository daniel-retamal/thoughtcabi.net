import type { NodeId } from "@/domain/model";
import { CONTENT_BODY_SELECTOR, DND_ATTR, readAttr, readLocation } from "./attributes";
import {
  folderUnder,
  insertionLineAround,
  insideInnerZone,
  nearestElement,
  withinRect,
} from "./geometry";
import type { Axis, DragPayload, DropTarget, InsertionLine, NodeDrag, Point } from "./types";

const FOLDER_HALO = 6;
const STICKY_FOLDER_SLACK = 5;

export interface HitTestContext {
  drag: DragPayload;
  point: Point;
  previous: DropTarget | null;
  validate: (drag: DragPayload, target: DropTarget) => boolean;
}

export interface HitTestResult {
  target: DropTarget | null;
  springElement: HTMLElement | null;
}

interface NodeHitContext extends Omit<HitTestContext, "drag"> {
  drag: NodeDrag;
}

export function resolveDrop(context: HitTestContext): HitTestResult {
  const { drag, point } = context;
  const element = document.elementFromPoint(point.x, point.y);

  if (drag.kind === "tag") {
    return { target: resolveTagDrop(element, drag.tag), springElement: null };
  }

  if (drag.kind === "shelf") {
    const row = element?.closest(`[${DND_ATTR.shelfRow}]`);
    return { target: row ? resolveShelfInsertion(point, drag.id) : null, springElement: null };
  }

  return {
    target: resolveNodeDrop({ ...context, drag }, element),
    springElement: element?.closest<HTMLElement>(`[${DND_ATTR.spring}]`) ?? null,
  };
}

function resolveTagDrop(element: Element | null, tag: string): DropTarget | null {
  const card = element?.closest<HTMLElement>(`[${DND_ATTR.tagDroppable}]`);
  const noteId = readAttr(card ?? null, DND_ATTR.dragId);
  if (!card || !noteId) return null;
  return { type: "assign-tag", noteId, tag, element: card };
}

function resolveNodeDrop(context: NodeHitContext, element: Element | null): DropTarget | null {
  const { drag, point, previous, validate } = context;

  if (
    drag.kind === "item" &&
    previous?.type === "into-folder" &&
    previous.element.isConnected &&
    withinRect(previous.element, point, STICKY_FOLDER_SLACK)
  ) {
    return previous;
  }

  return (
    resolveFolderDrop(context, element) ??
    resolveNavDrop(element, `[${DND_ATTR.shelfTarget}]`, drag, validate) ??
    resolveNavDrop(element, `[${DND_ATTR.crumb}]`, drag, validate) ??
    resolvePlacement(context, element)
  );
}

function resolveFolderDrop(context: NodeHitContext, element: Element | null): DropTarget | null {
  const { drag, point, validate } = context;
  if (!element?.closest(CONTENT_BODY_SELECTOR)) return null;

  const tile = folderUnder(point, FOLDER_HALO);
  if (!tile) return null;

  const folderId = readAttr(tile, DND_ATTR.folderTarget);
  if (!folderId || folderId === drag.id) return null;

  const wantsInto = drag.kind === "item" || insideInnerZone(tile, point);
  if (!wantsInto) return null;

  const target: DropTarget = { type: "into-folder", folderId, element: tile };
  return validate(drag, target) ? target : null;
}

function resolveNavDrop(
  element: Element | null,
  selector: string,
  drag: DragPayload,
  validate: HitTestContext["validate"],
): DropTarget | null {
  const host = element?.closest<HTMLElement>(selector);
  const location = readLocation(host ?? null);
  if (!host || !location) return null;

  const target: DropTarget = { type: "into-nav", location, element: host };
  return validate(drag, target) ? target : null;
}

function resolvePlacement(context: NodeHitContext, element: Element | null): DropTarget | null {
  const { drag, point, validate } = context;

  const root =
    element?.closest<HTMLElement>(`[${DND_ATTR.locationDrop}]`) ??
    (element?.closest(CONTENT_BODY_SELECTOR)
      ? document.querySelector<HTMLElement>(`[${DND_ATTR.locationDrop}]`)
      : null);
  if (!root) return null;

  const location = readLocation(root);
  const siblings = Array.from(
    root.querySelectorAll<HTMLElement>(`[${DND_ATTR.dragKind}="${drag.kind}"]`),
  ).filter((node) => node.closest(`[${DND_ATTR.zone}]`) !== null);
  const candidates = siblings.filter((node) => readAttr(node, DND_ATTR.dragId) !== drag.id);

  if (candidates.length === 0) {
    if (!location) return null;
    const target: DropTarget = { type: "into-nav", location, element: root };
    return validate(drag, target) ? target : null;
  }

  const zone = nearestElement(candidates, point, null)?.closest<HTMLElement>(`[${DND_ATTR.zone}]`);
  if (!zone || !location) return null;

  const inZone = (node: HTMLElement): boolean => node.closest(`[${DND_ATTR.zone}]`) === zone;
  const zoneSiblings = siblings.filter(inZone);
  const zoneCandidates = candidates.filter(inZone);
  const axis: Axis = zone.getAttribute(DND_ATTR.zone) === "list" ? "y" : "x";
  const pick = nearestElement(zoneCandidates, point, axis);
  if (!pick) return null;

  const rect = pick.getBoundingClientRect();
  const before =
    axis === "x" ? point.x < (rect.left + rect.right) / 2 : point.y < (rect.top + rect.bottom) / 2;

  const boundary = zoneCandidates.indexOf(pick) + (before ? 0 : 1);
  const beforeId = readAttr(zoneCandidates[boundary] ?? null, DND_ATTR.dragId);
  const line = insertionLineAround(axis, zoneSiblings, pick, rect, before);

  const target: DropTarget = { type: "reorder", location, beforeId, line, element: zone };
  return validate(drag, target) ? target : null;
}

interface RowInsertion {
  beforeId: string | null;
  line: InsertionLine;
}

function resolveRowInsertion(
  point: Point,
  rowSelector: string,
  dragId: string,
): RowInsertion | null {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(rowSelector));
  const candidates = rows.filter((row) => readAttr(row, DND_ATTR.dragId) !== dragId);
  const pick = nearestElement(candidates, point, "y");
  if (!pick) return null;

  const rect = pick.getBoundingClientRect();
  const before = point.y < (rect.top + rect.bottom) / 2;
  const boundary = candidates.indexOf(pick) + (before ? 0 : 1);

  return {
    beforeId: readAttr(candidates[boundary] ?? null, DND_ATTR.dragId),
    line: insertionLineAround("y", rows, pick, rect, before),
  };
}

function resolveShelfInsertion(point: Point, dragId: NodeId): DropTarget | null {
  const insertion = resolveRowInsertion(point, `[${DND_ATTR.shelfRow}]`, dragId);
  if (!insertion) return null;
  return { type: "reorder-shelf", beforeId: insertion.beforeId, line: insertion.line };
}
