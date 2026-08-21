import { useEffect } from "react";
import { DND_ATTR } from "@/dnd/attributes";
import type { NodeId } from "@/domain/model";
import { carriesImage, readDroppedImage } from "@/lib/imageDrop";
import { useLatest } from "./useLatest";

const CARD_SELECTOR = `[${DND_ATTR.dragKind}="item"][${DND_ATTR.dragId}]`;
export const IMAGE_TARGET_CLASS = "img-drop-over";

function cardUnder(event: DragEvent): HTMLElement | null {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  return element?.closest<HTMLElement>(CARD_SELECTOR) ?? null;
}

export function useImageDropTargets(onImage: (noteId: NodeId, image: string) => void): void {
  const latest = useLatest(onImage);

  useEffect(() => {
    let marked: HTMLElement | null = null;

    const mark = (card: HTMLElement | null): void => {
      if (marked === card) return;
      marked?.classList.remove(IMAGE_TARGET_CLASS);
      card?.classList.add(IMAGE_TARGET_CLASS);
      marked = card;
    };

    const onDragOver = (event: DragEvent): void => {
      event.preventDefault();

      const card = carriesImage(event.dataTransfer) ? cardUnder(event) : null;
      mark(card);
      if (card && event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };

    const onDrop = (event: DragEvent): void => {
      event.preventDefault();

      const card = cardUnder(event);
      mark(null);

      const noteId = card?.getAttribute(DND_ATTR.dragId);
      if (!noteId || !event.dataTransfer) return;

      void readDroppedImage(event.dataTransfer).then((image) => {
        if (image) latest.current(noteId, image);
      });
    };

    const onDragLeave = (event: DragEvent): void => {
      if (!event.relatedTarget) mark(null);
    };

    const onDragEnd = (): void => mark(null);

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragend", onDragEnd);

    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragend", onDragEnd);
      mark(null);
    };
  }, [latest]);
}
