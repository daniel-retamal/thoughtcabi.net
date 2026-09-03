import { grantFrom, isFresh, type AccessGrant } from "@/domain/sync/oauth";
import { RemoteError, type Fetcher } from "../types";

export const BROKER = "/auth";

export type GrantRefusal = "refused" | "unconfigured" | "unreachable";

export type GrantResult = { ok: true; grant: AccessGrant } | { ok: false; reason: GrantRefusal };

export interface ExchangeInput {
  code: string;
  verifier: string;
  redirectUri: string;
}

export interface Broker {
  exchange(input: ExchangeInput): Promise<GrantResult>;
  refresh(refreshToken: string): Promise<GrantResult>;
  revoke(refreshToken: string): Promise<void>;
}

export interface BrokerOptions {
  fetcher?: Fetcher;
  base?: string;
  now?: () => number;
}

const REFUSAL_FOR: Readonly<Record<number, GrantRefusal>> = {
  400: "refused",
  401: "refused",
  403: "refused",
  501: "unconfigured",
};

export function brokerFor(provider: string, options: BrokerOptions = {}): Broker {
  const fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  const base = options.base ?? BROKER;
  const now = options.now ?? Date.now;

  const post = async (action: string, body: Record<string, string>): Promise<Response | null> => {
    try {
      return await fetcher(`${base}/${provider}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      return null;
    }
  };

  const ask = async (action: string, body: Record<string, string>): Promise<GrantResult> => {
    const response = await post(action, body);
    if (!response) return { ok: false, reason: "unreachable" };
    if (!response.ok) return { ok: false, reason: REFUSAL_FOR[response.status] ?? "unreachable" };

    const payload: unknown = await response.json().catch(() => null);
    const grant = grantFrom(payload, now());
    return grant ? { ok: true, grant } : { ok: false, reason: "unreachable" };
  };

  return {
    exchange: (input) =>
      ask("exchange", {
        code: input.code,
        code_verifier: input.verifier,
        redirect_uri: input.redirectUri,
      }),

    refresh: (refreshToken) => ask("refresh", { refresh_token: refreshToken }),

    async revoke(refreshToken) {
      await post("revoke", { refresh_token: refreshToken });
    },
  };
}

const PROBLEM_FOR: Readonly<Record<GrantRefusal, "auth" | "failed">> = {
  refused: "auth",
  unconfigured: "failed",
  unreachable: "failed",
};

export interface TokenSource {
  readonly refreshToken: string;
  access(): Promise<string>;
  expire(): void;
}

export function tokenSource(
  broker: Broker,
  refreshToken: string,
  seed: AccessGrant | null = null,
  now: () => number = Date.now,
): TokenSource {
  let held = seed;
  let asking: Promise<AccessGrant> | null = null;

  const renew = async (): Promise<AccessGrant> => {
    const result = await broker.refresh(refreshToken);
    if (!result.ok) throw new RemoteError(PROBLEM_FOR[result.reason]);
    held = result.grant;
    return result.grant;
  };

  return {
    refreshToken,

    async access(): Promise<string> {
      if (isFresh(held, now())) return held.accessToken;

      asking ??= renew().finally(() => {
        asking = null;
      });

      return (await asking).accessToken;
    },

    expire(): void {
      held = null;
    },
  };
}
