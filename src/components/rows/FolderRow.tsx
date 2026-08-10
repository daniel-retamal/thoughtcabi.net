import { useRef } from "react";
import type { Folder } from "@/domain/model";
import { collectNotes, directCounts } from "@/domain/library/tree";
import { folderDragProps } from "@/dnd/dragProps";
import { useArmed } from "@/hooks/useArmed";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { Icon } from "@/components/primitives/Icon";
import { DeleteFace } from "@/components/cards/DeleteFace";
import { FolderActions } from "@/components/cards/NodeActions";
import { folderRowSummary } from "@/components/cards/folderSummary";
import type { FolderHandlers } from "@/components/handlers";

export interface FolderRowProps extends FolderHandlers {
  folder: Folder;
}

export function FolderRow({ folder, onOpen, onRename, onDelete }: FolderRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const confirm = useArmed();
  const saves = collectNotes(folder).length;

  useOnClickOutside([rowRef], confirm.disarm);

  return (
    <div
      ref={rowRef}
      className={confirm.armed ? "row-item row-folder confirming" : "row-item row-folder"}
      {...folderDragProps(folder)}
      onClick={() => {
        if (!confirm.armed) onOpen(folder);
      }}
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
        onDelete={() => (saves > 0 ? confirm.arm() : onDelete(folder))}
      />

      <Icon name="chevron-right" className="row-chevron" />

      {confirm.armed ? (
        <DeleteFace
          count={saves}
          className="row-face"
          onConfirm={() => onDelete(folder)}
          onKeep={confirm.disarm}
        />
      ) : null}
    </div>
  );
}
