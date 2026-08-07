import type { IconName } from "@/icons/names";
import { locateNode } from "@/domain/library/tree";
import { draftFromNote, type NoteDraft } from "@/domain/notes/buildNote";
import type { Channel, Library, LibraryLocation, Note, Tag } from "@/domain/model";
import type { Dialog } from "@/state/dialogs";
import { ChannelEditorModal } from "./modals/ChannelEditorModal";
import { ComposeModal } from "./modals/ComposeModal";
import { NamePromptModal } from "./modals/NamePromptModal";
import { NoteDetailModal } from "./modals/NoteDetailModal";
import { TagEditorModal } from "./modals/TagEditorModal";

const NEW_NOTE_ICON: IconName = "folder-plus";

export interface DialogHostProps {
  dialog: Dialog | null;
  library: Library;
  tags: readonly Tag[];
  currentLocation: LibraryLocation;
  detailLocationLabel: (note: Note) => string;
  onClose: () => void;
  onEditNote: (note: Note) => void;
  onSaveNote: (draft: NoteDraft, editing: Note | null) => void;
  onSaveChannel: (channel: Channel | null, name: string, icon: IconName) => void;
  onDeleteChannel: (channel: Channel) => void;
  onSaveTag: (original: Tag | null, name: string, color: string) => void;
  onDeleteTag: (name: string) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
}

export function DialogHost({
  dialog,
  library,
  tags,
  currentLocation,
  detailLocationLabel,
  onClose,
  onEditNote,
  onSaveNote,
  onSaveChannel,
  onDeleteChannel,
  onSaveTag,
  onDeleteTag,
  onCreateFolder,
  onRenameFolder,
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
          onSave={(draft) => onSaveNote(draft, editing)}
          onCancel={onClose}
        />
      );
    }

    case "channel": {
      const channel = dialog.mode === "edit" ? dialog.channel : null;
      return (
        <ChannelEditorModal
          mode={dialog.mode}
          initialName={channel?.name ?? ""}
          initialIcon={channel?.icon ?? "hash"}
          onConfirm={(name, icon) => onSaveChannel(channel, name, icon)}
          onDelete={() => {
            if (channel) onDeleteChannel(channel);
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
