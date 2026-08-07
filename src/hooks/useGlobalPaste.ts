import { useEffect } from "react";
import { useLatest } from "./useLatest";

const TEXT_ENTRY_TAGS = new Set(["INPUT", "TEXTAREA"]);

function isTypingInField(): boolean {
  const active = document.activeElement;
  return active !== null && TEXT_ENTRY_TAGS.has(active.tagName);
}

export function useGlobalPaste(onText: (text: string) => boolean): void {
  const latest = useLatest(onText);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      if (isTypingInField()) return;
      const text = event.clipboardData?.getData("text");
      if (!text) return;
      if (latest.current(text)) event.preventDefault();
    };
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("paste", onPaste);
    };
  }, [latest]);
}
