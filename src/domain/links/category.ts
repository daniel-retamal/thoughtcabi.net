import type { SiteCategory } from "@/domain/model";

export const CATEGORY_LABELS: Readonly<Record<SiteCategory, string>> = {
  video: "Video",
  music: "Music",
  article: "Article",
  forum: "Discussion",
  dev: "Code",
  research: "Paper",
  design: "Design",
  link: "Link",
  note: "",
};

const HOST_CATEGORIES: ReadonlyArray<readonly [RegExp, SiteCategory]> = [
  [/^(www\.)?(youtube\.com|youtu\.be|vimeo\.com|twitch\.tv)$/, "video"],
  [/^(open\.spotify\.com|music\.apple\.com|soundcloud\.com|bandcamp\.com)$/, "music"],
  [/^(github\.com|gitlab\.com|stackoverflow\.com|developer\.mozilla\.org)$/, "dev"],
  [/^(arxiv\.org|.*\.arxiv\.org|pubmed\.ncbi\.nlm\.nih\.gov|.*\.acm\.org)$/, "research"],
  [/^(news\.ycombinator\.com|([a-z0-9-]+\.)?reddit\.com|redd\.it)$/, "forum"],
  [/^(www\.)?(figma\.com|dribbble\.com|behance\.net)$/, "design"],
];

const OG_TYPE_CATEGORIES: ReadonlyArray<readonly [RegExp, SiteCategory]> = [
  [/^video(\.|$)/, "video"],
  [/^music(\.|$)/, "music"],
  [/^article$/, "article"],
  [/^(book|profile)$/, "article"],
];

const RENAMED_CATEGORIES: Readonly<Record<string, SiteCategory>> = { hn: "forum" };

export function toSiteCategory(value: unknown): SiteCategory | null {
  if (typeof value !== "string") return null;
  const id = RENAMED_CATEGORIES[value] ?? value;
  return id in CATEGORY_LABELS ? (id as SiteCategory) : null;
}

export function categoryFromHost(hostname: string): SiteCategory | null {
  for (const [pattern, category] of HOST_CATEGORIES) {
    if (pattern.test(hostname)) return category;
  }
  return null;
}

export function categoryFromOgType(ogType: string): SiteCategory | null {
  const normalized = ogType.trim().toLowerCase();
  if (!normalized) return null;
  for (const [pattern, category] of OG_TYPE_CATEGORIES) {
    if (pattern.test(normalized)) return category;
  }
  return null;
}

export function categoryFor(hostname: string, ogType = ""): SiteCategory {
  return categoryFromHost(hostname) ?? categoryFromOgType(ogType) ?? "link";
}

export function labelFor(category: SiteCategory): string {
  return CATEGORY_LABELS[category];
}
