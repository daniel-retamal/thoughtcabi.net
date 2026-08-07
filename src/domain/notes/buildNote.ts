import { createId } from "@/domain/ids";
import type { LibraryLocation, Note } from "@/domain/model";
import { recognizeLink } from "@/domain/links/recognizeLink";

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

const BLANK_LINK = {
  url: "",
  domain: "",
  siteName: "",
  cat: "note",
  catLabel: "",
  cover: null,
} as const;

export function buildNote(draft: NoteDraft, options: BuildNoteOptions = {}): Note {
  const recognized = draft.url ? recognizeLink(draft.url) : null;

  const base = {
    id: options.id ?? createId("n"),
    type: "note",
    addedAt: options.addedAt ?? Date.now(),
    title: draft.title,
    description: draft.description,
    tag: draft.tag,
  } as const;

  const note: Note = recognized
    ? {
        ...recognized,
        ...base,
        url: draft.url,
        title: draft.title || recognized.title,
        description: draft.description || recognized.description,
      }
    : { ...BLANK_LINK, ...base };

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
  return Boolean(note.image || (note.url && note.cover));
}
