import type { Tag } from "@/domain/model";
import { TAG_SUGGESTION_COLORS } from "@/domain/tags/tagLibrary";
import { useCopy } from "@/i18n/I18nContext";
import { cssVars } from "@/lib/cssVars";

export interface TagPickerProps {
  tags: readonly Tag[];
  value: string;
  onChange: (tag: string) => void;
  onCreate: (name: string, color: string) => void;
}

export function TagPicker({ tags, value, onChange, onCreate }: TagPickerProps) {
  const copy = useCopy();

  if (tags.length === 0) {
    const suggestions = [
      copy.tagPicker.inspiration,
      copy.tagPicker.readLater,
      copy.tagPicker.reference,
    ].map((name, index) => ({ name, color: TAG_SUGGESTION_COLORS[index] ?? "" }));

    return (
      <div className="tag-sugg">
        <span className="lbl">{copy.tagPicker.noTagsYet}</span>
        {suggestions.map((suggestion) => (
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
