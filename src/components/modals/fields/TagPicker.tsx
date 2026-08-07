import type { Tag } from "@/domain/model";
import { cssVars } from "@/lib/cssVars";

export interface TagPickerProps {
  tags: readonly Tag[];
  value: string;
  onChange: (tag: string) => void;
}

export function TagPicker({ tags, value, onChange }: TagPickerProps) {
  if (tags.length === 0) {
    return <div className="tag-empty">No tags yet — create them from the sidebar.</div>;
  }

  return (
    <div className="tag-chips">
      {tags.map((tag) => {
        const selected = value === tag.name;
        return (
          <span
            key={tag.name}
            className={selected ? "tagchip on" : "tagchip"}
            style={cssVars({ "--tint": tag.color })}
            onClick={() => onChange(selected ? "" : tag.name)}
          >
            <span className="tdot" />
            <span className="tagchip-txt">{tag.name}</span>
          </span>
        );
      })}
    </div>
  );
}
