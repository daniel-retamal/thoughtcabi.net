import type { Note, SiteCategory } from "@/domain/model";
import { labelFor } from "./category";

export interface LinkPreview {
  url: string;
  domain: string;
  title: string;
  description: string;
  siteName: string;
  image: string;
  favicon: string;
  cat: SiteCategory;
}

export interface NoteIdentity {
  id: string;
  addedAt: number;
  tag?: string;
}

const TEXT_FIELDS = ["title", "description", "siteName", "image", "favicon"] as const;

export function emptyPreview(url: string, domain: string): LinkPreview {
  return {
    url,
    domain,
    title: "",
    description: "",
    siteName: "",
    image: "",
    favicon: "",
    cat: "link",
  };
}

export function mergePreview(base: LinkPreview, patch: Partial<LinkPreview>): LinkPreview {
  const merged = { ...base };

  for (const field of TEXT_FIELDS) {
    if (!merged[field]) merged[field] = patch[field]?.trim() ?? "";
  }

  if (merged.cat === "link" && patch.cat) merged.cat = patch.cat;
  if (patch.url) merged.url = patch.url;
  if (patch.domain) merged.domain = patch.domain;

  return merged;
}

export function previewFromNote(note: Note): LinkPreview {
  return {
    url: note.url,
    domain: note.domain,
    title: note.title,
    description: note.description,
    siteName: note.siteName,
    image: note.siteImage ?? "",
    favicon: note.favicon ?? "",
    cat: note.cat,
  };
}

export function previewToNote(preview: LinkPreview, identity: NoteIdentity): Note {
  const note: Note = {
    id: identity.id,
    type: "note",
    title: preview.title,
    description: preview.description,
    tag: identity.tag ?? "",
    addedAt: identity.addedAt,
    url: preview.url,
    domain: preview.domain,
    siteName: preview.siteName,
    cat: preview.cat,
    catLabel: labelFor(preview.cat),
  };

  return {
    ...note,
    ...(preview.image ? { siteImage: preview.image } : {}),
    ...(preview.favicon ? { favicon: preview.favicon } : {}),
  };
}
