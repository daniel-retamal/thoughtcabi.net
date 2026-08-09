import type { BrowseMode } from "@/state/useLibraryView";
import type { NavigationState } from "@/state/useNavigation";
import type { EmptyStateProps } from "@/components/feedback/EmptyState";

export function emptyStateFor(mode: BrowseMode, navigation: NavigationState): EmptyStateProps {
  if (mode === "searching") {
    return {
      icon: "search-x",
      title: "No matches",
      text: `Nothing across your channels matches “${navigation.query}”. Try a different word.`,
    };
  }

  if (mode === "tagged") {
    return {
      icon: "tag",
      title: "Nothing tagged yet",
      text: `No items carry the “${navigation.activeTag ?? ""}” tag. Add it to a save from its editor.`,
    };
  }

  return {
    icon: "bookmark-plus",
    title: "Nothing here yet",
    text: "Press Ctrl V anywhere to drop in a link, or hit “Save” to add one by hand.",
  };
}
