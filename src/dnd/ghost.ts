import { DND_CLASS, GHOST_STRIP_SELECTOR } from "./attributes";
import type { DragPayload, Point } from "./types";

const MAX_GHOST_WIDTH = 240;
const NODE_OFFSET: Point = { x: -18, y: -16 };
const TAG_OFFSET: Point = { x: -16, y: -14 };
const GHOST_ROTATION = "1.5deg";

export class DragGhost {
  private element: HTMLElement | null = null;
  private offset: Point = NODE_OFFSET;

  mount(drag: DragPayload, source: HTMLElement, origin: Point): void {
    const ghost = document.createElement("div");
    ghost.className = DND_CLASS.ghost;

    if (drag.kind === "tag") {
      ghost.appendChild(createTagPill(drag.label, drag.color));
      this.offset = TAG_OFFSET;
    } else {
      ghost.style.width = `${Math.min(source.getBoundingClientRect().width, MAX_GHOST_WIDTH)}px`;
      ghost.appendChild(createNodeClone(source));
      this.offset = NODE_OFFSET;
    }

    document.body.appendChild(ghost);
    this.element = ghost;
    this.moveTo(origin);
  }

  moveTo(point: Point): void {
    if (!this.element) return;
    const x = point.x - this.offset.x;
    const y = point.y - this.offset.y;
    this.element.style.transform = `translate(${x}px,${y}px) rotate(${GHOST_ROTATION})`;
  }

  unmount(): void {
    this.element?.remove();
    this.element = null;
  }
}

function createTagPill(label: string, color: string): HTMLElement {
  const pill = document.createElement("div");
  pill.className = DND_CLASS.tagGhost;

  const dot = document.createElement("span");
  dot.className = "tdot";
  dot.style.background = color || "#888";

  pill.appendChild(dot);
  pill.appendChild(document.createTextNode(label || "tag"));
  return pill;
}

function createNodeClone(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.remove(DND_CLASS.source);
  clone.querySelectorAll(GHOST_STRIP_SELECTOR).forEach((node) => {
    node.remove();
  });
  return clone;
}
