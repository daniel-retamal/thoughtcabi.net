import type { LibraryLocation, NodeId } from "@/domain/model";

export type DragKind = "item" | "folder" | "channel" | "tag";

export interface NodeDrag {
  kind: "item" | "folder" | "channel";
  id: NodeId;
}

export interface TagDrag {
  kind: "tag";
  tag: string;
  label: string;
  color: string;
}

export type DragPayload = NodeDrag | TagDrag;

export type Axis = "x" | "y";

export interface InsertionLine {
  axis: Axis;
  position: number;
  crossStart: number;
  crossSize: number;
}

export interface AssignTagTarget {
  type: "assign-tag";
  noteId: NodeId;
  tag: string;
  element: HTMLElement;
}

export interface IntoFolderTarget {
  type: "into-folder";
  folderId: NodeId;
  element: HTMLElement;
}

export interface IntoLocationTarget {
  type: "into-nav";
  location: LibraryLocation;
  element: HTMLElement;
}

export interface ReorderTarget {
  type: "reorder";
  location: LibraryLocation;
  beforeId: NodeId | null;
  line: InsertionLine;
  element: HTMLElement;
}

export interface ReorderChannelTarget {
  type: "reorder-channel";
  beforeId: NodeId | null;
  line: InsertionLine;
}

export type DropTarget =
  AssignTagTarget | IntoFolderTarget | IntoLocationTarget | ReorderTarget | ReorderChannelTarget;

export interface DragCallbacks {
  onDrop(drag: DragPayload, target: DropTarget): void;
  onNavigate(location: LibraryLocation): void;
  validate(drag: DragPayload, target: DropTarget): boolean;
  onStart(drag: DragPayload): void;
  onEnd(committed: boolean): void;
}

export interface Point {
  x: number;
  y: number;
}
