import { DND_CLASS } from "./attributes";
import type { Axis, Side } from "./types";

const GAP = 5;
const THICKNESS = 3;
const HALF_THICKNESS = THICKNESS / 2;

export interface InsertionLine {
  rect: DOMRect;
  axis: Axis;
  side: Side;
}

export class InsertionIndicator {
  private element: HTMLElement | null = null;

  private ensure(): HTMLElement {
    if (!this.element) {
      const element = document.createElement("div");
      element.className = DND_CLASS.indicator;
      document.body.appendChild(element);
      this.element = element;
    }
    return this.element;
  }

  show({ rect, axis, side }: InsertionLine): void {
    const element = this.ensure();
    element.style.display = "block";

    if (axis === "x") {
      const x = side === "before" ? rect.left - GAP : rect.right + GAP;
      element.style.left = `${x - HALF_THICKNESS}px`;
      element.style.top = `${rect.top}px`;
      element.style.width = `${THICKNESS}px`;
      element.style.height = `${rect.height}px`;
    } else {
      const y = side === "before" ? rect.top - GAP : rect.bottom + GAP;
      element.style.left = `${rect.left}px`;
      element.style.top = `${y - HALF_THICKNESS}px`;
      element.style.height = `${THICKNESS}px`;
      element.style.width = `${rect.width}px`;
    }
  }

  hide(): void {
    if (this.element) this.element.style.display = "none";
  }
}
