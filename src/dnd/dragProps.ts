import type { PointerEvent as ReactPointerEvent } from "react";
import type { Folder, LibraryLocation, NodeId, Shelf, Tag } from "@/domain/model";
import { serializeLocation } from "./attributes";
import { dragController } from "./controller";
import type { DragPayload } from "./types";

type PointerHandler = (event: ReactPointerEvent<HTMLElement>) => void;

function beginDrag(drag: DragPayload): PointerHandler {
  return (event) => {
    dragController.start(event, drag, event.currentTarget);
  };
}

export interface ItemDragProps {
  "data-drag-kind": "item";
  "data-drag-id": NodeId;
  "data-tag-droppable": "";
  onPointerDown: PointerHandler;
}

export function itemDragProps(noteId: NodeId): ItemDragProps {
  return {
    "data-drag-kind": "item",
    "data-drag-id": noteId,
    "data-tag-droppable": "",
    onPointerDown: beginDrag({ kind: "item", id: noteId }),
  };
}

export interface FolderDragProps {
  "data-drag-kind": "folder";
  "data-drag-id": NodeId;
  "data-folder-target": NodeId;
  onPointerDown: PointerHandler;
}

export function folderDragProps(folder: Folder): FolderDragProps {
  return {
    "data-drag-kind": "folder",
    "data-drag-id": folder.id,
    "data-folder-target": folder.id,
    onPointerDown: beginDrag({ kind: "folder", id: folder.id }),
  };
}

export interface ShelfDragProps {
  "data-shelf-row": "";
  "data-shelf-target": "";
  "data-drag-kind": "shelf";
  "data-drag-id": NodeId;
  "data-nav": string;
  "data-spring": "";
  onPointerDown: PointerHandler;
}

export function shelfDragProps(shelf: Shelf): ShelfDragProps {
  return {
    "data-shelf-row": "",
    "data-shelf-target": "",
    "data-drag-kind": "shelf",
    "data-drag-id": shelf.id,
    "data-nav": serializeLocation({ shelfId: shelf.id, path: [] }),
    "data-spring": "",
    onPointerDown: beginDrag({ kind: "shelf", id: shelf.id }),
  };
}

export interface TagDragProps {
  onPointerDown: PointerHandler;
}

export function tagDragProps(tag: Tag): TagDragProps {
  return {
    onPointerDown: beginDrag({ kind: "tag", tag: tag.name, label: tag.name, color: tag.color }),
  };
}

export interface CrumbDropProps {
  "data-crumb": "";
  "data-nav": string;
  "data-spring": "";
}

export function crumbDropProps(location: LibraryLocation): CrumbDropProps {
  return {
    "data-crumb": "",
    "data-nav": serializeLocation(location),
    "data-spring": "",
  };
}

export interface LocationDropProps {
  "data-location-drop": "";
  "data-nav": string;
}

export function locationDropProps(location: LibraryLocation): LocationDropProps {
  return {
    "data-location-drop": "",
    "data-nav": serializeLocation(location),
  };
}

export interface ZoneProps {
  "data-zone": "grid" | "list";
}

export function zoneProps(zone: "grid" | "list"): ZoneProps {
  return { "data-zone": zone };
}
