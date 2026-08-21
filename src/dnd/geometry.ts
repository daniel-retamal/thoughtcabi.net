import { DND_ATTR } from "./attributes";
import type { Axis, InsertionLine, Point } from "./types";

const LIST_ZONE_SLOP = 2;
const GRID_ROW_WEIGHT = 100;
const EDGE_GAP = 5;

export function withinRect(element: Element, point: Point, margin: number): boolean {
  const rect = element.getBoundingClientRect();
  return (
    point.x >= rect.left - margin &&
    point.x <= rect.right + margin &&
    point.y >= rect.top - margin &&
    point.y <= rect.bottom + margin
  );
}

export function isListZone(element: Element): boolean {
  return element.closest(`[${DND_ATTR.zone}="list"]`) !== null;
}

export function insideInnerZone(element: Element, point: Point): boolean {
  const rect = element.getBoundingClientRect();

  if (isListZone(element)) {
    const inset = Math.min(rect.height * 0.3, 22);
    return point.y > rect.top + inset && point.y < rect.bottom - inset;
  }

  const inset = rect.width * 0.22;
  return point.x > rect.left + inset && point.x < rect.right - inset;
}

export function nearestElement<T extends Element>(
  elements: readonly T[],
  point: Point,
  axis: Axis | null,
): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;

  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    const overflowX = Math.max(rect.left - point.x, 0, point.x - rect.right);
    const overflowY = Math.max(rect.top - point.y, 0, point.y - rect.bottom);

    let distance: number;
    if (axis === "x") {
      distance = overflowY * GRID_ROW_WEIGHT + Math.abs(point.x - (rect.left + rect.right) / 2);
    } else if (axis === "y") {
      distance = overflowX * GRID_ROW_WEIGHT + Math.abs(point.y - (rect.top + rect.bottom) / 2);
    } else {
      distance = Math.hypot(overflowX, overflowY);
    }

    if (distance < bestDistance) {
      bestDistance = distance;
      best = element;
    }
  }

  return best;
}

export function folderUnder(point: Point, slop: number): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[${DND_ATTR.folderTarget}]`);
  let best: HTMLElement | null = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;

    const margin = isListZone(candidate) ? LIST_ZONE_SLOP : slop;
    if (
      point.x < rect.left - margin ||
      point.x > rect.right + margin ||
      point.y < rect.top - margin ||
      point.y > rect.bottom + margin
    ) {
      continue;
    }

    const distance = Math.hypot(
      point.x - (rect.left + rect.right) / 2,
      point.y - (rect.top + rect.bottom) / 2,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return best;
}

export type PickSide = "previous" | "next";

function wrapsToNextRow(previous: DOMRect, next: DOMRect): boolean {
  return next.top >= previous.bottom || next.left < previous.left;
}

export function insertionLine(
  axis: Axis,
  previous: DOMRect | undefined,
  next: DOMRect | undefined,
  pick: DOMRect,
  side: PickSide,
): InsertionLine {
  if (previous && next && !(axis === "x" && wrapsToNextRow(previous, next))) {
    return axis === "x"
      ? {
          axis,
          position: (previous.right + next.left) / 2,
          crossStart: Math.min(previous.top, next.top),
          crossSize: Math.max(previous.bottom, next.bottom) - Math.min(previous.top, next.top),
        }
      : {
          axis,
          position: (previous.bottom + next.top) / 2,
          crossStart: previous.left,
          crossSize: previous.width,
        };
  }

  const leading = side === "next";
  return axis === "x"
    ? {
        axis,
        position: leading ? pick.left - EDGE_GAP : pick.right + EDGE_GAP,
        crossStart: pick.top,
        crossSize: pick.height,
      }
    : {
        axis,
        position: leading ? pick.top - EDGE_GAP : pick.bottom + EDGE_GAP,
        crossStart: pick.left,
        crossSize: pick.width,
      };
}

export function insertionLineAround(
  axis: Axis,
  siblings: readonly HTMLElement[],
  pick: HTMLElement,
  pickRect: DOMRect,
  before: boolean,
): InsertionLine {
  const boundary = siblings.indexOf(pick) + (before ? 0 : 1);
  const rectOf = (element: HTMLElement | undefined): DOMRect | undefined => {
    if (!element) return undefined;
    return element === pick ? pickRect : element.getBoundingClientRect();
  };

  return insertionLine(
    axis,
    rectOf(siblings[boundary - 1]),
    rectOf(siblings[boundary]),
    pickRect,
    before ? "next" : "previous",
  );
}
