import { blueskyResolver, githubResolver, wikipediaResolver } from "./apiSites";
import { genericResolver } from "./generic";
import { soundcloudResolver, spotifyResolver, vimeoResolver } from "./oembedSites";
import { twitterResolver } from "./twitter";
import type { LinkResolver } from "./types";
import { youtubeResolver } from "./youtube";

export const RESOLVERS: readonly LinkResolver[] = [
  youtubeResolver,
  vimeoResolver,
  spotifyResolver,
  soundcloudResolver,
  wikipediaResolver,
  githubResolver,
  blueskyResolver,
  twitterResolver,
  genericResolver,
];

export function resolverFor(
  url: URL,
  resolvers: readonly LinkResolver[] = RESOLVERS,
): LinkResolver | null {
  return resolvers.find((resolver) => resolver.matches(url)) ?? null;
}
