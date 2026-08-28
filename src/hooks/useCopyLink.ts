import { useCallback, useEffect, useRef, useState } from "react";
import { writeClipboardText } from "@/lib/clipboard";

const COPIED_FEEDBACK_MS = 1400;

export interface CopyLink {
  copied: boolean;
  copy: (url: string) => void;
}

export function useCopyLink(): CopyLink {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback((url: string) => {
    writeClipboardText(url);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }, []);

  return { copied, copy };
}
