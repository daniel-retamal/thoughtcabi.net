export const ICON_NAMES = [
  "archive",
  "bookmark",
  "bookmark-plus",
  "book-open",
  "brain-circuit",
  "briefcase",
  "camera",
  "check",
  "cloud",
  "chevron-down",
  "chevron-right",
  "clipboard-paste",
  "code-xml",
  "coffee",
  "compass",
  "copy",
  "download",
  "external-link",
  "file-text",
  "flask-conical",
  "folder",
  "folder-plus",
  "folders",
  "gamepad-2",
  "github",
  "globe",
  "graduation-cap",
  "hard-drive",
  "house",
  "hash",
  "heart",
  "image-plus",
  "inbox",
  "layout-grid",
  "leaf",
  "lightbulb",
  "link",
  "list",
  "loader-circle",
  "map",
  "music",
  "newspaper",
  "palette",
  "panel-left",
  "pencil-line",
  "pen-tool",
  "plane",
  "play",
  "plus",
  "refresh-cw",
  "rotate-ccw",
  "search",
  "search-x",
  "server",
  "shopping-bag",
  "sliders-horizontal",
  "sparkles",
  "star",
  "tag",
  "terminal",
  "trash-2",
  "triangle-alert",
  "unplug",
  "upload",
  "x",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

const KNOWN = new Set<string>(ICON_NAMES);

export const FALLBACK_ICON: IconName = "hash";

export function isIconName(value: unknown): value is IconName {
  return typeof value === "string" && KNOWN.has(value);
}

export function toIconName(value: unknown): IconName {
  return isIconName(value) ? value : FALLBACK_ICON;
}
