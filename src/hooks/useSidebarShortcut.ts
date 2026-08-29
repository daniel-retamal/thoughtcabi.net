import { useEffect } from "react";
import { isTypingInField } from "@/lib/textEntry";
import { useLatest } from "./useLatest";

export function useSidebarShortcut(toggle: () => void): void {
  const latest = useLatest(toggle);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey) return;
      if (event.key.toLowerCase() !== "b") return;
      if (isTypingInField()) return;

      event.preventDefault();
      latest.current();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [latest]);
}
