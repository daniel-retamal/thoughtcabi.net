import { useRef } from "react";
import { isFolder, isNote, isPendingNote, type Folder, type NoteEntry } from "@/domain/model";
import { collectNotes, directCounts } from "@/domain/library/tree";
import { folderDragProps } from "@/dnd/dragProps";
import { useArmed } from "@/hooks/useArmed";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { Icon } from "@/components/primitives/Icon";
import type { FolderHandlers } from "@/components/handlers";
import { DeleteFace } from "./DeleteFace";
import { FolderActions } from "./NodeActions";
import { MosaicCell } from "./MosaicCell";
import { folderTileSummary } from "./folderSummary";

const MOSAIC_SLOTS = 3;
const WHOLE_WIDTH = "240px";
const LEAD_WIDTH = "160px";
const SLIM_WIDTH = "80px";

export interface FolderTileProps extends FolderHandlers {
  folder: Folder;
}

function previewNodes(folder: Folder): (Folder | NoteEntry)[] {
  const notes: NoteEntry[] = [];
  const folders: Folder[] = [];

  for (const child of folder.children) {
    if (isNote(child) || isPendingNote(child)) notes.push(child);
    else if (isFolder(child)) folders.push(child);
  }

  return [...notes, ...folders].slice(0, MOSAIC_SLOTS);
}

function cellWidth(index: number, slots: number): string {
  if (slots === 1) return WHOLE_WIDTH;
  return index === 0 ? LEAD_WIDTH : SLIM_WIDTH;
}

function fillsMosaicHeight(index: number, slots: number): boolean {
  return index === 0 || slots === 2;
}

export function FolderTile({ folder, onOpen, onRename, onDelete }: FolderTileProps) {
  const previews = previewNodes(folder);
  const tileRef = useRef<HTMLDivElement>(null);
  const confirm = useArmed();
  const saves = collectNotes(folder).length;

  useOnClickOutside([tileRef], confirm.disarm);

  return (
    <div
      ref={tileRef}
      className={confirm.armed ? "folder-tile confirming" : "folder-tile"}
      {...folderDragProps(folder)}
      onClick={() => {
        if (!confirm.armed) onOpen(folder);
      }}
    >
      <FolderActions
        folder={folder}
        className="folder-actions"
        onRename={onRename}
        onDelete={() => (saves > 0 ? confirm.arm() : onDelete(folder))}
      />

      {confirm.armed ? (
        <DeleteFace
          count={saves}
          className="folder-face"
          onConfirm={() => onDelete(folder)}
          onKeep={confirm.disarm}
        />
      ) : null}

      <div className={`folder-mosaic slots-${previews.length}`}>
        {previews.length === 0 ? <div className="cell cell-tall" /> : null}
        {previews.map((node, index) => (
          <MosaicCell
            key={node.id}
            node={node}
            sizes={cellWidth(index, previews.length)}
            tall={fillsMosaicHeight(index, previews.length)}
          />
        ))}
      </div>

      <div className="folder-meta">
        <span className="ficon">
          <Icon name="folder" />
        </span>
        <div className="folder-text">
          <div className="folder-name">{folder.name}</div>
          <div className="folder-sub">{folderTileSummary(directCounts(folder))}</div>
        </div>
      </div>
    </div>
  );
}
