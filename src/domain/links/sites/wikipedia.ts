import { asRecord, asText, at } from "@/lib/json";
import { emptyPreview, type LinkPreview } from "../linkPreview";
import { faviconUrl, hostnameOf } from "../url";

const WIKIPEDIA_HOST = /^([a-z-]+\.)?wikipedia\.org$/;
const ARTICLE_PATH = /^\/wiki\/([^/]+)$/;

export function wikipediaArticle(url: URL): string {
  if (!WIKIPEDIA_HOST.test(hostnameOf(url))) return "";
  return ARTICLE_PATH.exec(url.pathname)?.[1] ?? "";
}

export function isWikipediaUrl(url: URL): boolean {
  return wikipediaArticle(url) !== "";
}

export function wikipediaSummaryUrl(url: URL, article: string): string {
  return `${url.origin}/api/rest_v1/page/summary/${article}`;
}

export function previewFromWikipedia(payload: unknown, url: URL): LinkPreview | null {
  const record = asRecord(payload);
  if (!record) return null;

  const title = asText(record.title).trim();
  if (!title) return null;

  const preview = emptyPreview(url.href, hostnameOf(url));
  preview.title = title;
  preview.description = asText(record.extract).trim();
  preview.siteName = "Wikipedia";
  preview.image = asText(at(record, "thumbnail", "source")).trim();
  preview.favicon = faviconUrl(url);
  preview.cat = "research";

  return preview;
}
