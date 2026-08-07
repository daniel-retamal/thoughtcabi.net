import type { IconName } from "@/icons/names";

export type NodeId = string;

export type SiteCategory =
  "video" | "music" | "article" | "hn" | "dev" | "research" | "design" | "link" | "note";

export interface LinkMetadata {
  url: string;
  domain: string;
  siteName: string;
  cat: SiteCategory;
  catLabel: string;
}

export interface Note extends LinkMetadata {
  id: NodeId;
  type: "note";
  title: string;
  description: string;
  tag: string;
  addedAt: number;
  image?: string;
  siteImage?: string;
  favicon?: string;
  loading?: false;
}

export interface PendingNote {
  id: NodeId;
  type: "note";
  url: string;
  loading: true;
}

export type NoteEntry = Note | PendingNote;

export interface Folder {
  id: NodeId;
  type: "folder";
  name: string;
  children: LibraryNode[];
}

export type LibraryNode = NoteEntry | Folder;

export interface Channel {
  id: NodeId;
  name: string;
  icon: IconName;
  children: LibraryNode[];
}

export type Library = Channel[];

export interface Tag {
  name: string;
  color: string;
}

export type ViewMode = "grid" | "list";

export interface LibraryLocation {
  channelId: NodeId;
  path: NodeId[];
}

export interface NodeContainer {
  children?: LibraryNode[];
}

export function isFolder(node: LibraryNode): node is Folder {
  return node.type === "folder";
}

export function isNoteEntry(node: LibraryNode): node is NoteEntry {
  return node.type === "note";
}

export function isPendingNote(node: LibraryNode): node is PendingNote {
  return node.type === "note" && node.loading === true;
}

export function isNote(node: LibraryNode): node is Note {
  return node.type === "note" && node.loading !== true;
}

export function sameLocation(a: LibraryLocation | null, b: LibraryLocation | null): boolean {
  if (!a || !b) return false;
  return a.channelId === b.channelId && a.path.join("/") === b.path.join("/");
}
