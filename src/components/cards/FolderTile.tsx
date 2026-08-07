import type { Folder } from "@/domain/model";
import { collectNotes, directCounts } from "@/domain/library/tree";
import { folderDragProps } from "@/dnd/dragProps";
import { Icon } from "@/components/primitives/Icon";
import type { FolderHandlers } from "@/components/handlers";
import { FolderActions } from "./NodeActions";
import { Thumbnail } from "./Thumbnail";
import { folderTileSummary } from "./folderSummary";

const MOSAIC_CELLS = 4;
const CELL_WIDTH = "120px";

export interface FolderTileProps extends FolderHandlers {
  folder: Folder;
}

export function FolderTile({ folder, onOpen, onRename, onDelete }: FolderTileProps) {
  const previews = collectNotes(folder).slice(0, MOSAIC_CELLS);
  const cellCount = previews.length <= 1 ? 1 : MOSAIC_CELLS;

  return (
    <div className="folder-tile" {...folderDragProps(folder)} onClick={() => onOpen(folder)}>
      <FolderActions
        folder={folder}
        className="folder-actions"
        onRename={onRename}
        onDelete={onDelete}
      />

      <div className={previews.length <= 1 ? "folder-mosaic one" : "folder-mosaic"}>
        {Array.from({ length: cellCount }, (_, index) => {
          const note = previews[index];
          return note ? (
            <div className="cell" key={index}>
              <Thumbnail note={note} sizes={CELL_WIDTH} />
            </div>
          ) : (
            <div className="cell empty" key={index} />
          );
        })}
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
