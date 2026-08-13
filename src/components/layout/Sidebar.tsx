import type { Shelf, Tag } from "@/domain/model";
import { Icon } from "@/components/primitives/Icon";
import { ShelfRow } from "./ShelfRow";
import { SidebarSection } from "./SidebarSection";
import { TagRow } from "./TagRow";

export interface SidebarProps {
  shelves: readonly Shelf[];
  tags: readonly Tag[];
  activeShelfId: string;
  atShelfRoot: boolean;
  activeTag: string | null;
  onOpenShelf: (shelf: Shelf) => void;
  onNewShelf: () => void;
  onEditShelf: (shelf: Shelf) => void;
  onSelectTag: (name: string) => void;
  onNewTag: () => void;
  onEditTag: (tag: Tag) => void;
}

export function Sidebar({
  shelves,
  tags,
  activeShelfId,
  atShelfRoot,
  activeTag,
  onOpenShelf,
  onNewShelf,
  onEditShelf,
  onSelectTag,
  onNewTag,
  onEditTag,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <SidebarSection title="Library" addLabel="New shelf" onAdd={onNewShelf}>
        {shelves.map((shelf) => (
          <ShelfRow
            key={shelf.id}
            shelf={shelf}
            active={activeShelfId === shelf.id && atShelfRoot && !activeTag}
            onOpen={onOpenShelf}
            onEdit={onEditShelf}
          />
        ))}
      </SidebarSection>

      <SidebarSection title="Tags" addLabel="New tag" onAdd={onNewTag}>
        {tags.length === 0 ? (
          <button type="button" className="lib-ghost" onClick={onNewTag}>
            <span className="ring">
              <Icon name="plus" />
            </span>
            Add a tag
          </button>
        ) : (
          tags.map((tag) => (
            <TagRow
              key={tag.name}
              tag={tag}
              active={activeTag === tag.name}
              onSelect={onSelectTag}
              onEdit={onEditTag}
            />
          ))
        )}
      </SidebarSection>
    </aside>
  );
}
