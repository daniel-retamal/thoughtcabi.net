import { afterEach, describe, expect, it } from "vitest";
import { DND_ATTR } from "./attributes";
import { resolveDrop } from "./hitTest";
import type { DropTarget, NodeDrag, Point, ReorderTarget } from "./types";

function rect(left: number, right: number, top = 0, bottom = 100): DOMRect {
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

function stubRect(element: HTMLElement, value: DOMRect): void {
  element.getBoundingClientRect = () => value;
}

function buildGrid(items: Array<{ id: string; rect: DOMRect }>): {
  body: HTMLElement;
  zone: HTMLElement;
} {
  const body = document.createElement("div");
  body.className = "body";

  const root = document.createElement("div");
  root.setAttribute(DND_ATTR.locationDrop, "");
  root.setAttribute(DND_ATTR.nav, JSON.stringify({ shelfId: "c1", path: [] }));

  const zone = document.createElement("div");
  zone.setAttribute(DND_ATTR.zone, "grid");
  stubRect(zone, rect(0, 1000, 0, 100));

  for (const item of items) {
    const el = document.createElement("div");
    el.setAttribute(DND_ATTR.dragKind, "item");
    el.setAttribute(DND_ATTR.dragId, item.id);
    stubRect(el, item.rect);
    zone.appendChild(el);
  }

  root.appendChild(zone);
  body.appendChild(root);
  document.body.appendChild(body);

  return { body, zone };
}

function reorderAt(point: Point, elementUnderPoint: HTMLElement, dragId = "dragged"): ReorderTarget {
  document.elementFromPoint = () => elementUnderPoint;
  const drag: NodeDrag = { kind: "item", id: dragId };
  const target: DropTarget | null = resolveDrop({
    drag,
    point,
    previous: null,
    validate: () => true,
  }).target;
  if (!target || target.type !== "reorder") {
    throw new Error(`expected a reorder target, got ${target?.type ?? "null"}`);
  }
  return target;
}

describe("resolvePlacement anchors", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("anchors the gap between two adjacent siblings to the exact midpoint, from either side", () => {
    const a = { id: "a", rect: rect(0, 100) };
    const b = { id: "b", rect: rect(110, 210) };
    const c = { id: "c", rect: rect(220, 320) };
    const { zone } = buildGrid([a, b, c]);
    const bEl = zone.children[1] as HTMLElement;
    const cEl = zone.children[2] as HTMLElement;

    const fromLeft = reorderAt({ x: 205, y: 50 }, bEl);
    const fromRight = reorderAt({ x: 225, y: 50 }, cEl);

    expect(fromLeft.beforeId).toBe("c");
    expect(fromRight.beforeId).toBe("c");
    expect(fromLeft.line.position).toBe(215);
    expect(fromRight.line.position).toBe(215);
  });

  it("anchors insertion before the first item just off its own edge", () => {
    const a = { id: "a", rect: rect(0, 100) };
    const b = { id: "b", rect: rect(110, 210) };
    const { zone } = buildGrid([a, b]);
    const aEl = zone.children[0] as HTMLElement;

    const target = reorderAt({ x: 10, y: 50 }, aEl);

    expect(target.beforeId).toBe("a");
    expect(target.line.position).toBe(-5);
  });

  it("anchors insertion after the last item just off its own edge", () => {
    const a = { id: "a", rect: rect(0, 100) };
    const b = { id: "b", rect: rect(110, 210) };
    const { zone } = buildGrid([a, b]);
    const bEl = zone.children[1] as HTMLElement;

    const target = reorderAt({ x: 205, y: 50 }, bEl);

    expect(target.beforeId).toBeNull();
    expect(target.line.position).toBe(215);
  });

  it("never uses the card being dragged as an anchor or a beforeId", () => {
    const a = { id: "a", rect: rect(0, 100) };
    const b = { id: "b", rect: rect(110, 210) };
    const c = { id: "c", rect: rect(220, 320) };
    const { zone } = buildGrid([a, b, c]);
    const bEl = zone.children[1] as HTMLElement;

    // Hover right over b's own (dimmed) position while b itself is being dragged.
    const target = reorderAt({ x: 90, y: 50 }, bEl, "b");

    expect(target.beforeId).not.toBe("b");
    expect(target.beforeId).toBe("c");
    expect(target.line.position).toBe(160);
  });

  it("never proposes the dragged shelf row as its own beforeId", () => {
    const rows = ["a", "b", "c"].map((id, i) => {
      const el = document.createElement("div");
      el.setAttribute(DND_ATTR.shelfRow, "");
      el.setAttribute(DND_ATTR.dragId, id);
      stubRect(el, rect(0, 200, i * 50, i * 50 + 50));
      document.body.appendChild(el);
      return el;
    });

    document.elementFromPoint = () => rows[1] as HTMLElement;
    const drag: NodeDrag = { kind: "shelf", id: "b" };
    const target = resolveDrop({ drag, point: { x: 50, y: 40 }, previous: null, validate: () => true })
      .target;

    expect(target?.type).toBe("reorder-shelf");
    if (target?.type !== "reorder-shelf") throw new Error("expected reorder-shelf target");
    expect(target.beforeId).not.toBe("b");
  });
});
