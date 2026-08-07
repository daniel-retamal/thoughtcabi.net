import type { Tag } from "@/domain/model";
import { tagDragProps } from "@/dnd/dragProps";
import { cssVars } from "@/lib/cssVars";
import { ActionButton } from "@/components/primitives/ActionButton";

export interface TagRowProps {
  tag: Tag;
  active: boolean;
  onSelect: (name: string) => void;
  onEdit: (tag: Tag) => void;
}

export function TagRow({ tag, active, onSelect, onEdit }: TagRowProps) {
  return (
    <div
      className={active ? "lib-row active" : "lib-row"}
      {...tagDragProps(tag)}
      onClick={() => onSelect(tag.name)}
    >
      <span className="lib-dot" style={cssVars({ "--tint": tag.color })} />
      <span className="lib-name">{tag.name}</span>
      <ActionButton
        className="lib-edit"
        icon="pencil-line"
        label="Edit tag"
        onClick={() => onEdit(tag)}
      />
    </div>
  );
}
