import type { Tag } from "@/domain/model";
import { MAX_TAGS } from "@/domain/tags/palette";

export interface TagMerge {
  tags: Tag[];
  fromLocal: ReadonlyMap<string, string>;
  fromRemote: ReadonlyMap<string, string>;
}

function byColor(tags: readonly Tag[]): Map<string, Tag> {
  return new Map(tags.map((tag) => [tag.color, tag]));
}

function choose(base?: Tag, local?: Tag, remote?: Tag): Tag | undefined {
  if (!base) return remote ?? local;
  if (!local || !remote) return undefined;
  if (local.name === base.name) return remote;
  if (remote.name === base.name) return local;
  return remote;
}

function renaming(tags: readonly Tag[], settled: ReadonlyMap<string, string>): Map<string, string> {
  return new Map(tags.map((tag) => [tag.name, settled.get(tag.color) ?? ""]));
}

export function mergeTags(
  base: readonly Tag[],
  local: readonly Tag[],
  remote: readonly Tag[],
): TagMerge {
  const inBase = byColor(base);
  const inLocal = byColor(local);
  const inRemote = byColor(remote);

  const colors = [...new Set([...remote, ...local].map((tag) => tag.color))];
  const tags = colors
    .map((color) => choose(inBase.get(color), inLocal.get(color), inRemote.get(color)))
    .filter((tag): tag is Tag => tag !== undefined)
    .slice(0, MAX_TAGS);

  const settled = new Map(tags.map((tag) => [tag.color, tag.name]));

  return { tags, fromLocal: renaming(local, settled), fromRemote: renaming(remote, settled) };
}
