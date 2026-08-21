import type { LibraryLocation, NodeId } from "@/domain/model";

export type DragKind = "item" | "folder" | "shelf" | "tag";

export interface NodeDrag {
  kind: "item" | "folder" | "shelf";
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

export interface ReorderShelfTarget {
  type: "reorder-shelf";
  beforeId: NodeId | null;
  line: InsertionLine;
}

export interface ReorderTagTarget {
  type: "reorder-tag";
  beforeTag: string | null;
  line: InsertionLine;
}

export type DropTarget =
  | AssignTagTarget
  | IntoFolderTarget
  | IntoLocationTarget
  | ReorderTarget
  | ReorderShelfTarget
  | ReorderTagTarget;

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
