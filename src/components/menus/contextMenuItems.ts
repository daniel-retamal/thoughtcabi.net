import type { Folder, Note } from "@/domain/model";
import type { IconName } from "@/icons/names";
import type { Copy } from "@/i18n/copy";

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

export function contextMenuFor(
  target: ContextTarget,
  handlers: ContextMenuHandlers,
  copy: Copy,
): MenuItem[] {
  if (target.kind === "background") {
    const items: MenuItem[] = [
      { icon: "clipboard-paste", label: copy.menu.pasteLink, run: handlers.onPasteLink },
      { icon: "bookmark-plus", label: copy.menu.saveLink, run: handlers.onSaveLink },
    ];
    if (target.canCreateFolder) {
      items.push({ icon: "folder-plus", label: copy.menu.newFolder, run: handlers.onNewFolder });
    }
    return items;
  }

  if (target.kind === "folder") {
    const { folder } = target;
    return [
      { icon: "folder", label: copy.menu.open, run: () => handlers.onOpenFolder(folder) },
      { icon: "pencil-line", label: copy.menu.rename, run: () => handlers.onRenameFolder(folder) },
      {
        icon: "trash-2",
        label: copy.menu.delete,
        run: () => handlers.onDeleteFolder(folder),
        danger: true,
      },
    ];
  }

  const { note } = target;
  const items: MenuItem[] = [
    { icon: "file-text", label: copy.menu.open, run: () => handlers.onOpen(note) },
  ];

  if (note.url) {
    items.push({
      icon: "external-link",
      label: copy.menu.openOriginal,
      run: () => window.open(note.url, "_blank", "noreferrer"),
    });
    items.push({ icon: "copy", label: copy.menu.copyLink, run: () => handlers.onCopyLink(note) });
  }

  items.push({ icon: "pencil-line", label: copy.menu.edit, run: () => handlers.onEdit(note) });
  items.push({
    icon: "image-plus",
    label: copy.menu.pasteAsThumbnail,
    run: () => handlers.onPasteThumbnail(note),
  });
  items.push({
    icon: "trash-2",
    label: copy.menu.delete,
    run: () => handlers.onDelete(note),
    danger: true,
  });

  return items;
}
