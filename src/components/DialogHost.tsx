import type { IconName } from "@/icons/names";
import { collectNotes, locateNode } from "@/domain/library/tree";
import { previewFromNote, type LinkPreview } from "@/domain/links/linkPreview";
import { draftFromNote, type NoteDraft } from "@/domain/notes/buildNote";
import type { Cabinet, Library, LibraryLocation, Note, Shelf, Tag } from "@/domain/model";
import type { LinkReader } from "@/links/readLink";
import type { Dialog } from "@/state/dialogs";
import { ShelfEditorModal } from "./modals/ShelfEditorModal";
import { ComposeModal } from "./modals/ComposeModal";
import { NamePromptModal } from "./modals/NamePromptModal";
import { NoteDetailModal } from "./modals/NoteDetailModal";
import { TagEditorModal } from "./modals/TagEditorModal";
import { TransferModal, type ImportMode } from "./modals/TransferModal";

const NEW_NOTE_ICON: IconName = "folder-plus";

export interface DialogHostProps {
  dialog: Dialog | null;
  library: Library;
  tags: readonly Tag[];
  currentLocation: LibraryLocation;
  detailLocationLabel: (note: Note) => string;
  readLink: LinkReader;
  onClose: () => void;
  onEditNote: (note: Note) => void;
  onSaveNote: (draft: NoteDraft, preview: LinkPreview | null, editing: Note | null) => void;
  onCreateTag: (name: string, color: string) => void;
  onSaveShelf: (shelf: Shelf | null, name: string, icon: IconName) => void;
  onDeleteShelf: (shelf: Shelf) => void;
  onSaveTag: (original: Tag | null, name: string, color: string) => void;
  onDeleteTag: (name: string) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onExportCabinet: () => void;
  onImportCabinet: (cabinet: Cabinet, mode: ImportMode) => void;
}

export function DialogHost({
  dialog,
  library,
  tags,
  currentLocation,
  detailLocationLabel,
  readLink,
  onClose,
  onEditNote,
  onSaveNote,
  onCreateTag,
  onSaveShelf,
  onDeleteShelf,
  onSaveTag,
  onDeleteTag,
  onCreateFolder,
  onRenameFolder,
  onExportCabinet,
  onImportCabinet,
}: DialogHostProps) {
  if (!dialog) return null;

  switch (dialog.kind) {
    case "detail":
      return (
        <NoteDetailModal
          note={dialog.note}
          tags={tags}
          location={detailLocationLabel(dialog.note)}
          onEdit={onEditNote}
          onClose={onClose}
        />
      );

    case "compose": {
      const editing = dialog.mode === "edit" ? dialog.note : null;
      const destination = editing
        ? (locateNode(library, editing.id) ?? currentLocation)
        : currentLocation;
      const initial: NoteDraft = editing
        ? draftFromNote(editing, destination)
        : { url: "", title: "", description: "", tag: "", image: "", destination };

      return (
        <ComposeModal
          mode={dialog.mode}
          library={library}
          tags={tags}
          initial={initial}
          initialPreview={editing ? previewFromNote(editing) : null}
          readLink={readLink}
          onSave={(draft, preview) => onSaveNote(draft, preview, editing)}
          onCreateTag={onCreateTag}
          onCancel={onClose}
        />
      );
    }

    case "shelf": {
      const shelf = dialog.mode === "edit" ? dialog.shelf : null;
      return (
        <ShelfEditorModal
          mode={dialog.mode}
          initialName={shelf?.name ?? ""}
          initialIcon={shelf?.icon ?? "hash"}
          canDelete={library.length > 1}
          saveCount={shelf ? collectNotes(shelf).length : 0}
          onConfirm={(name, icon) => onSaveShelf(shelf, name, icon)}
          onDelete={() => {
            if (shelf) onDeleteShelf(shelf);
          }}
          onCancel={onClose}
        />
      );
    }

    case "tag": {
      const tag = dialog.mode === "edit" ? dialog.tag : null;
      const initialColor = dialog.mode === "edit" ? dialog.tag.color : dialog.color;
      return (
        <TagEditorModal
          mode={dialog.mode}
          initialName={tag?.name ?? ""}
          initialColor={initialColor}
          tags={tags}
          onConfirm={(name, color) => onSaveTag(tag, name, color)}
          onDelete={() => {
            if (tag) onDeleteTag(tag.name);
          }}
          onCancel={onClose}
        />
      );
    }

    case "new-folder":
      return (
        <NamePromptModal
          kind="New folder"
          heading="Name your folder"
          placeholder="e.g. Read later"
          icon={NEW_NOTE_ICON}
          onConfirm={onCreateFolder}
          onCancel={onClose}
        />
      );

    case "transfer":
      return (
        <TransferModal
          library={library}
          tags={tags}
          onExport={onExportCabinet}
          onImport={onImportCabinet}
          onCancel={onClose}
        />
      );

    case "rename-folder":
      return (
        <NamePromptModal
          kind="Rename"
          heading="Rename folder"
          placeholder="Folder name"
          icon="pencil-line"
          initialValue={dialog.folder.name}
          confirmLabel="Save"
          onConfirm={(name) => onRenameFolder(dialog.folder.id, name)}
          onCancel={onClose}
        />
      );
  }
}
