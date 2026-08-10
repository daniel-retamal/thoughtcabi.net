import { useEffect } from "react";
import { isTypingInField } from "@/lib/textEntry";
import { useLatest } from "./useLatest";

export function useUndoShortcut(undo: (() => void) | null): void {
  const latest = useLatest(undo);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey) return;
      if (event.key.toLowerCase() !== "z") return;
      if (isTypingInField()) return;

      const run = latest.current;
      if (!run) return;

      event.preventDefault();
      run();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [latest]);
}
