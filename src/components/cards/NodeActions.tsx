import type { MouseEvent } from "react";
import type { Folder, Note } from "@/domain/model";
import { ActionButton } from "@/components/primitives/ActionButton";

function stopPropagation(event: MouseEvent): void {
  event.stopPropagation();
}

export interface NoteActionsProps {
  note: Note;
  className: "card-actions" | "row-actions";
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function NoteActions({ note, className, onEdit, onDelete }: NoteActionsProps) {
  return (
    <div className={className} onClick={stopPropagation}>
      {note.domain ? (
        <ActionButton
          icon="external-link"
          label="Open original"
          onClick={() => window.open(note.url, "_blank", "noopener")}
        />
      ) : null}
      <ActionButton icon="pencil-line" label="Edit" onClick={() => onEdit(note)} />
      <ActionButton icon="trash-2" label="Remove" onClick={() => onDelete(note)} />
    </div>
  );
}

export interface FolderActionsProps {
  folder: Folder;
  className: "folder-actions" | "row-actions";
  onRename: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
}

export function FolderActions({ folder, className, onRename, onDelete }: FolderActionsProps) {
  return (
    <div className={className} onClick={stopPropagation}>
      <ActionButton icon="pencil-line" label="Rename folder" onClick={() => onRename(folder)} />
      <ActionButton icon="trash-2" label="Delete folder" onClick={() => onDelete(folder)} />
    </div>
  );
}
