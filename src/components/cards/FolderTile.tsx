import { isFolder, isNote, type Folder, type Note } from "@/domain/model";
import { directCounts } from "@/domain/library/tree";
import { folderDragProps } from "@/dnd/dragProps";
import { Icon } from "@/components/primitives/Icon";
import type { FolderHandlers } from "@/components/handlers";
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

function previewNodes(folder: Folder): (Folder | Note)[] {
  const shown: (Folder | Note)[] = [];
  for (const child of folder.children) {
    if (isFolder(child) || isNote(child)) shown.push(child);
    if (shown.length === MOSAIC_SLOTS) break;
  }
  return shown;
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

  return (
    <div className="folder-tile" {...folderDragProps(folder)} onClick={() => onOpen(folder)}>
      <FolderActions
        folder={folder}
        className="folder-actions"
        onRename={onRename}
        onDelete={onDelete}
      />

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
