import type { RemoteHead } from "./types";

export const DRIVE_API = "https://www.googleapis.com";
export const DRIVE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export const FILE_FIELDS = "id,name,headRevisionId,modifiedTime";
export const LIST_FIELDS = `files(${FILE_FIELDS})`;

export const DRIVE_LABEL = "Google Drive";

export interface DriveFile {
  id: string;
  name: string;
  revision: string;
  modifiedAt: number | null;
}

function quoted(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export function nameQuery(name: string): string {
  return `name = ${quoted(name)} and trashed = false`;
}

export const MINE_QUERY = "trashed = false";

function timeOf(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : at;
}

export function fileFrom(payload: unknown): DriveFile | null {
  if (typeof payload !== "object" || payload === null) return null;

  const record = payload as Record<string, unknown>;
  const { id, name, headRevisionId: revision } = record;
  if (typeof id !== "string" || typeof name !== "string") return null;

  return {
    id,
    name,
    revision: typeof revision === "string" ? revision : id,
    modifiedAt: timeOf(record.modifiedTime),
  };
}

export function filesFrom(payload: unknown): DriveFile[] {
  const listed = (payload as { files?: unknown } | null)?.files;
  if (!Array.isArray(listed)) return [];

  return listed
    .map((entry) => fileFrom(entry))
    .filter((file): file is DriveFile => file !== null);
}

export function headOf(file: DriveFile): RemoteHead {
  return { revision: file.revision, modifiedAt: file.modifiedAt };
}

export function accountFrom(payload: unknown): string | null {
  const user = (payload as { user?: { emailAddress?: unknown } } | null)?.user;
  const address = user?.emailAddress;
  return typeof address === "string" && address !== "" ? address : null;
}

export const MULTIPART_BOUNDARY = "thoughtcabinet-boundary";

export function multipartType(boundary = MULTIPART_BOUNDARY): string {
  return `multipart/related; boundary=${boundary}`;
}

export function multipartBody(
  metadata: Record<string, string>,
  text: string,
  boundary = MULTIPART_BOUNDARY,
): string {
  return [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    text,
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export function reasonFrom(payload: unknown): string | null {
  const errors = (payload as { error?: { errors?: unknown } } | null)?.error?.errors;
  const first: unknown = Array.isArray(errors) ? errors[0] : null;
  const reason = (first as { reason?: unknown } | null)?.reason;
  return typeof reason === "string" ? reason : null;
}
