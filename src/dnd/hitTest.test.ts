import { afterEach, describe, expect, it } from "vitest";
import { DND_ATTR } from "./attributes";
import { resolveDrop } from "./hitTest";
import type {
  DragPayload,
  DropTarget,
  NodeDrag,
  Point,
  ReorderShelfTarget,
  ReorderTarget,
} from "./types";

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

function buildShelfRows(ids: readonly string[]): HTMLElement[] {
  return ids.map((id, index) => {
    const row = document.createElement("div");
    row.setAttribute(DND_ATTR.shelfRow, "");
    row.setAttribute(DND_ATTR.dragId, id);
    stubRect(row, rect(0, 200, index * 50, index * 50 + 50));
    document.body.appendChild(row);
    return row;
  });
}

function shelfInsertionAt(
  point: Point,
  elementUnderPoint: HTMLElement,
  dragId: string,
): ReorderShelfTarget {
  document.elementFromPoint = () => elementUnderPoint;
  const drag: NodeDrag = { kind: "shelf", id: dragId };
  const target = resolveDrop({ drag, point, previous: null, validate: () => true }).target;
  if (!target || target.type !== "reorder-shelf") {
    throw new Error(`expected a reorder-shelf target, got ${target?.type ?? "null"}`);
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

  it("never proposes the dragged card as its own beforeId, and draws on its dimmed slot", () => {
    const a = { id: "a", rect: rect(0, 100) };
    const b = { id: "b", rect: rect(110, 210) };
    const c = { id: "c", rect: rect(220, 320) };
    const { zone } = buildGrid([a, b, c]);
    const bEl = zone.children[1] as HTMLElement;

    const target = reorderAt({ x: 90, y: 50 }, bEl, "b");

    expect(target.beforeId).not.toBe("b");
    expect(target.beforeId).toBe("c");
    expect(target.line.position).toBe(105);
  });

  it("ends the line at the end of a wrapped row, not across the middle of it", () => {
    const row = [0, 110, 220, 330, 440].map((left, index) => ({
      id: `a${index}`,
      rect: rect(left, left + 100, 0, 200),
    }));
    const wrapped = [0, 110].map((left, index) => ({
      id: `b${index}`,
      rect: rect(left, left + 100, 210, 410),
    }));
    const { zone } = buildGrid([...row, ...wrapped]);
    const last = zone.children[4] as HTMLElement;

    const target = reorderAt({ x: 535, y: 100 }, last);

    expect(target.beforeId).toBe("b0");
    expect(target.line.position).toBe(545);
    expect(target.line.crossStart).toBe(0);
    expect(target.line.crossSize).toBe(200);
  });

  it("starts the line at the start of a wrapped row, from the other side of the same gap", () => {
    const row = [0, 110, 220, 330, 440].map((left, index) => ({
      id: `a${index}`,
      rect: rect(left, left + 100, 0, 200),
    }));
    const wrapped = [0, 110].map((left, index) => ({
      id: `b${index}`,
      rect: rect(left, left + 100, 210, 410),
    }));
    const { zone } = buildGrid([...row, ...wrapped]);
    const first = zone.children[5] as HTMLElement;

    const target = reorderAt({ x: 5, y: 300 }, first);

    expect(target.beforeId).toBe("b0");
    expect(target.line.position).toBe(-5);
    expect(target.line.crossStart).toBe(210);
    expect(target.line.crossSize).toBe(200);
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

  it("puts the shelf line on the boundary it will land on, from either side", () => {
    const rows = buildShelfRows(["a", "b", "c"]);

    const above = shelfInsertionAt({ x: 50, y: 40 }, rows[1] as HTMLElement, "b");
    const below = shelfInsertionAt({ x: 50, y: 110 }, rows[2] as HTMLElement, "b");

    expect(above.beforeId).toBe("c");
    expect(above.line.position).toBe(50);
    expect(below.beforeId).toBe("c");
    expect(below.line.position).toBe(100);
  });
});

function buildTagRows(names: readonly string[]): HTMLElement[] {
  return names.map((name, index) => {
    const row = document.createElement("div");
    row.setAttribute(DND_ATTR.tagRow, "");
    row.setAttribute(DND_ATTR.dragId, name);
    stubRect(row, rect(0, 200, index * 40, index * 40 + 40));
    document.body.appendChild(row);
    return row;
  });
}

function tagDropAt(
  point: Point,
  elementUnderPoint: HTMLElement,
  tag: string,
): DropTarget | null {
  document.elementFromPoint = () => elementUnderPoint;
  const drag: DragPayload = { kind: "tag", tag, label: tag, color: "#f00" };
  return resolveDrop({ drag, point, previous: null, validate: () => true }).target;
}

describe("tag drops", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("reorders when a tag lands among the tags", () => {
    const rows = buildTagRows(["red", "green", "blue"]);

    const target = tagDropAt({ x: 50, y: 75 }, rows[1] as HTMLElement, "red");

    expect(target?.type).toBe("reorder-tag");
    if (target?.type !== "reorder-tag") throw new Error("expected reorder-tag target");
    expect(target.beforeTag).toBe("blue");
    expect(target.line.axis).toBe("y");
  });

  it("never proposes the dragged tag as its own anchor", () => {
    const rows = buildTagRows(["red", "green", "blue"]);

    const target = tagDropAt({ x: 50, y: 50 }, rows[1] as HTMLElement, "green");

    expect(target?.type).toBe("reorder-tag");
    if (target?.type !== "reorder-tag") throw new Error("expected reorder-tag target");
    expect(target.beforeTag).not.toBe("green");
  });

  it("still tags the card when a tag lands on one", () => {
    const card = document.createElement("div");
    card.setAttribute(DND_ATTR.tagDroppable, "");
    card.setAttribute(DND_ATTR.dragId, "n1");
    document.body.appendChild(card);

    const target = tagDropAt({ x: 50, y: 50 }, card, "red");

    expect(target?.type).toBe("assign-tag");
    if (target?.type !== "assign-tag") throw new Error("expected assign-tag target");
    expect(target.noteId).toBe("n1");
    expect(target.tag).toBe("red");
  });

  it("does nothing when a tag lands on neither", () => {
    const elsewhere = document.createElement("div");
    document.body.appendChild(elsewhere);

    expect(tagDropAt({ x: 50, y: 50 }, elsewhere, "red")).toBeNull();
  });
});
