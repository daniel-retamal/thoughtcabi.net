import { useRef, type Dispatch } from "react";
import { containerAt, findNode, locateFolder, locateNode } from "@/domain/library/tree";
import { isFolder, sameLocation, type Library, type LibraryLocation } from "@/domain/model";
import { folderContains } from "@/domain/library/tree";
import type { DragCallbacks, DragPayload, DropTarget } from "@/dnd/types";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import type { ToastInput } from "@/hooks/useToasts";
import type { CabinetAction } from "./cabinetReducer";
import type { Navigation, NavigationState } from "./useNavigation";

export interface LibraryDragAndDropOptions {
  library: Library;
  navigation: Navigation;
  dispatch: Dispatch<CabinetAction>;
  pushToast: (input: ToastInput) => void;
}

function movedVerb(drag: DragPayload): string {
  return drag.kind === "folder" ? "Moved folder to" : "Moved to";
}

export function useLibraryDragAndDrop({
  library,
  navigation,
  dispatch,
  pushToast,
}: LibraryDragAndDropOptions): void {
  const originRef = useRef<NavigationState | null>(null);

  const announceMove = (drag: DragPayload, location: LibraryLocation, name?: string): void => {
    pushToast({
      verb: movedVerb(drag),
      subject: name ?? containerAt(library, location).name,
      action: { kind: "view", run: () => navigation.goTo(location) },
    });
  };

  const onDrop = (drag: DragPayload, target: DropTarget): void => {
    if (target.type === "assign-tag") {
      dispatch({ type: "tag/assign", noteId: target.noteId, tag: target.tag });
      return;
    }

    if (drag.kind === "tag") return;

    switch (target.type) {
      case "reorder-channel":
        dispatch({ type: "channel/reorder", id: drag.id, beforeId: target.beforeId });
        return;

      case "reorder": {
        const origin = locateNode(library, drag.id) ?? null;
        dispatch({
          type: "node/reorder",
          id: drag.id,
          location: target.location,
          beforeId: target.beforeId,
        });
        if (!sameLocation(target.location, origin)) announceMove(drag, target.location);
        return;
      }

      case "into-folder": {
        dispatch({ type: "node/moveIntoFolder", id: drag.id, folderId: target.folderId });
        const folder = locateFolder(library, target.folderId);
        if (folder) announceMove(drag, folder.location, folder.name);
        return;
      }

      case "into-nav": {
        const origin = locateNode(library, drag.id) ?? null;
        if (sameLocation(target.location, origin)) return;
        dispatch({ type: "node/moveToLocation", id: drag.id, location: target.location });
        announceMove(drag, target.location);
        return;
      }
    }
  };

  const validate = (drag: DragPayload, target: DropTarget): boolean => {
    if (drag.kind !== "folder") return true;

    const node = findNode(library, drag.id);
    const folder = node && isFolder(node) ? node : null;

    if (target.type === "into-folder") {
      if (target.folderId === drag.id) return false;
      if (folder && folderContains(folder, target.folderId)) return false;
    }

    if ((target.type === "into-nav" || target.type === "reorder") && folder) {
      return !target.location.path.some(
        (segment) => segment === drag.id || folderContains(folder, segment),
      );
    }

    return true;
  };

  const callbacks: DragCallbacks = {
    onDrop,
    validate,
    onNavigate: (location) => navigation.goTo(location),
    onStart: () => {
      originRef.current = navigation.state;
    },
    onEnd: (committed) => {
      const origin = originRef.current;
      originRef.current = null;
      if (!committed && origin) navigation.restore(origin);
    },
  };

  useDragAndDrop(callbacks);
}
