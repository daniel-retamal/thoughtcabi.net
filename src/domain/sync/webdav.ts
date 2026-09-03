import { REMOTE_FILE_NAME } from "./conflictName";
import type { RemoteHead } from "./types";

export const PROPFIND_BODY =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<d:propfind xmlns:d="DAV:"><d:prop><d:getetag/><d:getlastmodified/></d:prop></d:propfind>';

export const DAV_NAMESPACE = "DAV:";

export interface WebdavTarget {
  collection: string;
  name: string;
}

export interface DavItem {
  href: string;
  etag: string | null;
  modified: string | null;
}

const SCHEME = /^[a-z][a-z\d+.-]*:/i;
const QUOTED = /^(W\/)?"[^"]*"$/;

function withScheme(value: string): string {
  return SCHEME.test(value) ? value : `https://${value}`;
}

export function webdavUrlFrom(value: string): URL | null {
  const wanted = value.trim();
  if (!wanted) return null;

  let url: URL;
  try {
    url = new URL(withScheme(wanted));
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.search = "";
  url.hash = "";
  return url;
}

export function webdavTargetFrom(fields: Readonly<Record<string, string>>): WebdavTarget | null {
  const url = webdavUrlFrom(fields.url ?? "");
  if (!url) return null;

  const at = url.pathname.lastIndexOf("/");
  const last = decodeURIComponent(url.pathname.slice(at + 1));
  const named = last.toLowerCase().endsWith(".json");
  const directory = named ? url.pathname.slice(0, at + 1) : `${url.pathname.replace(/\/$/, "")}/`;

  return { collection: `${url.origin}${directory}`, name: named ? last : REMOTE_FILE_NAME };
}

export function urlIn(target: WebdavTarget, name: string): string {
  return `${target.collection}${encodeURIComponent(name)}`;
}

export function fileUrl(target: WebdavTarget): string {
  return urlIn(target, target.name);
}

export function webdavLabel(target: WebdavTarget): string {
  const url = new URL(target.collection);
  const last = url.pathname
    .split("/")
    .filter((part) => part.length > 0)
    .pop();
  return last ? `${url.host}/${decodeURIComponent(last)}` : url.host;
}

export function isMixedContent(pageProtocol: string, target: WebdavTarget): boolean {
  return pageProtocol === "https:" && target.collection.startsWith("http://");
}

export function etagValue(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  return value === "" ? null : value;
}

export function ifMatchValue(revision: string): string {
  return QUOTED.test(revision) ? revision : `"${revision}"`;
}

function httpDateAt(value: string | null): number | null {
  if (value === null) return null;
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : at;
}

export function davHead(items: readonly DavItem[]): RemoteHead | null {
  for (const item of items) {
    const revision = etagValue(item.etag);
    if (revision !== null) return { revision, modifiedAt: httpDateAt(item.modified) };
  }
  return null;
}

export function nameFromHref(href: string, collection: string): string | null {
  let path: string;
  try {
    path = new URL(href, collection).pathname;
  } catch {
    return null;
  }

  const inside = new URL(collection).pathname;
  if (!path.startsWith(inside)) return null;

  const rest = decodeURIComponent(path.slice(inside.length));
  return rest === "" || rest.includes("/") ? null : rest;
}

export function davNames(items: readonly DavItem[], collection: string): string[] {
  return items
    .map((item) => nameFromHref(item.href, collection))
    .filter((name): name is string => name !== null);
}
