import { useState, type SyntheticEvent } from "react";

export type MarkScale = "cover" | "row";

const MAX_ICON_EDGE: Record<MarkScale, number> = { cover: 32, row: 18 };

export interface MarkPlateProps {
  src: string;
  scale: MarkScale;
  onError: () => void;
}

export function MarkPlate({ src, scale, onError }: MarkPlateProps) {
  const limit = MAX_ICON_EDGE[scale];
  const [edge, setEdge] = useState(limit);

  const fitToNativeSize = (event: SyntheticEvent<HTMLImageElement>): void => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    const longestEdge = Math.max(naturalWidth, naturalHeight);
    if (longestEdge > 0) setEdge(Math.min(longestEdge, limit));
  };

  return (
    <span className={`mark-plate ${scale}-plate`}>
      <img
        className="mark-img"
        src={src}
        alt=""
        decoding="async"
        style={{ width: edge, height: edge }}
        onLoad={fitToNativeSize}
        onError={onError}
      />
    </span>
  );
}
