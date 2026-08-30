import type { ReactNode, RefObject } from "react";
import type { Shelf, SidebarMode, Tag } from "@/domain/model";
import { useCopy } from "@/i18n/I18nContext";
import { Icon } from "@/components/primitives/Icon";
import { ShelfRow } from "./ShelfRow";
import { SideBrand } from "./SideBrand";
import { SidebarSection } from "./SidebarSection";
import { TagRow } from "./TagRow";

export interface SidebarProps {
  shelves: readonly Shelf[];
  tags: readonly Tag[];
  activeShelfId: string;
  atShelfRoot: boolean;
  activeTag: string | null;
  mode: SidebarMode;
  brandRef: RefObject<HTMLDivElement>;
  footer: ReactNode;
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
  mode,
  brandRef,
  footer,
  onOpenShelf,
  onNewShelf,
  onEditShelf,
  onSelectTag,
  onNewTag,
  onEditTag,
}: SidebarProps) {
  const copy = useCopy();
  const wide = mode === "wide";

  return (
    <aside className="sidebar" id="cabinet-sidebar">
      <SideBrand brandRef={brandRef} />

      <SidebarSection
        title={copy.sidebar.library}
        addLabel={copy.sidebar.newShelf}
        onAdd={onNewShelf}
      >
        {shelves.map((shelf) => (
          <ShelfRow
            key={shelf.id}
            shelf={shelf}
            active={activeShelfId === shelf.id && atShelfRoot && !activeTag}
            named={wide}
            onOpen={onOpenShelf}
            onEdit={onEditShelf}
          />
        ))}
      </SidebarSection>

      <SidebarSection title={copy.sidebar.tags} addLabel={copy.sidebar.newTag} onAdd={onNewTag}>
        {tags.length === 0 ? (
          <button type="button" className="lib-ghost" onClick={onNewTag}>
            <span className="ring">
              <Icon name="plus" />
            </span>
            {copy.sidebar.addATag}
          </button>
        ) : (
          tags.map((tag) => (
            <TagRow
              key={tag.name}
              tag={tag}
              active={activeTag === tag.name}
              named={wide}
              onSelect={onSelectTag}
              onEdit={onEditTag}
            />
          ))
        )}
      </SidebarSection>

      {footer ? <div className="side-footer">{footer}</div> : null}
    </aside>
  );
}
