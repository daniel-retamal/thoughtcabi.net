import { useEffect } from "react";
import { isTypingInField } from "@/lib/textEntry";
import { useLatest } from "./useLatest";

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
