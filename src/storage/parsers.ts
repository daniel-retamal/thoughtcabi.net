import {
  DEFAULT_VIEW_MODE,
  type Cabinet,
  type Channel,
  type Folder,
  type Library,
  type LibraryNode,
  type Note,
  type NoteEntry,
  type Preferences,
  type SiteCategory,
  type Tag,
  type ViewMode,
} from "@/domain/model";
import { asNumber, asRecord, asText, type JsonRecord } from "@/lib/json";
import { toIconName } from "@/icons/names";
import { DEFAULT_APPEARANCE, toCardSurface, toColorId } from "@/theme/colors";

const SITE_CATEGORIES = new Set<string>([
  "video",
  "music",
  "article",
  "hn",
  "dev",
  "research",
  "design",
  "link",
  "note",
]);

const str = asText;
const num = asNumber;
const isDict = (value: unknown): value is JsonRecord => asRecord(value) !== null;

function category(value: unknown): SiteCategory {
  return SITE_CATEGORIES.has(str(value)) ? (value as SiteCategory) : "link";
}

function withOptional(note: Note, value: JsonRecord): Note {
  const optional: Partial<Note> = {};
  for (const field of ["image", "siteImage", "favicon"] as const) {
    const text = str(value[field]);
    if (text) optional[field] = text;
  }
  return { ...note, ...optional };
}

function parseNote(value: JsonRecord): NoteEntry | null {
  const id = str(value.id);
  if (!id) return null;

  if (value.loading === true) {
    return {
      id,
      type: "note",
      url: str(value.url),
      addedAt: num(value.addedAt, Date.now()),
      loading: true,
    };
  }

  const note: Note = {
    id,
    type: "note",
    title: str(value.title),
    description: str(value.description),
    tag: str(value.tag),
    addedAt: num(value.addedAt, Date.now()),
    url: str(value.url),
    domain: str(value.domain),
    siteName: str(value.siteName),
    cat: category(value.cat),
    catLabel: str(value.catLabel),
  };

  return withOptional(note, value);
}

function parseFolder(value: JsonRecord): Folder | null {
  const id = str(value.id);
  if (!id) return null;
  return {
    id,
    type: "folder",
    name: str(value.name, "Untitled folder"),
    children: parseNodes(value.children),
  };
}

function parseNodes(value: unknown): LibraryNode[] {
  if (!Array.isArray(value)) return [];
  const nodes: LibraryNode[] = [];
  for (const entry of value) {
    if (!isDict(entry)) continue;
    const node = entry.type === "folder" ? parseFolder(entry) : parseNote(entry);
    if (node) nodes.push(node);
  }
  return nodes;
}

function parseChannel(value: unknown): Channel | null {
  if (!isDict(value)) return null;
  const id = str(value.id);
  if (!id) return null;
  return {
    id,
    name: str(value.name, "Untitled channel"),
    icon: toIconName(value.icon),
    children: parseNodes(value.children),
  };
}

export function parseLibrary(value: unknown): Library | null {
  if (!Array.isArray(value)) return null;
  const channels = value
    .map(parseChannel)
    .filter((channel): channel is Channel => channel !== null);
  return channels.length > 0 ? channels : null;
}

export function parseTags(value: unknown): Tag[] | null {
  if (!Array.isArray(value)) return null;
  const tags: Tag[] = [];
  for (const entry of value) {
    if (!isDict(entry)) continue;
    const name = str(entry.name);
    const color = str(entry.color);
    if (name && color) tags.push({ name, color });
  }
  return tags;
}

export function parseViewMode(value: unknown): ViewMode | null {
  return value === "grid" || value === "list" ? value : null;
}

export function parseCabinet(value: unknown): Cabinet | null {
  const record = asRecord(value);
  if (!record) return null;

  const library = parseLibrary(record.library);
  if (!library) return null;

  return { library, tags: parseTags(record.tags) ?? [] };
}

export function parsePreferences(value: unknown): Preferences | null {
  const record = asRecord(value);
  if (!record) return null;

  return {
    view: parseViewMode(record.view) ?? DEFAULT_VIEW_MODE,
    color: toColorId(record.color ?? record.palette) ?? DEFAULT_APPEARANCE.color,
    cards: toCardSurface(record.cards) ?? DEFAULT_APPEARANCE.cards,
    onboarded: record.onboarded === true,
  };
}
