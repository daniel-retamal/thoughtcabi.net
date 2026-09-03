import {
  authorizeUrl,
  isRefusal,
  readAuthReturn,
  type OAuthConfig,
} from "@/domain/sync/oauth";
import { isKnownProvider, type ProviderId } from "@/domain/sync/types";
import { base64UrlFromBytes } from "@/lib/base64";

const PENDING_KEY = "thoughtcabinet.oauth.v1";
const VERIFIER_BYTES = 32;
const STATE_BYTES = 16;

export interface PendingAuth {
  provider: ProviderId;
  verifier: string;
  state: string;
  redirectUri: string;
}

export interface RedirectDeps {
  session?: Storage;
  go?: (url: string) => void;
  search?: string;
  forget?: () => void;
  random?: (bytes: Uint8Array) => Uint8Array;
}

function sessionOf(deps: RedirectDeps): Storage | null {
  if (deps.session) return deps.session;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function randomToken(deps: RedirectDeps, size: number): string {
  const fill = deps.random ?? ((bytes: Uint8Array) => crypto.getRandomValues(bytes));
  return base64UrlFromBytes(fill(new Uint8Array(size)));
}

export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlFromBytes(new Uint8Array(digest));
}

function pendingFrom(raw: string | null): PendingAuth | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const { provider, verifier, state, redirectUri } = parsed;
    if (typeof provider !== "string" || !isKnownProvider(provider)) return null;
    if (typeof verifier !== "string" || typeof state !== "string") return null;
    if (typeof redirectUri !== "string") return null;
    return { provider, verifier, state, redirectUri };
  } catch {
    return null;
  }
}

export async function beginAuth(
  provider: ProviderId,
  config: OAuthConfig,
  deps: RedirectDeps = {},
): Promise<void> {
  const session = sessionOf(deps);
  const verifier = randomToken(deps, VERIFIER_BYTES);
  const state = randomToken(deps, STATE_BYTES);
  const pending: PendingAuth = { provider, verifier, state, redirectUri: config.redirectUri };

  try {
    session?.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    return;
  }

  const go = deps.go ?? ((url: string) => window.location.assign(url));
  go(authorizeUrl(config, { challenge: await challengeFor(verifier), state }));
}

export interface AuthReturn {
  provider: ProviderId;
  fields: Readonly<Record<string, string>>;
}

export function takeAuthReturn(deps: RedirectDeps = {}): AuthReturn | null {
  const search = deps.search ?? window.location.search;
  const arrival = readAuthReturn(search);
  if (!arrival) return null;

  const session = sessionOf(deps);
  const pending = pendingFrom(session?.getItem(PENDING_KEY) ?? null);
  session?.removeItem(PENDING_KEY);

  const forget = deps.forget ?? (() => history.replaceState(null, "", location.pathname));
  forget();

  if (!pending || isRefusal(arrival) || arrival.state !== pending.state) return null;

  return {
    provider: pending.provider,
    fields: {
      code: arrival.code,
      verifier: pending.verifier,
      redirectUri: pending.redirectUri,
    },
  };
}
