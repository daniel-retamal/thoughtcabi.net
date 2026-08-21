import { DND_CLASS } from "./attributes";
import { EdgeScroller } from "./autoScroll";
import { DragGhost } from "./ghost";
import { resolveDrop } from "./hitTest";
import { InsertionIndicator } from "./indicator";
import { SpringLoader } from "./springLoad";
import type { DragCallbacks, DragPayload, DropTarget, Point } from "./types";

const DRAG_THRESHOLD_PX = 5;
const CLICK_SUPPRESSION_MS = 320;
const INTERACTIVE_SELECTOR = "button, a, input, textarea, select";

export interface PointerLike {
  button: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  target: EventTarget | null;
}

interface DragSession {
  drag: DragPayload;
  source: HTMLElement;
  origin: Point;
  point: Point;
  active: boolean;
  target: DropTarget | null;
}

const NO_OP_CALLBACKS: DragCallbacks = {
  onDrop: () => undefined,
  onNavigate: () => undefined,
  validate: () => true,
  onStart: () => undefined,
  onEnd: () => undefined,
};

export class DragController {
  private callbacks: DragCallbacks = NO_OP_CALLBACKS;
  private session: DragSession | null = null;
  private readonly ghost = new DragGhost();
  private readonly indicator = new InsertionIndicator();
  private readonly spring: SpringLoader;
  private readonly scroller: EdgeScroller;

  constructor() {
    this.spring = new SpringLoader(
      (location) => this.callbacks.onNavigate(location),
      () => this.refresh(),
    );
    this.scroller = new EdgeScroller(() => {
      if (!this.session?.active) return;
      this.ghost.moveTo(this.session.point);
      this.refresh();
    });
  }

  configure(callbacks: DragCallbacks): void {
    this.callbacks = callbacks;
  }

  start(event: PointerLike, drag: DragPayload, source: HTMLElement | null): void {
    if (event.button !== 0 || event.pointerType === "touch" || !source) return;
    if (event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR)) return;

    const origin: Point = { x: event.clientX, y: event.clientY };
    this.session = { drag, source, origin, point: origin, active: false, target: null };
    this.bind();
  }

  private bind(): void {
    window.addEventListener("pointermove", this.handleMove, true);
    window.addEventListener("pointerup", this.handleUp, true);
    window.addEventListener("pointercancel", this.handleCancel, true);
    window.addEventListener("keydown", this.handleKey, true);
    window.addEventListener("contextmenu", this.handleContextMenu, true);
    window.addEventListener("dragstart", preventDefault, true);
    window.addEventListener("selectstart", preventDefault, true);
  }

  private unbind(): void {
    window.removeEventListener("pointermove", this.handleMove, true);
    window.removeEventListener("pointerup", this.handleUp, true);
    window.removeEventListener("pointercancel", this.handleCancel, true);
    window.removeEventListener("keydown", this.handleKey, true);
    window.removeEventListener("contextmenu", this.handleContextMenu, true);
    window.removeEventListener("dragstart", preventDefault, true);
    window.removeEventListener("selectstart", preventDefault, true);
  }

  private readonly handleMove = (event: PointerEvent): void => {
    const session = this.session;
    if (!session) return;

    if (!session.active) {
      const dx = event.clientX - session.origin.x;
      const dy = event.clientY - session.origin.y;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
      this.activate(session);
    }

    session.point = { x: event.clientX, y: event.clientY };
    this.ghost.moveTo(session.point);
    this.refresh();
    this.scroller.update(session.point);
  };

  private activate(session: DragSession): void {
    session.active = true;
    document.body.classList.add(DND_CLASS.active);
    window.getSelection()?.removeAllRanges();
    this.ghost.mount(session.drag, session.source, session.origin);
    session.source.classList.add(DND_CLASS.source);
    this.callbacks.onStart(session.drag);
  }

  private refresh(): void {
    const session = this.session;
    if (!session?.active) return;

    const { target, springElement } = resolveDrop({
      drag: session.drag,
      point: session.point,
      previous: session.target,
      validate: (drag, candidate) => this.callbacks.validate(drag, candidate),
    });

    this.spring.aimAt(springElement);
    this.applyTarget(session, target);
  }

  private applyTarget(session: DragSession, target: DropTarget | null): void {
    clearHighlights();
    session.target = target;

    if (!target) {
      this.indicator.hide();
      return;
    }

    if (
      target.type === "reorder" ||
      target.type === "reorder-shelf" ||
      target.type === "reorder-tag"
    ) {
      this.indicator.show(target.line);
      return;
    }

    this.indicator.hide();
    target.element.classList.add(DND_CLASS.over);
  }

  private readonly handleUp = (): void => {
    const session = this.session;
    if (!session) return;

    const { active, target, drag } = session;
    this.cleanup();
    if (!active) return;

    suppressNextClick();
    this.finish(target !== null, drag, target);
  };

  private readonly handleKey = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    this.abort(true);
  };

  private readonly handleContextMenu = (event: Event): void => {
    if (this.session?.active) event.preventDefault();
    this.abort(true);
  };

  private readonly handleCancel = (): void => {
    this.abort(false);
  };

  private abort(suppressClick: boolean): void {
    const session = this.session;
    if (!session) return;

    const { active, drag } = session;
    this.cleanup();
    if (!active) return;

    if (suppressClick) suppressNextClick();
    this.finish(false, drag, null);
  }

  private finish(committed: boolean, drag: DragPayload, target: DropTarget | null): void {
    if (committed && target) this.callbacks.onDrop(drag, target);
    this.callbacks.onEnd(committed);
  }

  private cleanup(): void {
    this.unbind();
    this.spring.cancel();
    this.scroller.stop();
    clearHighlights();
    this.indicator.hide();
    this.ghost.unmount();
    this.session?.source.classList.remove(DND_CLASS.source);
    document.body.classList.remove(DND_CLASS.active);
    this.session = null;
  }
}

function clearHighlights(): void {
  document.querySelectorAll(`.${DND_CLASS.over}`).forEach((element) => {
    element.classList.remove(DND_CLASS.over);
  });
}

function preventDefault(event: Event): void {
  event.preventDefault();
}

function suppressNextClick(): void {
  const swallow = (event: MouseEvent): void => {
    event.stopPropagation();
    event.preventDefault();
    window.removeEventListener("click", swallow, true);
  };
  window.addEventListener("click", swallow, true);
  setTimeout(() => {
    window.removeEventListener("click", swallow, true);
  }, CLICK_SUPPRESSION_MS);
}

export const dragController = new DragController();
