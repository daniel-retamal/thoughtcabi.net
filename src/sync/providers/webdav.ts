import { splitFileName } from "@/domain/sync/conflictName";
import { NETWORK_RHYTHM } from "@/domain/sync/rhythm";
import type { RemoteHead, RemoteLocator, SyncProblem } from "@/domain/sync/types";
import {
  DAV_NAMESPACE,
  davHead,
  davNames,
  etagValue,
  fileUrl,
  ifMatchValue,
  isMixedContent,
  PROPFIND_BODY,
  urlIn,
  webdavLabel,
  webdavTargetFrom,
  type DavItem,
  type WebdavTarget,
} from "@/domain/sync/webdav";
import { base64FromText } from "@/lib/base64";
import {
  RemoteError,
  type ConnectOptions,
  type ConnectProblem,
  type ConnectResult,
  type Fetcher,
  type ProviderAvailability,
  type PushFailure,
  type PushOutcome,
  type RemoteProvider,
  type RemoteSnapshot,
  type RemoteStore,
  type ReopenResult,
} from "../types";

const READ_PROBLEM: Readonly<Record<number, SyncProblem>> = {
  401: "auth",
  403: "denied",
  423: "denied",
};

const PUSH_PROBLEM: Readonly<Record<number, PushFailure>> = {
  401: "auth",
  403: "readonly",
  405: "readonly",
  412: "conflict",
  413: "too-large",
  423: "denied",
  507: "quota",
};

const CONNECT_PROBLEM: Readonly<Record<number, ConnectProblem>> = {
  401: "auth",
  403: "auth",
  404: "gone",
  405: "invalid",
};

const FREE_NAME_TRIES = 20;

type Caller = (url: string, init?: RequestInit) => Promise<Response>;

function offline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function basicAuth(user: string, password: string): string {
  return `Basic ${base64FromText(`${user}:${password}`)}`;
}

export function callerFor(fetcher: Fetcher, authorization: string): Caller {
  return (url, init = {}) =>
    fetcher(url, { ...init, headers: { ...init.headers, Authorization: authorization } });
}

function propfindInit(depth: 0 | 1): RequestInit {
  return {
    method: "PROPFIND",
    headers: { Depth: String(depth), "Content-Type": "application/xml; charset=utf-8" },
    body: PROPFIND_BODY,
  };
}

function textIn(element: Element, tag: string): string | null {
  return element.getElementsByTagNameNS(DAV_NAMESPACE, tag)[0]?.textContent?.trim() ?? null;
}

export function itemsFrom(xml: string): DavItem[] {
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  const responses = Array.from(parsed.getElementsByTagNameNS(DAV_NAMESPACE, "response"));

  return responses.map((response) => ({
    href: textIn(response, "href") ?? "",
    etag: textIn(response, "getetag"),
    modified: textIn(response, "getlastmodified"),
  }));
}

export function webdavStore(call: Caller, target: WebdavTarget): RemoteStore {
  const reach = async (url: string, init?: RequestInit): Promise<Response> => {
    try {
      return await call(url, init);
    } catch {
      throw new RemoteError(offline() ? "offline" : "failed");
    }
  };

  const readItems = async (url: string, depth: 0 | 1): Promise<DavItem[] | null> => {
    const response = await reach(url, propfindInit(depth));
    if (response.status === 404) return null;
    if (!response.ok) throw new RemoteError(READ_PROBLEM[response.status] ?? "failed");
    return itemsFrom(await response.text());
  };

  const revisionAt = async (url: string): Promise<string> => {
    const items = await readItems(url, 0);
    const found = items && davHead(items);
    if (!found) throw new RemoteError("failed");
    return found.revision;
  };

  const snapshotAt = async (url: string): Promise<RemoteSnapshot> => {
    const response = await reach(url);
    if (response.status === 404) throw new RemoteError("gone");
    if (!response.ok) throw new RemoteError(READ_PROBLEM[response.status] ?? "failed");

    const text = await response.text();
    const sent = etagValue(response.headers.get("ETag"));
    return { text, revision: sent ?? (await revisionAt(url)) };
  };

  const listing = async (): Promise<string[]> => {
    const items = await readItems(target.collection, 1);
    if (!items) throw new RemoteError("gone");
    return davNames(items, target.collection);
  };

  const upload = (url: string, text: string, condition: HeadersInit): Promise<Response> =>
    call(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8", ...condition },
      body: text,
    });

  return {
    provider: "webdav",

    async head(): Promise<RemoteHead | null> {
      const items = await readItems(fileUrl(target), 0);
      if (items === null) {
        if ((await readItems(target.collection, 0)) === null) throw new RemoteError("gone");
        return null;
      }

      const found = davHead(items);
      if (!found) throw new RemoteError("failed");
      return found;
    },

    pull: () => snapshotAt(fileUrl(target)),

    pullFrom: (name: string) => snapshotAt(urlIn(target, name)),

    async push(text: string, expected: string | null): Promise<PushOutcome> {
      try {
        const url = fileUrl(target);
        const response = await upload(
          url,
          text,
          expected === null ? { "If-None-Match": "*" } : { "If-Match": ifMatchValue(expected) },
        );

        if (!response.ok) return { ok: false, reason: PUSH_PROBLEM[response.status] ?? "failed" };

        const sent = etagValue(response.headers.get("ETag"));
        return { ok: true, revision: sent ?? (await revisionAt(url)) };
      } catch {
        return { ok: false, reason: offline() ? "offline" : "failed" };
      }
    },

    async sibling(wanted: string, text: string): Promise<string | null> {
      const taken = new Set(await listing().catch(() => []));
      const { stem, extension } = splitFileName(wanted);

      for (let ordinal = 1; ordinal <= FREE_NAME_TRIES; ordinal += 1) {
        const candidate = ordinal === 1 ? wanted : `${stem}-${ordinal}${extension}`;
        if (taken.has(candidate)) continue;

        const written = await upload(urlIn(target, candidate), text, {
          "If-None-Match": "*",
        }).catch(() => null);

        if (written?.ok) return candidate;
        if (!written || written.status !== 412) return null;
      }

      return null;
    },

    siblings: listing,
  };
}

function targetFrom(locator: RemoteLocator): WebdavTarget | null {
  const { collection, name } = locator;
  return collection && name ? { collection, name } : null;
}

export interface WebdavProviderOptions {
  fetcher?: Fetcher;
  pageProtocol?: string;
}

function protocolHere(): string {
  return typeof window === "undefined" ? "https:" : window.location.protocol;
}

export function webdavProvider(options: WebdavProviderOptions = {}): RemoteProvider {
  const fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  const pageProtocol = options.pageProtocol ?? protocolHere();

  const unreached = (): ConnectResult => ({ ok: false, reason: offline() ? "failed" : "cors" });

  return {
    id: "webdav",

    defaults: { takesHome: true, cadence: "live", rhythm: NETWORK_RHYTHM },

    available: (): ProviderAvailability => ({ ok: true, reason: null }),

    async connect({ fields }: ConnectOptions): Promise<ConnectResult> {
      const target = webdavTargetFrom(fields);
      const user = (fields.user ?? "").trim();
      const password = fields.password ?? "";
      if (!target || !user || !password) return { ok: false, reason: "invalid" };
      if (isMixedContent(pageProtocol, target)) return { ok: false, reason: "mixedContent" };

      const probe = await fetcher(target.collection, { method: "OPTIONS" }).catch(() => null);
      if (!probe) return unreached();

      const call = callerFor(fetcher, basicAuth(user, password));
      const answered = await call(target.collection, propfindInit(0)).catch(() => null);
      if (!answered) return unreached();
      if (!answered.ok) return { ok: false, reason: CONNECT_PROBLEM[answered.status] ?? "failed" };

      return {
        ok: true,
        connection: {
          locator: { collection: target.collection, name: target.name, user },
          label: webdavLabel(target),
          secret: password,
          store: webdavStore(call, target),
        },
      };
    },

    reopen(locator: RemoteLocator, secret: string | null): Promise<ReopenResult> {
      const target = targetFrom(locator);
      if (!target) return Promise.resolve({ ok: false, reason: "gone" });
      if (!secret || !locator.user) return Promise.resolve({ ok: false, reason: "auth" });

      return Promise.resolve({
        ok: true,
        store: webdavStore(callerFor(fetcher, basicAuth(locator.user, secret)), target),
      });
    },

    disconnect: () => Promise.resolve(),
  };
}
