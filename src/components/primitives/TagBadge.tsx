import type { Tag } from "@/domain/model";
import { cssVars } from "@/lib/cssVars";

export interface TagBadgeProps {
  tag: Tag;
  className: "card-tag" | "row-tag";
}

const CHIP_CARRIES_THE_TINT: Record<TagBadgeProps["className"], boolean> = {
  "card-tag": false,
  "row-tag": true,
};

export function TagBadge({ tag, className }: TagBadgeProps) {
  return (
    <span className={className} style={cssVars({ "--tint": tag.color })}>
      {CHIP_CARRIES_THE_TINT[className] ? null : <span className="tdot" />}
      <span className="tname">{tag.name}</span>
    </span>
  );
}
