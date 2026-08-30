import type { Tag } from "@/domain/model";
import { useCopy } from "@/i18n/I18nContext";
import { tagDragProps } from "@/dnd/dragProps";
import { cssVars } from "@/lib/cssVars";
import { ActionButton } from "@/components/primitives/ActionButton";

export interface TagRowProps {
  tag: Tag;
  active: boolean;
  named: boolean;
  onSelect: (name: string) => void;
  onEdit: (tag: Tag) => void;
}

export function TagRow({ tag, active, named, onSelect, onEdit }: TagRowProps) {
  const copy = useCopy();

  return (
    <div
      className={active ? "lib-row active" : "lib-row"}
      {...tagDragProps(tag)}
      title={named ? undefined : tag.name}
      onClick={() => onSelect(tag.name)}
    >
      <span className="lib-dot" style={cssVars({ "--tint": tag.color })} />
      <span className="lib-name">{tag.name}</span>
      <ActionButton
        className="lib-edit"
        icon="pencil-line"
        label={copy.sidebar.editTag}
        onClick={() => onEdit(tag)}
      />
    </div>
  );
}
