import { useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";
import { previewFramingFor } from "@/domain/links/imageFraming";
import { thumbnailFallbackFor, thumbnailSrcSetFor } from "@/domain/links/sites/youtube";
import type { Note } from "@/domain/model";
import { cssVars } from "@/lib/cssVars";
import {
  imageOutcomeOf,
  naturalRatioOf,
  rememberBrokenImage,
  rememberLoadedImage,
} from "@/lib/imageOutcomes";

export type ThumbnailSurface = "preview" | "mark" | "natural";

interface ThumbnailState {
  source: string;
  src: string;
  settled: boolean;
  ratio: number;
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
  return {
    source,
    src,
    settled: imageOutcomeOf(src) === "ok",
    ratio: naturalRatioOf(src),
  };
}

function isFitted(surface: ThumbnailSurface, ratio: number): boolean {
  return surface === "preview" && previewFramingFor(ratio) === "fit";
}

function frameFor(surface: ThumbnailSurface, fitted: boolean): string {
  if (surface === "natural") return "shot";
  if (surface === "mark") return "cover img-cover";
  return fitted ? "cover img-cover preview fitted" : "cover img-cover preview";
}

function frameStyleFor(fitted: boolean, ratio: number): CSSProperties | undefined {
  return fitted ? cssVars({ "--frame-ratio": String(ratio) }) : undefined;
}

export interface ThumbnailProps {
  note: Note;
  sizes: string;
  surface: ThumbnailSurface;
  fallback?: ReactNode;
}

export function Thumbnail({ note, sizes, surface, fallback = null }: ThumbnailProps) {
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
    setState({ ...state, settled: true, ratio: naturalRatioOf(state.src) });
  };

  const srcSet = thumbnailSrcSetFor(state.src);
  const natural = surface === "natural";
  const fill = natural ? "shot-img" : "img-fill";
  const fitted = isFitted(surface, state.ratio);

  return (
    <div className={frameFor(surface, fitted)} style={frameStyleFor(fitted, state.ratio)}>
      <img
        className={state.settled ? fill : `${fill} unsettled`}
        src={state.src}
        srcSet={srcSet || undefined}
        sizes={srcSet ? sizes : undefined}
        alt=""
        loading={natural ? undefined : "lazy"}
        decoding="async"
        onLoad={settle}
        onError={stepDown}
      />
    </div>
  );
}
