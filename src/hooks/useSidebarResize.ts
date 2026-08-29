import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { SidebarMode } from "@/domain/model";
import {
  collapseBelowFrom,
  sidebarSizeFor,
  SIDEBAR_MIN_WIDTH,
  type SidebarSize,
} from "@/lib/sidebarWidth";

const DRAG_SLOP = 3;
const SNAP_MS = 260;

export interface SidebarResizeHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface SidebarResizeOptions {
  shellRef: RefObject<HTMLDivElement>;
  brandRef: RefObject<HTMLDivElement>;
  mode: SidebarMode;
  width: number;
  onResize: (size: SidebarSize) => void;
  onToggle: () => void;
}

interface Drag {
  pointerId: number;
  startX: number;
  startWidth: number;
  collapseBelow: number;
  moved: boolean;
  size: SidebarSize;
}

function measureCollapseBelow(brand: HTMLElement | null): number {
  const panel = brand?.parentElement;
  const mark = brand?.firstElementChild;
  const word = brand?.lastElementChild;
  if (!panel || !mark || !word || mark === word) return SIDEBAR_MIN_WIDTH;

  const left = panel.getBoundingClientRect().left;
  const wordBox = word.getBoundingClientRect();
  if (wordBox.width === 0) return SIDEBAR_MIN_WIDTH;

  return collapseBelowFrom(mark.getBoundingClientRect().left - left, wordBox.right - left);
}

export function useSidebarResize({
  shellRef,
  brandRef,
  mode,
  width,
  onResize,
  onToggle,
}: SidebarResizeOptions): SidebarResizeHandlers {
  const drag = useRef<Drag | null>(null);
  const measured = useRef(SIDEBAR_MIN_WIDTH);
  const settlesAt = useRef(0);

  const release = (event: ReactPointerEvent<HTMLElement>): Drag | null => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return null;
    drag.current = null;

    shellRef.current?.removeAttribute("data-resizing");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    return current;
  };

  const paint = (size: SidebarSize, snapped: boolean): void => {
    const shell = shellRef.current;
    if (!shell) return;

    if (snapped) settlesAt.current = performance.now() + SNAP_MS;
    if (performance.now() >= settlesAt.current) shell.setAttribute("data-resizing", "yes");
    else shell.removeAttribute("data-resizing");

    shell.style.setProperty("--sidebar-set", `${size.width}px`);
    document.documentElement.setAttribute("data-sidebar", size.mode);
  };

  return {
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      const shell = shellRef.current;
      if (!shell) return;

      if (mode === "wide") measured.current = measureCollapseBelow(brandRef.current);
      const panel = brandRef.current?.parentElement;

      drag.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: panel ? panel.getBoundingClientRect().width : width,
        collapseBelow: measured.current,
        moved: false,
        size: { mode, width },
      };

      settlesAt.current = 0;
      shell.setAttribute("data-resizing", "yes");
      event.currentTarget.setPointerCapture(event.pointerId);
    },

    onPointerMove: (event) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;

      const travel = event.clientX - current.startX;
      if (!current.moved && Math.abs(travel) <= DRAG_SLOP) return;
      current.moved = true;

      const previous = current.size.mode;
      current.size = sidebarSizeFor(
        current.startWidth + travel,
        current.collapseBelow,
        current.size.width,
      );
      paint(current.size, current.size.mode !== previous);
      if (current.size.mode === "wide") {
        measured.current = measureCollapseBelow(brandRef.current);
        current.collapseBelow = measured.current;
      }
    },

    onPointerUp: (event) => {
      const current = release(event);
      if (!current) return;
      if (current.moved) onResize(current.size);
      else onToggle();
    },

    onPointerCancel: (event) => {
      const current = release(event);
      if (current?.moved) onResize(current.size);
    },
  };
}
