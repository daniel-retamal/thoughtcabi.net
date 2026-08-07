import type { Tag } from "@/domain/model";

export interface TagBadgeProps {
  tag: Tag;
  className: "card-tag" | "row-tag";
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  return (
    <span className={className}>
      <span className="tdot" style={{ background: tag.color }} />
      {tag.name}
    </span>
  );
}
