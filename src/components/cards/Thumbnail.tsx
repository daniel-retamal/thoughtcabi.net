import { useState, type ReactNode } from "react";
import { thumbnailFallbackFor, thumbnailSrcSetFor } from "@/domain/links/sites/youtube";
import type { Note } from "@/domain/model";

interface ThumbnailState {
  source: string;
  src: string;
  failed: boolean;
}

export interface ThumbnailProps {
  note: Note;
  sizes: string;
  fallback?: ReactNode;
}

export function Thumbnail({ note, sizes, fallback = null }: ThumbnailProps) {
  const source = note.image || note.siteImage || "";
  const [state, setState] = useState<ThumbnailState>({ source, src: source, failed: false });

  if (state.source !== source) {
    setState({ source, src: source, failed: false });
    return null;
  }

  if (!state.src || state.failed) return fallback;

  const onError = (): void => {
    const fallbackSrc = thumbnailFallbackFor(state.src);
    setState(
      fallbackSrc
        ? { source, src: fallbackSrc, failed: false }
        : { source, src: state.src, failed: true },
    );
  };

  const srcSet = thumbnailSrcSetFor(state.src);

  return (
    <div className="cover img-cover">
      <img
        className="img-fill"
        src={state.src}
        srcSet={srcSet || undefined}
        sizes={srcSet ? sizes : undefined}
        alt=""
        loading="lazy"
        decoding="async"
        onError={onError}
      />
    </div>
  );
}
