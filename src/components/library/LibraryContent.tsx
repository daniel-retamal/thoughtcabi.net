import {
  isPendingNote,
  type Folder,
  type NodeId,
  type NoteEntry,
  type Tag,
  type ViewMode,
} from "@/domain/model";
import { zoneProps } from "@/dnd/dragProps";
import { FolderTile } from "@/components/cards/FolderTile";
import { NoteCard } from "@/components/cards/NoteCard";
import { PendingCard } from "@/components/cards/PendingCard";
import { FolderRow } from "@/components/rows/FolderRow";
import { NoteRow } from "@/components/rows/NoteRow";
import type { FolderHandlers, NoteHandlers } from "@/components/handlers";
import { SectionHeading } from "./SectionHeading";

export interface LibraryContentProps {
  view: ViewMode;
  folders: readonly Folder[];
  notes: readonly NoteEntry[];
  tags: readonly Tag[];
  isFresh: (id: NodeId) => boolean;
  canReorder: boolean;
  noteHandlers: NoteHandlers;
  folderHandlers: FolderHandlers;
}

export function LibraryContent({
  view,
  folders,
  notes,
  tags,
  isFresh,
  canReorder,
  noteHandlers,
  folderHandlers,
}: LibraryContentProps) {
  const gridZone = canReorder ? zoneProps("grid") : {};
  const listZone = canReorder ? zoneProps("list") : {};

  if (view === "list") {
    return (
      <div className="notes-list" {...listZone}>
        {folders.map((folder) => (
          <FolderRow key={folder.id} folder={folder} {...folderHandlers} />
        ))}
        {notes.map((note) =>
          isPendingNote(note) ? null : (
            <NoteRow
              key={note.id}
              note={note}
              tags={tags}
              fresh={isFresh(note.id)}
              {...noteHandlers}
            />
          ),
        )}
      </div>
    );
  }

  return (
    <>
      {folders.length > 0 ? (
        <>
          <SectionHeading icon="folders" label="Folders" />
          <div className="folder-grid" {...gridZone}>
            {folders.map((folder) => (
              <FolderTile key={folder.id} folder={folder} {...folderHandlers} />
            ))}
          </div>
        </>
      ) : null}

      {notes.length > 0 ? (
        <>
          <SectionHeading icon="bookmark" label="Items" />
          <div className="notes-grid" {...gridZone}>
            {notes.map((note) =>
              isPendingNote(note) ? (
                <PendingCard key={note.id} />
              ) : (
                <NoteCard
                  key={note.id}
                  note={note}
                  tags={tags}
                  fresh={isFresh(note.id)}
                  {...noteHandlers}
                />
              ),
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
