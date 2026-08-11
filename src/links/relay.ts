import { fetchText, type Fetcher, type FetchOptions } from "./fetchText";

export const RELAY = "/relay?url=";

const URL_PLACEHOLDER = "{url}";

export function relayEndpoints(configured = import.meta.env.VITE_LINK_RELAY): string[] {
  const own = configured?.trim();
  return own ? [own] : [RELAY];
}

export function relayedUrl(endpoint: string, target: string): string {
  const encoded = encodeURIComponent(target);
  return endpoint.includes(URL_PLACEHOLDER)
    ? endpoint.replace(URL_PLACEHOLDER, encoded)
    : `${endpoint}${encoded}`;
}

export async function fetchViaRelay(
  fetcher: Fetcher,
  target: string,
  endpoints: readonly string[],
  options: FetchOptions = {},
): Promise<string | null> {
  for (const endpoint of endpoints) {
    const text = await fetchText(fetcher, relayedUrl(endpoint, target), options);
    if (text) return text;
  }
  return null;
}
