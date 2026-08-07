import type { LibraryLocation } from "@/domain/model";
import { DND_ATTR, DND_CLASS, readLocation } from "./attributes";

const DWELL_MS = 600;
const SETTLE_MS = 90;

export class SpringLoader {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private key: string | null = null;
  private element: HTMLElement | null = null;

  constructor(
    private readonly onNavigate: (location: LibraryLocation) => void,
    private readonly onSettled: () => void,
  ) {}

  aimAt(element: HTMLElement | null): void {
    const key = element?.getAttribute(DND_ATTR.nav) ?? null;
    if (key === this.key) return;

    this.cancel();
    if (!element || !key) return;

    const location = readLocation(element);
    if (!location) return;

    this.key = key;
    this.element = element;
    element.classList.add(DND_CLASS.spring);

    this.timer = setTimeout(() => {
      this.timer = null;
      this.onNavigate(location);
      setTimeout(this.onSettled, SETTLE_MS);
    }, DWELL_MS);
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.element?.classList.remove(DND_CLASS.spring);
    this.element = null;
    this.key = null;
  }
}
