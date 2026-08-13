import type { NodeId } from "@/domain/model";
import { CONTENT_BODY_SELECTOR, DND_ATTR, readAttr, readLocation } from "./attributes";
import { folderUnder, insideInnerZone, nearestElement, withinRect } from "./geometry";
import type { Axis, DragPayload, DropTarget, InsertionLine, NodeDrag, Point } from "./types";

const FOLDER_HALO = 6;
const STICKY_FOLDER_SLACK = 5;
const EDGE_GAP = 5;

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
  ).filter(
    (node) =>
      node.closest(`[${DND_ATTR.zone}]`) !== null && readAttr(node, DND_ATTR.dragId) !== drag.id,
  );

  if (siblings.length === 0) {
    if (!location) return null;
    const target: DropTarget = { type: "into-nav", location, element: root };
    return validate(drag, target) ? target : null;
  }

  const zone = nearestElement(siblings, point, null)?.closest<HTMLElement>(`[${DND_ATTR.zone}]`);
  if (!zone || !location) return null;

  const zoneSiblings = siblings.filter((node) => node.closest(`[${DND_ATTR.zone}]`) === zone);
  const axis: Axis = zone.getAttribute(DND_ATTR.zone) === "list" ? "y" : "x";
  const pick = nearestElement(zoneSiblings, point, axis);
  if (!pick) return null;

  const rect = pick.getBoundingClientRect();
  const before =
    axis === "x" ? point.x < (rect.left + rect.right) / 2 : point.y < (rect.top + rect.bottom) / 2;

  const index = zoneSiblings.indexOf(pick);
  const insertIndex = before ? index : index + 1;
  const beforeId = readAttr(zoneSiblings[insertIndex] ?? null, DND_ATTR.dragId);
  const line = reorderLine(axis, zoneSiblings[insertIndex - 1], zoneSiblings[insertIndex], pick, rect);

  const target: DropTarget = { type: "reorder", location, beforeId, line, element: zone };
  return validate(drag, target) ? target : null;
}

function resolveShelfInsertion(point: Point, dragId: NodeId): DropTarget | null {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(`[${DND_ATTR.shelfRow}]`)).filter(
    (row) => readAttr(row, DND_ATTR.dragId) !== dragId,
  );
  if (rows.length === 0) return null;

  let best: HTMLElement | null = null;
  let bestDistance = Infinity;
  let bestRect: DOMRect | null = null;
  let before = true;

  for (const row of rows) {
    const rect = row.getBoundingClientRect();
    const centerY = (rect.top + rect.bottom) / 2;
    const distance = Math.abs(point.y - centerY);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = row;
      bestRect = rect;
      before = point.y < centerY;
    }
  }

  if (!best || !bestRect) return null;

  const ids = rows.map((row) => readAttr(row, DND_ATTR.dragId));
  const bestIndex = ids.indexOf(readAttr(best, DND_ATTR.dragId));
  const insertIndex = before ? bestIndex : bestIndex + 1;
  const beforeId = ids[insertIndex] ?? null;
  const line = reorderLine("y", rows[insertIndex - 1], rows[insertIndex], best, bestRect);

  return { type: "reorder-shelf", beforeId, line };
}

function reorderLine(
  axis: Axis,
  previous: HTMLElement | undefined,
  next: HTMLElement | undefined,
  pick: HTMLElement,
  pickRect: DOMRect,
): InsertionLine {
  const rectOf = (el: HTMLElement | undefined): DOMRect | null =>
    el ? (el === pick ? pickRect : el.getBoundingClientRect()) : null;

  const prevRect = rectOf(previous);
  const nextRect = rectOf(next);

  if (prevRect && nextRect) {
    return axis === "x"
      ? {
          axis,
          position: (prevRect.right + nextRect.left) / 2,
          crossStart: prevRect.top,
          crossSize: prevRect.height,
        }
      : {
          axis,
          position: (prevRect.bottom + nextRect.top) / 2,
          crossStart: prevRect.left,
          crossSize: prevRect.width,
        };
  }

  const edgeRect = prevRect ?? nextRect ?? pickRect;
  const atStart = !prevRect;

  return axis === "x"
    ? {
        axis,
        position: atStart ? edgeRect.left - EDGE_GAP : edgeRect.right + EDGE_GAP,
        crossStart: edgeRect.top,
        crossSize: edgeRect.height,
      }
    : {
        axis,
        position: atStart ? edgeRect.top - EDGE_GAP : edgeRect.bottom + EDGE_GAP,
        crossStart: edgeRect.left,
        crossSize: edgeRect.width,
      };
}
