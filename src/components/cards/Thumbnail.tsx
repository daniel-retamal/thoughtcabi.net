import { useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";
import { thumbnailFallbackFor, thumbnailSrcSetFor } from "@/domain/links/sites/youtube";
import type { Note } from "@/domain/model";
import {
  imageOutcomeOf,
  naturalSizeOf,
  rememberBrokenImage,
  rememberLoadedImage,
} from "@/lib/imageOutcomes";

interface ThumbnailState {
  source: string;
  src: string;
  settled: boolean;
}

function firstUnbroken(source: string): string {
  let candidate = source;
  while (candidate && imageOutcomeOf(candidate) === "broken") {
    candidate = thumbnailFallbackFor(candidate);
  }
  return candidate;
}

function recall(source: string): ThumbnailState {
  const src = firstUnbroken(source);
  return { source, src, settled: imageOutcomeOf(src) === "ok" };
}

function targetWidthFrom(sizes: string): number {
  return Number(/(\d+(?:\.\d+)?)px/.exec(sizes)?.[1] ?? 0);
}

export interface ThumbnailProps {
  note: Note;
  sizes: string;
  fallback?: ReactNode;
  capResolution?: boolean;
}

export function Thumbnail({ note, sizes, fallback = null, capResolution = false }: ThumbnailProps) {
  const source = note.image || note.siteImage || "";
  const [state, setState] = useState<ThumbnailState>(() => recall(source));

  if (state.source !== source) {
    setState(recall(source));
    return null;
  }

  if (!state.src) return fallback;

  const stepDown = (): void => {
    rememberBrokenImage(state.src);
    setState(recall(source));
  };

  const settle = (event: SyntheticEvent<HTMLImageElement>): void => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    rememberLoadedImage(state.src, naturalWidth, naturalHeight);
    setState({ ...state, settled: true });
  };

  const srcSet = thumbnailSrcSetFor(state.src);
  const natural = capResolution ? naturalSizeOf(state.src) : null;
  const targetWidth = capResolution ? targetWidthFrom(sizes) : 0;
  const capped = natural !== null && targetWidth > 0 && natural.width < targetWidth;
  const style: CSSProperties | undefined =
    capped && natural ? { maxWidth: natural.width, maxHeight: natural.height } : undefined;

  return (
    <div className={capped ? "cover img-cover img-capped" : "cover img-cover"}>
      <img
        className={state.settled ? "img-fill" : "img-fill unsettled"}
        src={state.src}
        srcSet={srcSet || undefined}
        sizes={srcSet ? sizes : undefined}
        style={style}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={settle}
        onError={stepDown}
      />
    </div>
  );
}
