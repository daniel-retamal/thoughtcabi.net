import { useMemo } from "react";
import { searchLibrary, notesWithTag } from "@/domain/library/search";
import {
  containerAtPath,
  requireShelf,
  splitChildren,
  type Container,
} from "@/domain/library/tree";
import {
  isFolder,
  type Folder,
  type Library,
  type NodeId,
  type NoteEntry,
  type Shelf,
  type ViewMode,
} from "@/domain/model";
import type { Crumb } from "@/components/layout/Breadcrumbs";
import type { NavigationState } from "./useNavigation";

export type BrowseMode = "browsing" | "searching" | "tagged";

export type FolderEntry = Folder & { shelfId?: NodeId };

export interface LibraryView {
  mode: BrowseMode;
  shelf: Shelf;
  container: Container;
  folders: FolderEntry[];
  notes: NoteEntry[];
  crumbs: Crumb[];
  canReorder: boolean;
  contentKey: string;
}

function buildCrumbs(shelf: Shelf, path: readonly string[]): Crumb[] {
  const crumbs: Crumb[] = [
    {
      id: shelf.id,
      name: shelf.name,
      icon: shelf.icon,
      location: { shelfId: shelf.id, path: [] },
    },
  ];

  let container: Container = shelf;
  path.forEach((segment, depth) => {
    const next = container.children.find((child) => child.id === segment);
    if (!next || !isFolder(next)) return;
    crumbs.push({
      id: next.id,
      name: next.name,
      location: { shelfId: shelf.id, path: path.slice(0, depth + 1) },
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
    const shelf = requireShelf(library, navigation.shelfId);
    const container = containerAtPath(shelf, navigation.path);
    const crumbs = buildCrumbs(shelf, navigation.path);

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
      shelf,
      container,
      folders,
      notes,
      crumbs,
      canReorder: mode === "browsing",
      contentKey: `${scope}${shelf.id}${navigation.path.join("/")}${view}`,
    };
  }, [library, navigation, view]);
}
