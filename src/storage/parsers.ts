import {
  DEFAULT_LOCALE,
  DEFAULT_SIDEBAR_MODE,
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_VIEW_MODE,
  LOCALES,
  type Cabinet,
  type Folder,
  type Library,
  type LibraryNode,
  type Locale,
  type Note,
  type NoteEntry,
  type Preferences,
  type Shelf,
  type SidebarMode,
  type SiteCategory,
  type Tag,
  type ViewMode,
} from "@/domain/model";
import { toSiteCategory } from "@/domain/links/category";
import { asNumber, asRecord, asText, type JsonRecord } from "@/lib/json";
import { toIconName } from "@/icons/names";
import { toStoredWidth } from "@/lib/sidebarWidth";
import type { CabinetNames } from "./names";
import { DEFAULT_APPEARANCE, toCardSurface, toColorId } from "@/theme/colors";

const str = asText;
const num = asNumber;
const isDict = (value: unknown): value is JsonRecord => asRecord(value) !== null;

function category(value: unknown): SiteCategory {
  return toSiteCategory(value) ?? "link";
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

function parseFolder(value: JsonRecord, names: CabinetNames): Folder | null {
  const id = str(value.id);
  if (!id) return null;
  return {
    id,
    type: "folder",
    name: str(value.name, names.untitledFolder),
    children: parseNodes(value.children, names),
  };
}

function parseNodes(value: unknown, names: CabinetNames): LibraryNode[] {
  if (!Array.isArray(value)) return [];
  const nodes: LibraryNode[] = [];
  for (const entry of value) {
    if (!isDict(entry)) continue;
    const node = entry.type === "folder" ? parseFolder(entry, names) : parseNote(entry);
    if (node) nodes.push(node);
  }
  return nodes;
}

function parseShelf(value: unknown, names: CabinetNames): Shelf | null {
  if (!isDict(value)) return null;
  const id = str(value.id);
  if (!id) return null;
  return {
    id,
    name: str(value.name, names.untitledShelf),
    icon: toIconName(value.icon),
    children: parseNodes(value.children, names),
  };
}

export function parseLibrary(value: unknown, names: CabinetNames): Library | null {
  if (!Array.isArray(value)) return null;
  const shelves = value
    .map((entry) => parseShelf(entry, names))
    .filter((shelf): shelf is Shelf => shelf !== null);
  return shelves.length > 0 ? shelves : null;
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

export function parseCabinet(value: unknown, names: CabinetNames): Cabinet | null {
  const record = asRecord(value);
  if (!record) return null;

  const library = parseLibrary(record.library, names);
  if (!library) return null;

  return { library, tags: parseTags(record.tags) ?? [] };
}

export function toLocale(value: unknown): Locale | null {
  return LOCALES.find((locale) => locale === value) ?? null;
}

export function toSidebarMode(value: unknown): SidebarMode | null {
  return value === "wide" || value === "rail" ? value : null;
}

export function toSidebarWidth(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return toStoredWidth(value);
}

export function parsePreferences(value: unknown): Preferences | null {
  const record = asRecord(value);
  if (!record) return null;

  return {
    view: parseViewMode(record.view) ?? DEFAULT_VIEW_MODE,
    sidebar: toSidebarMode(record.sidebar) ?? DEFAULT_SIDEBAR_MODE,
    sidebarWidth: toSidebarWidth(record.sidebarWidth) ?? DEFAULT_SIDEBAR_WIDTH,
    color: toColorId(record.color ?? record.palette) ?? DEFAULT_APPEARANCE.color,
    cards: toCardSurface(record.cards) ?? DEFAULT_APPEARANCE.cards,
    language: toLocale(record.language) ?? DEFAULT_LOCALE,
    onboarded: record.onboarded === true,
  };
}
