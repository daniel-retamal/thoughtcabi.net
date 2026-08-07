import type { Folder } from "@/domain/model";
import { directCounts } from "@/domain/library/tree";
import { folderDragProps } from "@/dnd/dragProps";
import { Icon } from "@/components/primitives/Icon";
import { FolderActions } from "@/components/cards/NodeActions";
import { folderRowSummary } from "@/components/cards/folderSummary";
import type { FolderHandlers } from "@/components/handlers";

export interface FolderRowProps extends FolderHandlers {
  folder: Folder;
}

export function FolderRow({ folder, onOpen, onRename, onDelete }: FolderRowProps) {
  return (
    <div
      className="row-item row-folder"
      {...folderDragProps(folder)}
      onClick={() => onOpen(folder)}
    >
      <span className="ricon">
        <Icon name="folder" />
      </span>

      <div className="row-main">
        <div className="row-title">{folder.name}</div>
        <div className="row-desc">{folderRowSummary(directCounts(folder))}</div>
      </div>

      <FolderActions
        folder={folder}
        className="row-actions"
        onRename={onRename}
        onDelete={onDelete}
      />

      <Icon name="chevron-right" className="row-chevron" />
    </div>
  );
}
