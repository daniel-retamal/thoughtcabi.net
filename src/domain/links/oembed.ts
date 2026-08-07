import { asRecord, asText } from "@/lib/json";
import { categoryFor } from "./category";
import { emptyPreview, type LinkPreview } from "./linkPreview";
import { faviconUrl, hostnameOf } from "./url";

export function previewFromOEmbed(payload: unknown, url: URL): LinkPreview | null {
  const record = asRecord(payload);
  if (!record) return null;

  const title = asText(record.title).trim();
  const thumbnail = asText(record.thumbnail_url).trim();
  if (!title && !thumbnail) return null;

  const preview = emptyPreview(url.href, hostnameOf(url));
  preview.title = title;
  preview.description = asText(record.author_name).trim();
  preview.siteName = asText(record.provider_name).trim();
  preview.image = thumbnail;
  preview.favicon = faviconUrl(url);
  preview.cat = categoryFor(preview.domain, asText(record.type));

  return preview;
}
