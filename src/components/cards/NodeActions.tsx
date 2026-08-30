import type { Folder, Note } from "@/domain/model";
import { stopPropagation } from "@/lib/events";
import { useCopyLink } from "@/hooks/useCopyLink";
import { useCopy } from "@/i18n/I18nContext";
import { ActionButton } from "@/components/primitives/ActionButton";

export interface NoteActionsProps {
  note: Note;
  className: "card-actions" | "row-actions";
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function NoteActions({ note, className, onEdit, onDelete }: NoteActionsProps) {
  const text = useCopy();
  const { copied, copy } = useCopyLink();

  return (
    <div className={className} onClick={stopPropagation}>
      {note.domain ? (
        <>
          <ActionButton
            icon="external-link"
            label={text.actions.openOriginal}
            onClick={() => window.open(note.url, "_blank", "noopener")}
          />
          <ActionButton
            icon={copied ? "check" : "copy"}
            label={copied ? text.actions.copied : text.actions.copyLink}
            onClick={() => copy(note.url)}
          />
        </>
      ) : null}
      <ActionButton icon="pencil-line" label={text.actions.edit} onClick={() => onEdit(note)} />
      <ActionButton icon="trash-2" label={text.actions.remove} onClick={() => onDelete(note)} />
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
  const copy = useCopy();

  return (
    <div className={className} onClick={stopPropagation}>
      <ActionButton
        icon="pencil-line"
        label={copy.nodeActions.renameFolder}
        onClick={() => onRename(folder)}
      />
      <ActionButton
        icon="trash-2"
        label={copy.nodeActions.deleteFolder}
        onClick={() => onDelete(folder)}
      />
    </div>
  );
}
