export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  accept?: string;
}

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_BYTES = 512 * 1024;

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const body = response.body;
  if (!body) return (await response.text()).slice(0, maxBytes);

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      chunks.push(decoder.decode(value, { stream: true }));
      if (total >= maxBytes) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  return chunks.join("").slice(0, maxBytes);
}

export async function fetchText(
  fetcher: Fetcher,
  url: string,
  options: FetchOptions = {},
): Promise<string | null> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxBytes = DEFAULT_MAX_BYTES, accept } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(url, {
      signal: controller.signal,
      redirect: "follow",
      ...(accept ? { headers: { Accept: accept } } : {}),
    });
    if (!response.ok) return null;
    return await readCapped(response, maxBytes);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(
  fetcher: Fetcher,
  url: string,
  options: FetchOptions = {},
): Promise<unknown> {
  const text = await fetchText(fetcher, url, { accept: "application/json", ...options });
  return parseJson(text);
}

export function parseJson(text: string | null): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
