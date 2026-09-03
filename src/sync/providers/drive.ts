import { REMOTE_FILE_NAME, splitFileName } from "@/domain/sync/conflictName";
import {
  accountFrom,
  DRIVE_API,
  DRIVE_AUTHORIZE,
  DRIVE_LABEL,
  DRIVE_SCOPE,
  FILE_FIELDS,
  fileFrom,
  filesFrom,
  headOf,
  LIST_FIELDS,
  MINE_QUERY,
  multipartBody,
  multipartType,
  nameQuery,
  reasonFrom,
  type DriveFile,
} from "@/domain/sync/drive";
import type { OAuthConfig } from "@/domain/sync/oauth";
import { NETWORK_RHYTHM } from "@/domain/sync/rhythm";
import type { RemoteHead, RemoteLocator, SyncProblem } from "@/domain/sync/types";
import { beginAuth } from "../auth/oauth";
import { brokerFor, tokenSource, type Broker, type TokenSource } from "../auth/tokens";
import {
  problemOf,
  RemoteError,
  type ConnectOptions,
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

export const DRIVE_BROKER_ID = "google";

const READ_PROBLEM: Readonly<Record<number, SyncProblem>> = {
  401: "auth",
  403: "denied",
  404: "gone",
};

const PUSH_PROBLEM: Readonly<Record<number, PushFailure>> = {
  401: "auth",
  403: "denied",
  404: "conflict",
  412: "conflict",
  413: "too-large",
};

const PUSH_FOR_READ: Readonly<Partial<Record<SyncProblem, PushFailure>>> = {
  auth: "auth",
  denied: "denied",
};

const FREE_NAME_TRIES = 20;

type Caller = (path: string, init?: RequestInit) => Promise<Response>;

type Written = { ok: true; file: DriveFile } | { ok: false; reason: PushFailure };

interface DriveTarget {
  name: string;
  fileId: string | null;
}

function offlineOrFailed(): PushFailure {
  return typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "failed";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function pushFailureFor(response: Response): Promise<PushFailure> {
  if (response.status === 403 && reasonFrom(await readJson(response)) === "storageQuotaExceeded") {
    return "quota";
  }
  return PUSH_PROBLEM[response.status] ?? "failed";
}

export function callerFor(fetcher: Fetcher, api: string, tokens: TokenSource): Caller {
  const once = async (path: string, init: RequestInit): Promise<Response> =>
    fetcher(`${api}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${await tokens.access()}` },
    });

  return async (path, init = {}) => {
    const first = await once(path, init);
    if (first.status !== 401) return first;

    tokens.expire();
    return await once(path, init);
  };
}

export async function listFiles(call: Caller, query: string): Promise<DriveFile[]> {
  const search = new URLSearchParams({
    q: query,
    fields: LIST_FIELDS,
    spaces: "drive",
    pageSize: "100",
  });

  const response = await call(`/drive/v3/files?${search.toString()}`);
  if (!response.ok) throw new RemoteError(READ_PROBLEM[response.status] ?? "failed");
  return filesFrom(await readJson(response));
}

export async function findFile(call: Caller, name: string): Promise<DriveFile | null> {
  return (await listFiles(call, nameQuery(name)))[0] ?? null;
}

export function driveStore(call: Caller, target: DriveTarget): RemoteStore {
  let known = target.fileId;

  const listing = (query: string): Promise<DriveFile[]> => listFiles(call, query);

  const current = async (): Promise<DriveFile | null> => {
    if (known) {
      const response = await call(`/drive/v3/files/${known}?fields=${FILE_FIELDS}`);
      if (response.ok) return fileFrom(await readJson(response));
      if (response.status !== 404) throw new RemoteError(READ_PROBLEM[response.status] ?? "failed");
      known = null;
    }

    const found = (await listing(nameQuery(target.name)))[0] ?? null;
    known = found?.id ?? null;
    return found;
  };

  const upload = async (path: string, init: RequestInit): Promise<Written> => {
    const response = await call(path, init);
    if (!response.ok) return { ok: false, reason: await pushFailureFor(response) };

    const file = fileFrom(await readJson(response));
    return file ? { ok: true, file } : { ok: false, reason: "failed" };
  };

  const create = (name: string, text: string): Promise<Written> =>
    upload(`/upload/drive/v3/files?uploadType=multipart&fields=${FILE_FIELDS}`, {
      method: "POST",
      headers: { "Content-Type": multipartType() },
      body: multipartBody({ name, mimeType: "application/json" }, text),
    });

  const replace = (fileId: string, text: string): Promise<Written> =>
    upload(`/upload/drive/v3/files/${fileId}?uploadType=media&fields=${FILE_FIELDS}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: text,
    });

  const freeName = async (wanted: string): Promise<string> => {
    const taken = new Set((await listing(MINE_QUERY).catch(() => [])).map((file) => file.name));
    const { stem, extension } = splitFileName(wanted);

    for (let ordinal = 1; ordinal <= FREE_NAME_TRIES; ordinal += 1) {
      const candidate = ordinal === 1 ? wanted : `${stem}-${ordinal}${extension}`;
      if (!taken.has(candidate)) return candidate;
    }

    return `${stem}-${Date.now()}${extension}`;
  };

  const download = async (fileId: string): Promise<string> => {
    const response = await call(`/drive/v3/files/${fileId}?alt=media`);
    if (!response.ok) throw new RemoteError(READ_PROBLEM[response.status] ?? "failed");
    return await response.text();
  };

  const snapshotOf = async (file: DriveFile): Promise<RemoteSnapshot> => ({
    revision: file.revision,
    text: await download(file.id),
  });

  const named = async (name: string): Promise<DriveFile> => {
    const found = (await listing(nameQuery(name)))[0];
    if (!found) throw new RemoteError("gone");
    return found;
  };

  return {
    provider: "drive",

    async head(): Promise<RemoteHead | null> {
      const file = await current();
      return file ? headOf(file) : null;
    },

    async pull(): Promise<RemoteSnapshot> {
      const file = await current();
      if (!file) throw new RemoteError("gone");
      return await snapshotOf(file);
    },

    pullFrom: async (name: string) => await snapshotOf(await named(name)),

    async push(text: string, expected: string | null): Promise<PushOutcome> {
      try {
        const file = await current();
        if ((file?.revision ?? null) !== expected) return { ok: false, reason: "conflict" };

        const written = file ? await replace(file.id, text) : await create(target.name, text);
        if (!written.ok) return written;

        known = written.file.id;
        return {
          ok: true,
          revision: written.file.revision,
          ...(file ? {} : { locator: { fileId: written.file.id } }),
        };
      } catch (error) {
        return { ok: false, reason: PUSH_FOR_READ[problemOf(error)] ?? offlineOrFailed() };
      }
    },

    async sibling(wanted: string, text: string): Promise<string | null> {
      const free = await freeName(wanted).catch(() => wanted);
      const written = await create(free, text).catch(() => null);
      return written?.ok === true ? free : null;
    },

    siblings: async () => (await listing(MINE_QUERY)).map((file) => file.name),
  };
}

export interface DriveProviderOptions {
  fetcher?: Fetcher;
  api?: string;
  clientId?: string;
  redirectUri?: string;
  broker?: Broker;
  begin?: (config: OAuthConfig) => Promise<void>;
  now?: () => number;
}

function redirectHere(): string {
  return typeof window === "undefined" ? "" : `${window.location.origin}/`;
}

export function driveProvider(options: DriveProviderOptions = {}): RemoteProvider {
  const fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  const api = options.api ?? DRIVE_API;
  const now = options.now ?? Date.now;
  const clientId = options.clientId ?? import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
  const broker = options.broker ?? brokerFor(DRIVE_BROKER_ID, { fetcher: options.fetcher, now });

  const storeFor = (tokens: TokenSource, target: DriveTarget): RemoteStore =>
    driveStore(callerFor(fetcher, api, tokens), target);

  const configFor = (redirectUri: string): OAuthConfig => ({
    authorizeEndpoint: DRIVE_AUTHORIZE,
    clientId,
    redirectUri,
    scope: DRIVE_SCOPE,
  });

  const accountOf = async (tokens: TokenSource): Promise<string> => {
    const call = callerFor(fetcher, api, tokens);
    const response = await call("/drive/v3/about?fields=user").catch(() => null);
    if (!response?.ok) return DRIVE_LABEL;
    return accountFrom(await readJson(response)) ?? DRIVE_LABEL;
  };

  return {
    id: "drive",

    defaults: { takesHome: true, cadence: "live", rhythm: NETWORK_RHYTHM },

    available: (): ProviderAvailability =>
      clientId ? { ok: true, reason: null } : { ok: false, reason: "unconfigured" },

    async connect({ fields }: ConnectOptions): Promise<ConnectResult> {
      if (!clientId) return { ok: false, reason: "failed" };

      const redirectUri = fields.redirectUri ?? options.redirectUri ?? redirectHere();

      if (!fields.code || !fields.verifier) {
        const begin = options.begin ?? ((config: OAuthConfig) => beginAuth("drive", config));
        await begin(configFor(redirectUri));
        return { ok: false, reason: "cancelled" };
      }

      const exchanged = await broker.exchange({
        code: fields.code,
        verifier: fields.verifier,
        redirectUri,
      });
      if (!exchanged.ok) {
        return { ok: false, reason: exchanged.reason === "refused" ? "auth" : "failed" };
      }

      const { refreshToken } = exchanged.grant;
      if (!refreshToken) return { ok: false, reason: "auth" };

      const tokens = tokenSource(broker, refreshToken, exchanged.grant, now);
      const call = callerFor(fetcher, api, tokens);

      let found: DriveFile | null;
      try {
        found = await findFile(call, REMOTE_FILE_NAME);
      } catch (error) {
        return { ok: false, reason: problemOf(error) === "auth" ? "auth" : "failed" };
      }

      return {
        ok: true,
        connection: {
          locator: { name: REMOTE_FILE_NAME, ...(found ? { fileId: found.id } : {}) },
          label: await accountOf(tokens),
          secret: refreshToken,
          store: driveStore(call, { name: REMOTE_FILE_NAME, fileId: found?.id ?? null }),
        },
      };
    },

    reopen(locator: RemoteLocator, secret: string | null): Promise<ReopenResult> {
      if (!clientId || !secret) return Promise.resolve({ ok: false, reason: "auth" });

      const target = { name: locator.name ?? REMOTE_FILE_NAME, fileId: locator.fileId ?? null };
      return Promise.resolve({
        ok: true,
        store: storeFor(tokenSource(broker, secret, null, now), target),
      });
    },

    async disconnect(_locator: RemoteLocator, secret: string | null): Promise<void> {
      if (secret) await broker.revoke(secret);
    },
  };
}
