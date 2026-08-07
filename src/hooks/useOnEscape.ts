import { useEffect } from "react";
import { useLatest } from "./useLatest";

export function useOnEscape(handler: () => void): void {
  const latest = useLatest(handler);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") latest.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [latest]);
}
