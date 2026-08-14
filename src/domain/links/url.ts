import { titleCaseWords } from "@/lib/text";

const ABSOLUTE_URL = /^https?:\/\//i;
const BARE_DOMAIN = /^[\w.-]+\.[a-z]{2,}(\/|$)/i;
const FILE_EXTENSION = /\.(html?|php|aspx?)$/i;
const WORD_SEPARATORS = /[-_+]+/g;
const LONG_DIGIT_RUN = /\d{6,}/g;
const GENERIC_SEGMENT =
  /^(watch|index|home|item|abs|playlist|album|track|file|status|p|dp|en us|docs|questions)$/i;
const TRACKING_PARAM =
  /^(utm_[a-z_]+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|si|ref_src|ref_url|s_cid|yclid)$/i;

const MAX_SLUG_TITLE_LENGTH = 90;

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (ABSOLUTE_URL.test(trimmed)) return trimmed;
  return BARE_DOMAIN.test(trimmed) ? `https://${trimmed}` : null;
}

export function parseUrl(raw: string | null | undefined): URL | null {
  const normalized = normalizeUrl(raw ?? "");
  if (!normalized) return null;
  try {
    return new URL(normalized);
  } catch {
    return null;
  }
}

export function hostnameOf(url: URL): string {
  return url.hostname.replace(/^www\./, "").toLowerCase();
}

export function stripTracking(url: URL): URL {
  const cleaned = new URL(url.href);
  for (const key of [...cleaned.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) cleaned.searchParams.delete(key);
  }
  return cleaned;
}

export function canonicalUrl(raw: string | null | undefined): string | null {
  const parsed = parseUrl(raw);
  return parsed ? stripTracking(parsed).href : null;
}

export function absoluteUrl(base: string, href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed, base).href;
  } catch {
    return "";
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function wordsFromPath(pathname: string): string {
  if (!pathname) return "";

  const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "";
  const cleaned = safeDecode(lastSegment.replace(FILE_EXTENSION, ""))
    .replace(WORD_SEPARATORS, " ")
    .replace(LONG_DIGIT_RUN, "")
    .trim();

  if (cleaned.length < 3 || /^\d+$/.test(cleaned)) return "";
  if (GENERIC_SEGMENT.test(cleaned)) return "";

  return cleaned.slice(0, MAX_SLUG_TITLE_LENGTH);
}

export function titleFromPath(pathname: string): string {
  return titleCaseWords(wordsFromPath(pathname));
}

export function faviconUrl(url: URL): string {
  return new URL("/favicon.ico", url.origin).href;
}

export function originFaviconUrl(raw: string): string {
  const parsed = parseUrl(raw);
  return parsed ? faviconUrl(parsed) : "";
}
