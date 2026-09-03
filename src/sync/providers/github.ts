import {
  DEFAULT_REPO_PATH,
  directoryOf,
  fileNameOf,
  pathBeside,
  repoLabel,
  repoTargetFrom,
  type RepoTarget,
} from "@/domain/sync/github";
import { REPO_RHYTHM } from "@/domain/sync/rhythm";
import type { RemoteHead, RemoteLocator } from "@/domain/sync/types";
import { base64FromText } from "@/lib/base64";
import {
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
import { gitBlobSha } from "./gitSha";

export const GITHUB_API = "https://api.github.com";

const OBJECT = "application/vnd.github.object+json";
const RAW = "application/vnd.github.raw";
const JSON_TYPE = "application/vnd.github+json";

const READ_PROBLEM: Readonly<Record<number, "auth" | "denied">> = { 401: "auth", 403: "denied" };

const PUSH_PROBLEM: Readonly<Record<number, PushFailure>> = {
  401: "auth",
  403: "readonly",
  404: "auth",
  409: "conflict",
  413: "too-large",
  422: "conflict",
};

const FREE_NAME_TRIES = 20;

interface RepoAccess {
  writable: boolean;
}

type Caller = (path: string, accept: string, init?: RequestInit) => Promise<Response>;

function offlineOrFailed(): PushFailure {
  return typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "failed";
}

function shaOf(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const { sha } = value as { sha?: unknown };
  return typeof sha === "string" ? sha : null;
}

function namesIn(listing: unknown): string[] {
  const entries = Array.isArray(listing) ? listing : (listing as { entries?: unknown })?.entries;
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry: unknown) => (entry as { name?: unknown } | null)?.name)
    .filter((name): name is string => typeof name === "string");
}

function repoAccessFrom(value: unknown): RepoAccess | null {
  if (typeof value !== "object" || value === null) return null;
  const { permissions } = value as { permissions?: { push?: unknown } };
  return { writable: permissions?.push === true };
}

function callerFor(fetcher: Fetcher, api: string, token: string): Caller {
  return (path, accept, init = {}) =>
    fetcher(`${api}${path}`, {
      ...init,
      headers: {
        Accept: accept,
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
    });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function contentsPath(target: RepoTarget, path: string): string {
  return `/repos/${target.owner}/${target.repo}/contents/${path}`;
}

async function contentsAt(call: Caller, target: RepoTarget, path: string): Promise<unknown> {
  const response = await call(contentsPath(target, path), OBJECT);
  if (response.status === 404) return null;
  if (!response.ok) throw new RemoteError(READ_PROBLEM[response.status] ?? "failed");
  return await readJson(response);
}

async function snapshotAt(call: Caller, target: RepoTarget, path: string): Promise<RemoteSnapshot> {
  const response = await call(contentsPath(target, path), RAW);
  if (!response.ok) throw new RemoteError(READ_PROBLEM[response.status] ?? "failed");

  const text = await response.text();
  return { text, revision: await gitBlobSha(text) };
}

async function repoAccess(call: Caller, target: RepoTarget): Promise<RepoAccess | null> {
  const response = await call(`/repos/${target.owner}/${target.repo}`, JSON_TYPE);
  if (response.status === 401) throw new RemoteError("auth");
  if (!response.ok) return null;
  return repoAccessFrom(await readJson(response));
}

async function namesBeside(call: Caller, target: RepoTarget): Promise<string[]> {
  return namesIn(await contentsAt(call, target, directoryOf(target.path)));
}

async function freeName(call: Caller, target: RepoTarget, name: string): Promise<string> {
  const taken = new Set(await namesBeside(call, target).catch(() => []));
  const at = name.lastIndexOf(".");
  const stem = at > 0 ? name.slice(0, at) : name;
  const extension = at > 0 ? name.slice(at) : "";

  for (let ordinal = 1; ordinal <= FREE_NAME_TRIES; ordinal += 1) {
    const candidate = ordinal === 1 ? name : `${stem}-${ordinal}${extension}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${stem}-${Date.now()}${extension}`;
}

export function githubStore(call: Caller, target: RepoTarget): RemoteStore {
  const write = async (
    path: string,
    text: string,
    expected: string | null,
    message: string,
  ): Promise<PushOutcome> => {
    try {
      const response = await call(contentsPath(target, path), JSON_TYPE, {
        method: "PUT",
        body: JSON.stringify({
          message,
          content: base64FromText(text),
          ...(expected === null ? {} : { sha: expected }),
        }),
      });

      if (!response.ok) return { ok: false, reason: PUSH_PROBLEM[response.status] ?? "failed" };

      const body = (await readJson(response)) as { content?: unknown } | null;
      return { ok: true, revision: shaOf(body?.content) ?? (await gitBlobSha(text)) };
    } catch {
      return { ok: false, reason: offlineOrFailed() };
    }
  };

  return {
    provider: "github",

    async head(): Promise<RemoteHead | null> {
      const sha = shaOf(await contentsAt(call, target, target.path));
      if (sha !== null) return { revision: sha, modifiedAt: null };
      if ((await repoAccess(call, target)) === null) throw new RemoteError("gone");
      return null;
    },

    pull: () => snapshotAt(call, target, target.path),

    pullFrom: (name) => snapshotAt(call, target, pathBeside(target.path, name)),

    push: (text, expected, message) => write(target.path, text, expected, message),

    async sibling(name: string, text: string): Promise<string | null> {
      const free = await freeName(call, target, name);
      const written = await write(pathBeside(target.path, free), text, null, `Copy: ${free}`);
      return written.ok ? free : null;
    },

    siblings: () => namesBeside(call, target),

    writable: async () => (await repoAccess(call, target).catch(() => null))?.writable === true,
  };
}

function targetFrom(locator: RemoteLocator): RepoTarget | null {
  const { owner, repo } = locator;
  if (!owner || !repo) return null;

  const stored = locator.path ?? DEFAULT_REPO_PATH;
  return { owner, repo, path: pathBeside(stored, locator.name ?? fileNameOf(stored)) };
}

export interface GithubProviderOptions {
  fetcher?: Fetcher;
  api?: string;
}

export function githubProvider(options: GithubProviderOptions = {}): RemoteProvider {
  const api = options.api ?? GITHUB_API;
  const fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  const storeFor = (target: RepoTarget, token: string): RemoteStore =>
    githubStore(callerFor(fetcher, api, token), target);

  return {
    id: "github",

    defaults: { takesHome: true, cadence: "hourly", rhythm: REPO_RHYTHM },

    available: (): ProviderAvailability => ({ ok: true, reason: null }),

    async connect({ fields }: ConnectOptions): Promise<ConnectResult> {
      const target = repoTargetFrom(fields);
      const token = (fields.token ?? "").trim();
      if (!target || !token) return { ok: false, reason: "invalid" };

      const access = await repoAccess(callerFor(fetcher, api, token), target).catch(
        () => undefined,
      );
      if (access === undefined) return { ok: false, reason: "auth" };
      if (access === null) return { ok: false, reason: "gone" };

      return {
        ok: true,
        connection: {
          locator: {
            owner: target.owner,
            repo: target.repo,
            path: target.path,
            name: fileNameOf(target.path),
          },
          label: repoLabel(target),
          secret: token,
          store: storeFor(target, token),
        },
      };
    },

    reopen(locator: RemoteLocator, secret: string | null): Promise<ReopenResult> {
      const target = targetFrom(locator);
      if (!target) return Promise.resolve({ ok: false, reason: "gone" });
      if (!secret) return Promise.resolve({ ok: false, reason: "auth" });

      return Promise.resolve({ ok: true, store: storeFor(target, secret) });
    },

    disconnect: () => Promise.resolve(),
  };
}
