import { asRecord, asText, at } from "@/lib/json";
import { emptyPreview, type LinkPreview } from "../linkPreview";
import { faviconUrl, hostnameOf } from "../url";

const BLUESKY_HOST = /^bsky\.app$/;
const POST_PATH = /^\/profile\/([^/]+)\/post\/([^/]+)$/;

export interface BlueskyPost {
  handle: string;
  rkey: string;
}

export function blueskyPost(url: URL): BlueskyPost | null {
  if (!BLUESKY_HOST.test(hostnameOf(url))) return null;

  const match = POST_PATH.exec(url.pathname);
  const handle = match?.[1];
  const rkey = match?.[2];
  if (!handle || !rkey) return null;

  return { handle, rkey };
}

export function blueskyRecordUrl({ handle, rkey }: BlueskyPost): string {
  const params = new URLSearchParams({
    repo: handle,
    collection: "app.bsky.feed.post",
    rkey,
  });
  return `https://public.api.bsky.app/xrpc/com.atproto.repo.getRecord?${params.toString()}`;
}

export function previewFromBluesky(payload: unknown, url: URL, handle: string): LinkPreview | null {
  const record = asRecord(payload);
  if (!record) return null;

  const text = asText(at(record, "value", "text")).trim();
  if (!text) return null;

  const preview = emptyPreview(url.href, hostnameOf(url));
  preview.title = `@${handle} on Bluesky`;
  preview.description = text;
  preview.siteName = "Bluesky";
  preview.favicon = faviconUrl(url);

  return preview;
}
