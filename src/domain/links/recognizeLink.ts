import type { Cover, LinkMetadata, SiteCategory } from "@/domain/model";
import { hashString, pickBySeed } from "@/lib/hash";
import { capitalizeFirstWord, leadingLetter, titleCaseWords } from "@/lib/text";
import { CATEGORY_LABELS, findSiteProfile, type SiteProfile } from "./siteCatalog";

export interface RecognizedLink extends LinkMetadata {
  title: string;
  description: string;
  cover: Cover;
}

const ABSOLUTE_URL = /^https?:\/\//i;
const BARE_DOMAIN = /^[\w.-]+\.[a-z]{2,}(\/|$)/i;
const FILE_EXTENSION = /\.(html?|php|aspx?)$/i;
const QUERY_OR_FRAGMENT = /[?#].*$/;
const WORD_SEPARATORS = /[-_+]+/g;
const LONG_DIGIT_RUN = /\d{6,}/g;
const GENERIC_SEGMENT =
  /^(watch|index|home|item|abs|playlist|album|track|file|status|p|dp|en us|docs|questions)$/i;

const COVER_PATTERN_COUNT = 4;
const MAX_SLUG_TITLE_LENGTH = 90;

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (ABSOLUTE_URL.test(trimmed)) return trimmed;
  return BARE_DOMAIN.test(trimmed) ? `https://${trimmed}` : null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function titleFromPath(pathname: string): string {
  if (!pathname) return "";

  const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "";
  const cleaned = safeDecode(lastSegment.replace(FILE_EXTENSION, "").replace(QUERY_OR_FRAGMENT, ""))
    .replace(WORD_SEPARATORS, " ")
    .replace(LONG_DIGIT_RUN, "")
    .trim();

  if (cleaned.length < 3 || /^\d+$/.test(cleaned)) return "";
  if (GENERIC_SEGMENT.test(cleaned)) return "";

  return titleCaseWords(cleaned).slice(0, MAX_SLUG_TITLE_LENGTH);
}

function makeCover(color: string, glyph: string, cat: SiteCategory, seed: number): Cover {
  return { color, glyph, cat, pattern: Math.abs(seed) % COVER_PATTERN_COUNT };
}

function fromKnownSite(
  url: string,
  site: SiteProfile,
  slugTitle: string,
  seed: number,
): RecognizedLink {
  return {
    url,
    domain: site.domain,
    title: slugTitle || (pickBySeed(site.titles, seed) ?? ""),
    description: pickBySeed(site.descriptions, seed >> 2) ?? "",
    cat: site.cat,
    catLabel: CATEGORY_LABELS[site.cat] || "Link",
    siteName: site.name,
    cover: makeCover(site.color, site.glyph, site.cat, seed),
  };
}

function fromUnknownHost(
  url: string,
  host: string,
  slugTitle: string,
  seed: number,
): RecognizedLink {
  const hue = hashString(host) % 360;
  const label = capitalizeFirstWord(host.split(".")[0] ?? host);

  return {
    url,
    domain: host,
    title: slugTitle || `${label} — saved link`,
    description: `Saved from ${host}. Open to read the full page.`,
    cat: "link",
    catLabel: "Link",
    siteName: host,
    cover: makeCover(`hsl(${hue} 55% 45%)`, leadingLetter(host), "link", seed),
  };
}

export function recognizeLink(raw: string | null | undefined): RecognizedLink | null {
  const url = normalizeUrl(raw ?? "");
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace(/^www\./, "");
  const seed = hashString(url);
  const slugTitle = titleFromPath(parsed.pathname);
  const match = findSiteProfile(hostname);

  return match
    ? fromKnownSite(url, match.site, slugTitle, seed)
    : fromUnknownHost(url, hostname, slugTitle, seed);
}

export function isRecognizableLink(raw: string | null | undefined): boolean {
  return recognizeLink(raw) !== null;
}
