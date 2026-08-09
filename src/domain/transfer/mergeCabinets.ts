import {
  isFolder,
  isNote,
  type Cabinet,
  type Channel,
  type LibraryNode,
  type Tag,
} from "@/domain/model";
import { addTag, availableColors } from "@/domain/tags/tagLibrary";

export function sameName(one: string, other: string): boolean {
  return one.trim().toLowerCase() === other.trim().toLowerCase();
}

function adoptTags(base: readonly Tag[], incoming: readonly Tag[]): Tag[] {
  let tags = [...base];

  for (const tag of incoming) {
    if (tags.some((entry) => sameName(entry.name, tag.name))) continue;
    const free = availableColors(tags);
    const color = free.includes(tag.color) ? tag.color : free[0];
    if (color) tags = addTag(tags, tag.name, color);
  }

  return tags;
}

export function mergeCabinets(base: Cabinet, incoming: Cabinet): Cabinet {
  const tags = adoptTags(base.tags, incoming.tags);

  const resolveTag = (name: string): string =>
    tags.find((tag) => sameName(tag.name, name))?.name ?? "";

  const retag = (nodes: readonly LibraryNode[]): LibraryNode[] =>
    nodes.map((node) => {
      if (isFolder(node)) return { ...node, children: retag(node.children) };
      if (!isNote(node) || !node.tag) return node;
      return { ...node, tag: resolveTag(node.tag) };
    });

  let library = base.library;

  for (const channel of incoming.library) {
    const arriving: Channel = { ...channel, children: retag(channel.children) };
    const index = library.findIndex((entry) => sameName(entry.name, arriving.name));

    library =
      index < 0
        ? [...library, arriving]
        : library.map((entry, position) =>
            position === index
              ? { ...entry, children: [...entry.children, ...arriving.children] }
              : entry,
          );
  }

  return { library, tags };
}
