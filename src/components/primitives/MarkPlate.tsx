import { useState, type SyntheticEvent } from "react";
import { imageOutcomeOf, naturalEdgeOf, rememberLoadedImage } from "@/lib/imageOutcomes";

export type MarkScale = "cover" | "row" | "mini";

const MAX_ICON_EDGE: Record<MarkScale, number> = { cover: 32, row: 18, mini: 13 };

interface MarkPlateState {
  src: string;
  edge: number;
  settled: boolean;
}

function recall(src: string): MarkPlateState {
  return { src, edge: naturalEdgeOf(src), settled: imageOutcomeOf(src) === "ok" };
}

export interface MarkPlateProps {
  src: string;
  scale: MarkScale;
  onError: () => void;
}

export function MarkPlate({ src, scale, onError }: MarkPlateProps) {
  const limit = MAX_ICON_EDGE[scale];
  const [state, setState] = useState<MarkPlateState>(() => recall(src));

  if (state.src !== src) {
    setState(recall(src));
    return null;
  }

  const settle = (event: SyntheticEvent<HTMLImageElement>): void => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    rememberLoadedImage(src, naturalWidth, naturalHeight);
    setState({ src, edge: Math.max(naturalWidth, naturalHeight), settled: true });
  };

  const edge = state.edge > 0 ? Math.min(state.edge, limit) : limit;
  const plate = `mark-plate ${scale}-plate`;

  return (
    <span className={state.settled ? plate : `${plate} unsettled`}>
      <img
        className="mark-img"
        src={src}
        alt=""
        decoding="async"
        style={{ width: edge, height: edge }}
        onLoad={settle}
        onError={onError}
      />
    </span>
  );
}
