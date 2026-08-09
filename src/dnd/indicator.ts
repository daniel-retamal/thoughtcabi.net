import { DND_CLASS } from "./attributes";
import type { InsertionLine } from "./types";

const THICKNESS = 3;
const HALF_THICKNESS = THICKNESS / 2;

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

  show({ axis, position, crossStart, crossSize }: InsertionLine): void {
    const element = this.ensure();
    element.style.display = "block";

    if (axis === "x") {
      element.style.left = `${position - HALF_THICKNESS}px`;
      element.style.top = `${crossStart}px`;
      element.style.width = `${THICKNESS}px`;
      element.style.height = `${crossSize}px`;
    } else {
      element.style.left = `${crossStart}px`;
      element.style.top = `${position - HALF_THICKNESS}px`;
      element.style.height = `${THICKNESS}px`;
      element.style.width = `${crossSize}px`;
    }
  }

  hide(): void {
    if (this.element) this.element.style.display = "none";
  }
}
