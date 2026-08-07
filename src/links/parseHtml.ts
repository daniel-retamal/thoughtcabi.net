import { emptyPage, type MetaTags, type PageContent } from "@/domain/links/metaTags";
import { bestIconHref, type IconLink } from "@/domain/links/siteIcon";

const LINK_SELECTOR = "link[rel][href]";
const MIN_PARAGRAPH_LENGTH = 40;

function metaTagsFrom(document: Document): MetaTags {
  const tags: Record<string, string> = {};

  for (const element of document.querySelectorAll("meta")) {
    const key = (element.getAttribute("property") ?? element.getAttribute("name") ?? "")
      .trim()
      .toLowerCase();
    const content = element.getAttribute("content")?.trim();
    if (key && content && !tags[key]) tags[key] = content;
  }

  return tags;
}

function iconLinksFrom(document: Document): IconLink[] {
  return [...document.querySelectorAll(LINK_SELECTOR)].map((element) => ({
    rel: element.getAttribute("rel") ?? "",
    href: element.getAttribute("href") ?? "",
    sizes: element.getAttribute("sizes") ?? "",
  }));
}

function firstParagraphFrom(document: Document): string {
  for (const paragraph of document.querySelectorAll("p")) {
    const text = paragraph.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (text.length >= MIN_PARAGRAPH_LENGTH) return text;
  }
  return "";
}

export function pageContentFromHtml(html: string): PageContent {
  if (!html.trim()) return emptyPage();

  const document = new DOMParser().parseFromString(html, "text/html");

  return {
    tags: metaTagsFrom(document),
    title: document.querySelector("title")?.textContent?.trim() ?? "",
    firstParagraph: firstParagraphFrom(document),
    iconHref: bestIconHref(iconLinksFrom(document)),
  };
}
