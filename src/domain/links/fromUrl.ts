import { categoryFor } from "./category";
import { emptyPreview, type LinkPreview } from "./linkPreview";
import { faviconUrl, hostnameOf, titleFromPath } from "./url";

export function previewFromUrl(url: URL): LinkPreview {
  const preview = emptyPreview(url.href, hostnameOf(url));
  preview.title = titleFromPath(url.pathname);
  preview.favicon = faviconUrl(url);
  preview.cat = categoryFor(preview.domain);
  return preview;
}
