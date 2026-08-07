import type {
  Channel,
  Cover,
  Folder,
  Library,
  LibraryNode,
  Note,
  NoteEntry,
  SiteCategory,
  Tag,
  ViewMode,
} from "@/domain/model";
import { toIconName } from "@/icons/names";

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

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function category(value: unknown): SiteCategory {
  return SITE_CATEGORIES.has(str(value)) ? (value as SiteCategory) : "link";
}

function parseCover(value: unknown): Cover | null {
  if (!isDict(value)) return null;
  return {
    color: str(value.color, "#888"),
    glyph: str(value.glyph, "•"),
    cat: category(value.cat),
    pattern: num(value.pattern, 0),
  };
}

function parseNote(value: Dict): NoteEntry | null {
  const id = str(value.id);
  if (!id) return null;

  if (value.loading === true) return { id, type: "note", loading: true };

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
    cover: parseCover(value.cover),
  };

  const image = str(value.image);
  return image ? { ...note, image } : note;
}

function parseFolder(value: Dict): Folder | null {
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
