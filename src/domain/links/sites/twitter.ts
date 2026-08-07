import { asArray, asRecord, asText, at } from "@/lib/json";
import { emptyPreview, type LinkPreview } from "../linkPreview";
import { hostnameOf } from "../url";

const TWITTER_HOSTS = /^(twitter\.com|x\.com|mobile\.twitter\.com|nitter\.net)$/;
const STATUS_PATH = /^\/[^/]+\/status(?:es)?\/(\d+)/;

export function tweetId(url: URL): string {
  if (!TWITTER_HOSTS.test(hostnameOf(url))) return "";
  return STATUS_PATH.exec(url.pathname)?.[1] ?? "";
}

export function isTweetUrl(url: URL): boolean {
  return tweetId(url) !== "";
}

export function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

export function syndicationUrl(id: string): string {
  const token = syndicationToken(id);
  return `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`;
}

export function previewFromTweet(payload: unknown, url: URL): LinkPreview | null {
  const record = asRecord(payload);
  if (!record) return null;

  const text = asText(record.text).trim();
  const name = asText(at(record, "user", "name")).trim();
  const handle = asText(at(record, "user", "screen_name")).trim();
  if (!text && !name) return null;

  const preview = emptyPreview(url.href, hostnameOf(url));
  preview.title = name && handle ? `${name} (@${handle}) on X` : name;
  preview.description = text;
  preview.siteName = "X";
  preview.favicon = "https://abs.twimg.com/favicons/twitter.3.ico";

  const media = asRecord(asArray(record.mediaDetails)[0]);
  preview.image = media ? asText(media.media_url_https) : "";

  return preview;
}
