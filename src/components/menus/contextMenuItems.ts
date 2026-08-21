import type { Note } from "@/domain/model";
import type { IconName } from "@/icons/names";

export interface MenuItem {
  icon: IconName;
  label: string;
  run: () => void;
  danger?: boolean;
}

export type ContextTarget =
  { kind: "background"; canCreateFolder: boolean } | { kind: "note"; note: Note };

export interface ContextMenuHandlers {
  onPasteLink: () => void;
  onSaveLink: () => void;
  onNewFolder: () => void;
  onOpen: (note: Note) => void;
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
