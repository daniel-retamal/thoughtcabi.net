import { useMemo } from "react";
import { searchLibrary, notesWithTag } from "@/domain/library/search";
import {
  containerAtPath,
  requireChannel,
  splitChildren,
  type Container,
} from "@/domain/library/tree";
import {
  isFolder,
  type Channel,
  type Folder,
  type Library,
  type NodeId,
  type NoteEntry,
  type ViewMode,
} from "@/domain/model";
import type { Crumb } from "@/components/layout/Breadcrumbs";
import type { NavigationState } from "./useNavigation";

export type BrowseMode = "browsing" | "searching" | "tagged";

export type FolderEntry = Folder & { channelId?: NodeId };

export interface LibraryView {
  mode: BrowseMode;
  channel: Channel;
  container: Container;
  folders: FolderEntry[];
  notes: NoteEntry[];
  crumbs: Crumb[];
  canReorder: boolean;
  contentKey: string;
}

function buildCrumbs(channel: Channel, path: readonly string[]): Crumb[] {
  const crumbs: Crumb[] = [
    {
      id: channel.id,
      name: channel.name,
      icon: channel.icon,
      location: { channelId: channel.id, path: [] },
    },
  ];

  let container: Container = channel;
  path.forEach((segment, depth) => {
    const next = container.children.find((child) => child.id === segment);
    if (!next || !isFolder(next)) return;
    crumbs.push({
      id: next.id,
      name: next.name,
      location: { channelId: channel.id, path: path.slice(0, depth + 1) },
    });
    container = next;
  });

  return crumbs;
}

export function useLibraryView(
  library: Library,
  navigation: NavigationState,
  view: ViewMode,
): LibraryView {
  return useMemo(() => {
    const channel = requireChannel(library, navigation.channelId);
    const container = containerAtPath(channel, navigation.path);
    const crumbs = buildCrumbs(channel, navigation.path);

    const query = navigation.query.trim();
    const mode: BrowseMode = query ? "searching" : navigation.activeTag ? "tagged" : "browsing";

    const { folders, notes } =
      mode === "searching"
        ? searchLibrary(library, query)
        : mode === "tagged"
          ? { folders: [], notes: notesWithTag(library, navigation.activeTag ?? "") }
          : splitChildren(container);

    const scope =
      mode === "searching" ? "s" : mode === "tagged" ? `t${navigation.activeTag ?? ""}` : "b";

    return {
      mode,
      channel,
      container,
      folders,
      notes,
      crumbs,
      canReorder: mode === "browsing",
      contentKey: `${scope}${channel.id}${navigation.path.join("/")}${view}`,
    };
  }, [library, navigation, view]);
}
