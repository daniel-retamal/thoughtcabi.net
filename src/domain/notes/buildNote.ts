import { createId } from "@/domain/ids";
import { emptyPreview, previewToNote, type LinkPreview } from "@/domain/links/linkPreview";
import { canonicalUrl, hostnameOf, originFaviconUrl } from "@/domain/links/url";
import type { LibraryLocation, Note } from "@/domain/model";
import { previewFromUrl } from "@/domain/links/fromUrl";

export interface NoteDraft {
  url: string;
  title: string;
  description: string;
  tag: string;
  image: string;
  destination: LibraryLocation;
}

export interface BuildNoteOptions {
  id?: string;
  addedAt?: number;
}

const BLANK_LINK: LinkPreview = { ...emptyPreview("", ""), cat: "note" };

function linkFor(draft: NoteDraft, preview: LinkPreview | null): LinkPreview {
  const canonical = canonicalUrl(draft.url);
  if (!canonical) return BLANK_LINK;
  if (preview && canonicalUrl(preview.url) === canonical) return preview;
  return previewFromUrl(new URL(canonical));
}

export function buildNote(
  draft: NoteDraft,
  preview: LinkPreview | null = null,
  options: BuildNoteOptions = {},
): Note {
  const link = linkFor(draft, preview);

  const note = previewToNote(
    {
      ...link,
      title: draft.title || link.title,
      description: draft.description || link.description,
    },
    {
      id: options.id ?? createId("n"),
      addedAt: options.addedAt ?? Date.now(),
      tag: draft.tag,
    },
  );

  return draft.image ? { ...note, image: draft.image } : note;
}

export function draftFromNote(note: Note, destination: LibraryLocation): NoteDraft {
  return {
    url: note.url,
    title: note.title,
    description: note.description,
    tag: note.tag,
    image: note.image ?? "",
    destination,
  };
}

export function hasThumbnail(note: Note): boolean {
  return Boolean(note.image || note.siteImage);
}

export function siteIconFor(note: Note): string {
  return note.favicon || originFaviconUrl(note.url);
}

export function hasCover(note: Note): boolean {
  return hasThumbnail(note) || Boolean(siteIconFor(note));
}

export function domainOf(rawUrl: string): string {
  const canonical = canonicalUrl(rawUrl);
  return canonical ? hostnameOf(new URL(canonical)) : "";
}
