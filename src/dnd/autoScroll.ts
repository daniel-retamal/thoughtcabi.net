import { SCROLLABLE_SELECTOR } from "./attributes";
import type { Point } from "./types";

const EDGE_BAND = 64;
const SPEED_DIVISOR = 5;

export class EdgeScroller {
  private target: Element | null = null;
  private velocity = 0;
  private frame: number | null = null;

  constructor(private readonly onScrolled: () => void) {}

  update(point: Point): void {
    const container = document.elementFromPoint(point.x, point.y)?.closest(SCROLLABLE_SELECTOR);
    if (!container) return this.stop();

    const rect = container.getBoundingClientRect();
    const velocity = edgeVelocity(point.y, rect);
    if (!velocity) return this.stop();

    this.target = container;
    this.velocity = velocity;
    if (this.frame === null) this.tick();
  }

  stop(): void {
    this.velocity = 0;
    this.target = null;
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  private tick(): void {
    this.frame = requestAnimationFrame(() => {
      if (!this.target || !this.velocity) {
        this.frame = null;
        return;
      }
      this.target.scrollTop += this.velocity;
      this.onScrolled();
      this.tick();
    });
  }
}

function edgeVelocity(y: number, rect: DOMRect): number {
  if (y < rect.top + EDGE_BAND) {
    return -Math.ceil((rect.top + EDGE_BAND - y) / SPEED_DIVISOR);
  }
  if (y > rect.bottom - EDGE_BAND) {
    return Math.ceil((y - (rect.bottom - EDGE_BAND)) / SPEED_DIVISOR);
  }
  return 0;
}
