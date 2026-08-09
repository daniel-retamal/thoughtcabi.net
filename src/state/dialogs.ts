import type { Channel, Folder, Note, Tag } from "@/domain/model";

export type Dialog =
  | { kind: "detail"; note: Note }
  | { kind: "compose"; mode: "new" }
  | { kind: "compose"; mode: "edit"; note: Note }
  | { kind: "channel"; mode: "new" }
  | { kind: "channel"; mode: "edit"; channel: Channel }
  | { kind: "tag"; mode: "new"; color: string }
  | { kind: "tag"; mode: "edit"; tag: Tag }
  | { kind: "new-folder" }
  | { kind: "rename-folder"; folder: Folder }
  | { kind: "transfer" };
