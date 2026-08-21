import { useEffect, useRef, type MutableRefObject } from "react";
import type { Point } from "@/dnd/types";

export function usePointerPosition(): MutableRefObject<Point | null> {
  const point = useRef<Point | null>(null);

  useEffect(() => {
    const onMove = (event: PointerEvent): void => {
      point.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return point;
}
