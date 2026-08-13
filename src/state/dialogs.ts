import type { Folder, Note, Shelf, Tag } from "@/domain/model";

export type Dialog =
  | { kind: "detail"; note: Note }
  | { kind: "compose"; mode: "new" }
  | { kind: "compose"; mode: "edit"; note: Note }
  | { kind: "shelf"; mode: "new" }
  | { kind: "shelf"; mode: "edit"; shelf: Shelf }
  | { kind: "tag"; mode: "new"; color: string }
  | { kind: "tag"; mode: "edit"; tag: Tag }
  | { kind: "new-folder" }
  | { kind: "rename-folder"; folder: Folder }
  | { kind: "transfer" };
