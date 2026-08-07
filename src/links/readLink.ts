import { previewFromUrl } from "@/domain/links/fromUrl";
import { acceptsPreviewImage } from "@/domain/links/imageCandidate";
import { mergePreview, type LinkPreview } from "@/domain/links/linkPreview";
import { thumbnailFallbackFor } from "@/domain/links/sites/youtube";
import { canonicalUrl } from "@/domain/links/url";
import { fetchJson, parseJson, type Fetcher } from "./fetchText";
import { measureImage as browserMeasure, type ImageMeasurer } from "./measureImage";
import { fetchViaRelay, relayEndpoints } from "./relay";
import { genericResolver } from "./resolvers/generic";
import { RESOLVERS, resolverFor } from "./resolvers";
import type { LinkResolver, ResolverContext } from "./resolvers/types";

export type LinkReader = (raw: string) => Promise<LinkPreview | null>;

export interface ReadLinkDeps {
  fetcher?: Fetcher;
  resolvers?: readonly LinkResolver[];
  relays?: readonly string[];
  measureImage?: ImageMeasurer;
}

function browserFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}

function contextFor(fetcher: Fetcher, relays: readonly string[]): ResolverContext {
  const viaRelay = (target: string): Promise<string | null> =>
    fetchViaRelay(fetcher, target, relays);

  return {
    fetchJson: (url) => fetchJson(fetcher, url),
    fetchViaRelay: viaRelay,
    fetchJsonViaRelay: async (url) => parseJson(await viaRelay(url)),
  };
}

async function usableImage(candidate: string, measure: ImageMeasurer): Promise<string> {
  if (!candidate) return "";
  if (acceptsPreviewImage(await measure(candidate))) return candidate;

  const fallback = thumbnailFallbackFor(candidate);
  if (!fallback) return "";
  return acceptsPreviewImage(await measure(fallback)) ? fallback : "";
}

async function runResolver(
  resolver: LinkResolver,
  url: URL,
  context: ResolverContext,
): Promise<LinkPreview | null> {
  try {
    return await resolver.read(url, context);
  } catch {
    return null;
  }
}

export async function readLink(
  raw: string | null | undefined,
  deps: ReadLinkDeps = {},
): Promise<LinkPreview | null> {
  const canonical = canonicalUrl(raw);
  if (!canonical) return null;

  const url = new URL(canonical);
  const {
    fetcher = browserFetch,
    resolvers = RESOLVERS,
    relays = relayEndpoints(),
    measureImage = browserMeasure,
  } = deps;

  const baseline = previewFromUrl(url);
  const resolver = resolverFor(url, resolvers);
  if (!resolver) return baseline;

  const context = contextFor(fetcher, relays);
  let resolved = await runResolver(resolver, url, context);

  if (!resolved && resolver.id !== genericResolver.id && resolvers.includes(genericResolver)) {
    resolved = await runResolver(genericResolver, url, context);
  }

  const preview = mergePreview(resolved ?? baseline, baseline);
  const image = await usableImage(preview.image, measureImage);

  return image === preview.image ? preview : { ...preview, image };
}
