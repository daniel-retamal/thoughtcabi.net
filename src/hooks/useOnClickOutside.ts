import { useEffect, type RefObject } from "react";
import { useLatest } from "./useLatest";

export function useOnClickOutside(
  refs: readonly RefObject<HTMLElement>[],
  handler: () => void,
): void {
  const latest = useLatest(handler);
  const latestRefs = useLatest(refs);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const inside = latestRefs.current.some((ref) => ref.current?.contains(target));
      if (!inside) latest.current();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [latest, latestRefs]);
}
