import { categoryFor } from "./category";
import { imageSizeFrom, isPreviewSized } from "./imageCandidate";
import { emptyPreview, type LinkPreview } from "./linkPreview";
import { absoluteUrl, faviconUrl, hostnameOf, titleFromPath } from "./url";

export type MetaTags = Readonly<Record<string, string>>;

export interface PageContent {
  tags: MetaTags;
  title: string;
  firstParagraph: string;
  iconHref: string;
}

const TITLE_KEYS = ["og:title", "twitter:title"] as const;
const DESCRIPTION_KEYS = ["og:description", "twitter:description", "description"] as const;
const IMAGE_KEYS = ["og:image", "og:image:secure_url", "og:image:url", "twitter:image"] as const;
const IMAGE_WIDTH_KEYS = ["og:image:width", "twitter:image:width"] as const;
const IMAGE_HEIGHT_KEYS = ["og:image:height", "twitter:image:height"] as const;

export function emptyPage(): PageContent {
  return { tags: {}, title: "", firstParagraph: "", iconHref: "" };
}

function firstFilled(tags: MetaTags, keys: readonly string[]): string {
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return "";
}

function declaredImageIsUsable(tags: MetaTags): boolean {
  const declared = imageSizeFrom(
    firstFilled(tags, IMAGE_WIDTH_KEYS),
    firstFilled(tags, IMAGE_HEIGHT_KEYS),
  );
  return declared === null || isPreviewSized(declared);
}

export function previewFromPage(page: PageContent, url: URL): LinkPreview {
  const { tags } = page;
  const preview = emptyPreview(url.href, hostnameOf(url));

  preview.title = firstFilled(tags, TITLE_KEYS) || page.title.trim() || titleFromPath(url.pathname);
  preview.description = firstFilled(tags, DESCRIPTION_KEYS) || page.firstParagraph.trim();
  preview.siteName = tags["og:site_name"]?.trim() ?? "";
  preview.cat = categoryFor(preview.domain, tags["og:type"] ?? "");

  const image = firstFilled(tags, IMAGE_KEYS);
  preview.image = image && declaredImageIsUsable(tags) ? absoluteUrl(url.href, image) : "";

  preview.favicon = page.iconHref ? absoluteUrl(url.href, page.iconHref) : faviconUrl(url);

  return preview;
}
