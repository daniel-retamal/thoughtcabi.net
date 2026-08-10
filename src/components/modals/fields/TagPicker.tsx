import type { Tag } from "@/domain/model";
import { TAG_SUGGESTIONS } from "@/domain/tags/tagLibrary";
import { cssVars } from "@/lib/cssVars";

export interface TagPickerProps {
  tags: readonly Tag[];
  value: string;
  onChange: (tag: string) => void;
  onCreate: (name: string, color: string) => void;
}

export function TagPicker({ tags, value, onChange, onCreate }: TagPickerProps) {
  if (tags.length === 0) {
    return (
      <div className="tag-sugg">
        <span className="lbl">No tags yet. Start with</span>
        {TAG_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.name}
            type="button"
            onClick={() => {
              onCreate(suggestion.name, suggestion.color);
              onChange(suggestion.name);
            }}
          >
            <span className="dot" style={{ background: suggestion.color }} />
            {suggestion.name}
          </button>
        ))}
      </div>
    );
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
