export interface OAuthConfig {
  authorizeEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

export interface AuthorizeChallenge {
  challenge: string;
  state: string;
}

export function authorizeUrl(config: OAuthConfig, ask: AuthorizeChallenge): string {
  const query = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scope,
    access_type: "offline",
    prompt: "consent",
    code_challenge: ask.challenge,
    code_challenge_method: "S256",
    state: ask.state,
  });

  return `${config.authorizeEndpoint}?${query.toString()}`;
}

export type AuthReturn = { code: string; state: string } | { refused: true };

export function readAuthReturn(search: string): AuthReturn | null {
  const query = new URLSearchParams(search);
  if (query.get("error")) return { refused: true };

  const code = query.get("code");
  const state = query.get("state");
  return code && state ? { code, state } : null;
}

export function isRefusal(value: AuthReturn): value is { refused: true } {
  return "refused" in value;
}

export interface AccessGrant {
  accessToken: string;
  expiresAt: number;
  refreshToken: string | null;
}

const EXPIRY_MARGIN = 60_000;

export function grantFrom(payload: unknown, now: number): AccessGrant | null {
  if (typeof payload !== "object" || payload === null) return null;

  const { access_token: access, expires_in: seconds, refresh_token: refresh } = payload as Record<
    string,
    unknown
  >;
  if (typeof access !== "string" || access === "" || typeof seconds !== "number") return null;

  return {
    accessToken: access,
    expiresAt: now + Math.max(seconds * 1000 - EXPIRY_MARGIN, 0),
    refreshToken: typeof refresh === "string" && refresh !== "" ? refresh : null,
  };
}

export function isFresh(grant: AccessGrant | null, now: number): grant is AccessGrant {
  return grant !== null && now < grant.expiresAt;
}
