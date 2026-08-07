import {
  addChannel,
  addChild,
  createFolder,
  moveIntoFolder,
  moveToLocation,
  patchNotes,
  removeChannel,
  removeNode,
  renameFolder,
  reorderChannels,
  reorderWithinLocation,
  replaceNode,
  updateChannel,
} from "@/domain/library/mutations";
import type { Channel, Library, LibraryLocation, NodeId, Note, Tag } from "@/domain/model";
import { addTag, recolorTag, removeTag, renameTag } from "@/domain/tags/tagLibrary";
import type { IconName } from "@/icons/names";

export interface CabinetState {
  library: Library;
  tags: Tag[];
}

export type CabinetAction =
  | { type: "note/addPending"; location: LibraryLocation; id: NodeId }
  | { type: "note/resolvePending"; note: Note }
  | { type: "note/add"; location: LibraryLocation; note: Note }
  | { type: "note/move"; location: LibraryLocation; note: Note }
  | { type: "node/remove"; id: NodeId }
  | { type: "node/moveIntoFolder"; id: NodeId; folderId: NodeId }
  | { type: "node/moveToLocation"; id: NodeId; location: LibraryLocation }
  | { type: "node/reorder"; id: NodeId; location: LibraryLocation; beforeId: NodeId | null }
  | { type: "channel/add"; channel: Channel }
  | { type: "channel/update"; id: NodeId; name: string; icon: IconName }
  | { type: "channel/remove"; id: NodeId }
  | { type: "channel/reorder"; id: NodeId; beforeId: NodeId | null }
  | { type: "folder/add"; location: LibraryLocation; id: NodeId; name: string }
  | { type: "folder/rename"; id: NodeId; name: string }
  | { type: "tag/assign"; noteId: NodeId; tag: string }
  | { type: "tag/add"; name: string; color: string }
  | { type: "tag/rename"; from: string; to: string }
  | { type: "tag/recolor"; name: string; color: string }
  | { type: "tag/remove"; name: string };

function withLibrary(state: CabinetState, library: Library): CabinetState {
  return library === state.library ? state : { ...state, library };
}

function withTags(state: CabinetState, tags: Tag[]): CabinetState {
  return { ...state, tags };
}

export function cabinetReducer(state: CabinetState, action: CabinetAction): CabinetState {
  const { library, tags } = state;

  switch (action.type) {
    case "note/addPending":
      return withLibrary(
        state,
        addChild(library, action.location, { id: action.id, type: "note", loading: true }),
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

    case "node/moveIntoFolder":
      return withLibrary(state, moveIntoFolder(library, action.id, action.folderId));

    case "node/moveToLocation":
      return withLibrary(state, moveToLocation(library, action.id, action.location));

    case "node/reorder":
      return withLibrary(
        state,
        reorderWithinLocation(library, action.location, action.id, action.beforeId),
      );

    case "channel/add":
      return withLibrary(state, addChannel(library, action.channel));

    case "channel/update":
      return withLibrary(
        state,
        updateChannel(library, action.id, { name: action.name, icon: action.icon }),
      );

    case "channel/remove":
      return withLibrary(state, removeChannel(library, action.id));

    case "channel/reorder":
      return withLibrary(state, reorderChannels(library, action.id, action.beforeId));

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

    default:
      return state;
  }
}
