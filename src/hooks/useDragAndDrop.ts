import { useEffect } from "react";
import { dragController } from "@/dnd/controller";
import type { DragCallbacks } from "@/dnd/types";
import { useLatest } from "./useLatest";

export function useDragAndDrop(callbacks: DragCallbacks): void {
  const latest = useLatest(callbacks);

  useEffect(() => {
    dragController.configure({
      onDrop: (drag, target) => latest.current.onDrop(drag, target),
      onNavigate: (location) => latest.current.onNavigate(location),
      validate: (drag, target) => latest.current.validate(drag, target),
      onStart: (drag) => latest.current.onStart(drag),
      onEnd: (committed) => latest.current.onEnd(committed),
    });
  }, [latest]);
}
