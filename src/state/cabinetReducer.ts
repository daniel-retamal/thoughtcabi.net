import {
  addShelf,
  addChild,
  createFolder,
  insertAt,
  insertShelf,
  moveIntoFolder,
  moveToLocation,
  patchNotes,
  removeShelf,
  removeNode,
  renameFolder,
  reorderShelves,
  reorderWithinLocation,
  replaceNode,
  updateShelf,
} from "@/domain/library/mutations";
import { pendingPlacements, type NodePlacement } from "@/domain/library/tree";
import type { Cabinet, Library, LibraryLocation, NodeId, Note, Shelf, Tag } from "@/domain/model";
import { addTag, insertTag, recolorTag, removeTag, renameTag } from "@/domain/tags/tagLibrary";
import { mergeCabinets } from "@/domain/transfer/mergeCabinets";
import type { IconName } from "@/icons/names";

export type CabinetAction =
  | { type: "cabinet/adopt"; cabinet: Cabinet }
  | { type: "cabinet/replace"; cabinet: Cabinet }
  | { type: "cabinet/merge"; cabinet: Cabinet }
  | {
      type: "note/addPending";
      location: LibraryLocation;
      id: NodeId;
      url: string;
      addedAt: number;
    }
  | { type: "note/resolvePending"; note: Note }
  | { type: "note/add"; location: LibraryLocation; note: Note }
  | { type: "note/move"; location: LibraryLocation; note: Note }
  | { type: "node/remove"; id: NodeId }
  | { type: "node/restore"; placement: NodePlacement }
  | { type: "node/moveIntoFolder"; id: NodeId; folderId: NodeId }
  | { type: "node/moveToLocation"; id: NodeId; location: LibraryLocation }
  | { type: "node/reorder"; id: NodeId; location: LibraryLocation; beforeId: NodeId | null }
  | { type: "shelf/add"; shelf: Shelf }
  | { type: "shelf/update"; id: NodeId; name: string; icon: IconName }
  | { type: "shelf/remove"; id: NodeId }
  | { type: "shelf/restore"; index: number; shelf: Shelf }
  | { type: "shelf/reorder"; id: NodeId; beforeId: NodeId | null }
  | { type: "folder/add"; location: LibraryLocation; id: NodeId; name: string }
  | { type: "folder/rename"; id: NodeId; name: string }
  | { type: "tag/assign"; noteId: NodeId; tag: string }
  | { type: "tag/add"; name: string; color: string }
  | { type: "tag/rename"; from: string; to: string }
  | { type: "tag/recolor"; name: string; color: string }
  | { type: "tag/remove"; name: string }
  | { type: "tag/restore"; index: number; tag: Tag; noteIds: readonly NodeId[] };

function withLibrary(state: Cabinet, library: Library): Cabinet {
  return library === state.library ? state : { ...state, library };
}

function withTags(state: Cabinet, tags: Tag[]): Cabinet {
  return { ...state, tags };
}

function adopt(state: Cabinet, incoming: Cabinet): Cabinet {
  const library = pendingPlacements(state.library).reduce(
    (current, placement) => addChild(current, placement.location, placement.node),
    incoming.library,
  );
  return { library, tags: incoming.tags };
}

export function cabinetReducer(state: Cabinet, action: CabinetAction): Cabinet {
  const { library, tags } = state;

  switch (action.type) {
    case "cabinet/adopt":
    case "cabinet/replace":
      return adopt(state, action.cabinet);

    case "cabinet/merge":
      return mergeCabinets(state, action.cabinet);

    case "note/addPending":
      return withLibrary(
        state,
        addChild(library, action.location, {
          id: action.id,
          type: "note",
          url: action.url,
          addedAt: action.addedAt,
          loading: true,
        }),
      );

    case "note/resolvePending":
      return withLibrary(
        state,
        replaceNode(library, action.note.id, () => action.note),
      );

    case "note/add":
      return withLibrary(state, addChild(library, action.location, action.note));

    case "note/move":
      return withLibrary(
        state,
        addChild(removeNode(library, action.note.id), action.location, action.note),
      );

    case "node/remove":
      return withLibrary(state, removeNode(library, action.id));

    case "node/restore": {
      const { location, index, node } = action.placement;
      return withLibrary(state, insertAt(library, location, node, index));
    }

    case "node/moveIntoFolder":
      return withLibrary(state, moveIntoFolder(library, action.id, action.folderId));

    case "node/moveToLocation":
      return withLibrary(state, moveToLocation(library, action.id, action.location));

    case "node/reorder":
      return withLibrary(
        state,
        reorderWithinLocation(library, action.location, action.id, action.beforeId),
      );

    case "shelf/add":
      return withLibrary(state, addShelf(library, action.shelf));

    case "shelf/update":
      return withLibrary(
        state,
        updateShelf(library, action.id, { name: action.name, icon: action.icon }),
      );

    case "shelf/remove":
      return withLibrary(state, removeShelf(library, action.id));

    case "shelf/restore":
      return withLibrary(state, insertShelf(library, action.index, action.shelf));

    case "shelf/reorder":
      return withLibrary(state, reorderShelves(library, action.id, action.beforeId));

    case "folder/add":
      return withLibrary(
        state,
        addChild(library, action.location, createFolder(action.id, action.name)),
      );

    case "folder/rename":
      return withLibrary(state, renameFolder(library, action.id, action.name));

    case "tag/assign":
      return withLibrary(
        state,
        patchNotes(library, (note) => (note.id === action.noteId ? { tag: action.tag } : null)),
      );

    case "tag/add":
      return withTags(state, addTag(tags, action.name, action.color));

    case "tag/rename":
      return {
        library: patchNotes(library, (note) =>
          note.tag === action.from ? { tag: action.to } : null,
        ),
        tags: renameTag(tags, action.from, action.to),
      };

    case "tag/recolor":
      return withTags(state, recolorTag(tags, action.name, action.color));

    case "tag/remove":
      return {
        library: patchNotes(library, (note) => (note.tag === action.name ? { tag: "" } : null)),
        tags: removeTag(tags, action.name),
      };

    case "tag/restore": {
      const wore = new Set(action.noteIds);
      return {
        library: patchNotes(library, (note) =>
          wore.has(note.id) ? { tag: action.tag.name } : null,
        ),
        tags: insertTag(tags, action.index, action.tag),
      };
    }

    default:
      return state;
  }
}
