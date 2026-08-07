import { useEffect, useRef, useState } from "react";
import type { LinkPreview } from "@/domain/links/linkPreview";
import { canonicalUrl } from "@/domain/links/url";
import { useLatest } from "@/hooks/useLatest";
import type { LinkReader } from "@/links/readLink";

const PREVIEW_DEBOUNCE_MS = 500;

export interface LinkPreviewState {
  preview: LinkPreview | null;
  reading: boolean;
}

export function useLinkPreview(
  url: string,
  readLink: LinkReader,
  initial: LinkPreview | null,
): LinkPreviewState {
  const [state, setState] = useState<LinkPreviewState>({ preview: initial, reading: false });
  const reader = useLatest(readLink);
  const requested = useRef(canonicalUrl(initial?.url) ?? "");

  useEffect(() => {
    const canonical = canonicalUrl(url);

    if (!canonical || canonical === requested.current) {
      setState((current) => (current.reading ? { ...current, reading: false } : current));
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, reading: true }));

    const timer = setTimeout(() => {
      requested.current = canonical;
      void reader.current(canonical).then((preview) => {
        if (!cancelled) setState({ preview, reading: false });
      });
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url, reader]);

  return state;
}
