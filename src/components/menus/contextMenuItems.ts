import type { Folder, Note } from "@/domain/model";
import type { IconName } from "@/icons/names";

export interface MenuItem {
  icon: IconName;
  label: string;
  run: () => void;
  danger?: boolean;
}

export type ContextTarget =
  | { kind: "background"; canCreateFolder: boolean }
  | { kind: "folder"; folder: Folder }
  | { kind: "note"; note: Note };

export interface ContextMenuHandlers {
  onPasteLink: () => void;
  onSaveLink: () => void;
  onNewFolder: () => void;
  onOpenFolder: (folder: Folder) => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  onOpen: (note: Note) => void;
  onCopyLink: (note: Note) => void;
  onEdit: (note: Note) => void;
  onPasteThumbnail: (note: Note) => void;
  onDelete: (note: Note) => void;
}

export function contextMenuFor(target: ContextTarget, handlers: ContextMenuHandlers): MenuItem[] {
  if (target.kind === "background") {
    const items: MenuItem[] = [
      { icon: "clipboard-paste", label: "Paste link", run: handlers.onPasteLink },
      { icon: "bookmark-plus", label: "Save link…", run: handlers.onSaveLink },
    ];
    if (target.canCreateFolder) {
      items.push({ icon: "folder-plus", label: "New folder", run: handlers.onNewFolder });
    }
    return items;
  }

  if (target.kind === "folder") {
    const { folder } = target;
    return [
      { icon: "folder", label: "Open", run: () => handlers.onOpenFolder(folder) },
      { icon: "pencil-line", label: "Rename", run: () => handlers.onRenameFolder(folder) },
      {
        icon: "trash-2",
        label: "Delete",
        run: () => handlers.onDeleteFolder(folder),
        danger: true,
      },
    ];
  }

  const { note } = target;
  const items: MenuItem[] = [
    { icon: "file-text", label: "Open", run: () => handlers.onOpen(note) },
  ];

  if (note.url) {
    items.push({
      icon: "external-link",
      label: "Open original",
      run: () => window.open(note.url, "_blank", "noreferrer"),
    });
    items.push({ icon: "copy", label: "Copy link", run: () => handlers.onCopyLink(note) });
  }

  items.push({ icon: "pencil-line", label: "Edit", run: () => handlers.onEdit(note) });
  items.push({
    icon: "image-plus",
    label: "Paste as thumbnail",
    run: () => handlers.onPasteThumbnail(note),
  });
  items.push({
    icon: "trash-2",
    label: "Delete",
    run: () => handlers.onDelete(note),
    danger: true,
  });

  return items;
}
