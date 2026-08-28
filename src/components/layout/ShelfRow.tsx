import type { Shelf } from "@/domain/model";
import { shelfDragProps } from "@/dnd/dragProps";
import { cssVars } from "@/lib/cssVars";
import { Icon } from "@/components/primitives/Icon";
import { ActionButton } from "@/components/primitives/ActionButton";

export interface ShelfRowProps {
  shelf: Shelf;
  active: boolean;
  named: boolean;
  onOpen: (shelf: Shelf) => void;
  onEdit: (shelf: Shelf) => void;
}

export function ShelfRow({ shelf, active, named, onOpen, onEdit }: ShelfRowProps) {
  return (
    <div
      className={active ? "lib-row active" : "lib-row"}
      {...shelfDragProps(shelf)}
      title={named ? undefined : shelf.name}
      onClick={() => onOpen(shelf)}
    >
      <span className="lib-tile" style={cssVars({ "--tint": "var(--accent)" })}>
        <Icon name={shelf.icon} />
      </span>
      <span className="lib-name">{shelf.name}</span>
      <ActionButton
        className="lib-edit"
        icon="pencil-line"
        label="Edit shelf"
        onClick={() => onEdit(shelf)}
      />
    </div>
  );
}
