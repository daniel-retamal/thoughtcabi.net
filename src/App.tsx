import { useRef, useState } from "react";
import { createId } from "@/domain/ids";
import { recognizeLink } from "@/domain/links/recognizeLink";
import { availableColors } from "@/domain/tags/tagLibrary";
import {
  containerAt,
  parentContainerName,
  pathToFolder,
  requireChannel,
} from "@/domain/library/tree";
import { buildNote, type NoteDraft } from "@/domain/notes/buildNote";
import type { Channel, Folder, Note, Tag, ViewMode } from "@/domain/model";
import { locationDropProps } from "@/dnd/dragProps";
import type { IconName } from "@/icons/names";
import { useAppearance } from "@/hooks/useAppearance";
import { useGlobalPaste } from "@/hooks/useGlobalPaste";
import { useSearchShortcut } from "@/hooks/useSearchShortcut";
import { useToasts } from "@/hooks/useToasts";
import { useTransientIds } from "@/hooks/useTransientIds";
import { usePersistentState } from "@/hooks/usePersistentState";
import { loadViewMode, saveViewMode } from "@/storage/appState";
import { useCabinet } from "@/state/useCabinet";
import { useLibraryDragAndDrop } from "@/state/useLibraryDragAndDrop";
import { useLibraryView, type FolderEntry } from "@/state/useLibraryView";
import { useNavigation } from "@/state/useNavigation";
import type { Dialog } from "@/state/dialogs";
import { DialogHost } from "@/components/DialogHost";
import { AppHeader } from "@/components/layout/AppHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ContentToolbar } from "@/components/layout/ContentToolbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { LibraryContent } from "@/components/library/LibraryContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ToastStack } from "@/components/feedback/ToastStack";
import { Icon } from "@/components/primitives/Icon";
import { emptyStateFor } from "@/components/library/emptyStates";

const LINK_RECOGNITION_MS = 850;
const FRESH_HIGHLIGHT_MS = 1500;

export function App() {
  const [{ library, tags }, dispatch] = useCabinet();
  const [view, setView] = usePersistentState<ViewMode>(loadViewMode, saveViewMode);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const navigation = useNavigation(requireChannel(library, "").id);
  const { appearance, update: updateAppearance } = useAppearance();
  const { toasts, push: pushToast } = useToasts();
  const fresh = useTransientIds(FRESH_HIGHLIGHT_MS);
  const searchRef = useRef<HTMLInputElement>(null);

  const viewState = useLibraryView(library, navigation.state, view);
  const closeDialog = (): void => setDialog(null);

  useSearchShortcut(searchRef);
  useLibraryDragAndDrop({ library, navigation, dispatch, pushToast });

  useGlobalPaste((text) => {
    const recognized = recognizeLink(text);
    if (!recognized) return false;

    const id = createId("l");
    const location = navigation.location;
    const folder = containerAt(library, location).name;

    dispatch({ type: "note/addPending", location, id });
    setTimeout(() => {
      const note: Note = { ...recognized, id, type: "note", tag: "", addedAt: Date.now() };
      dispatch({ type: "note/resolvePending", note });
      fresh.mark(id);
      pushToast({ folder, location, note });
    }, LINK_RECOGNITION_MS);

    return true;
  });

  const openFolder = (folder: FolderEntry): void => {
    if (viewState.mode !== "searching" || !folder.channelId) {
      navigation.openFolder(folder.id);
      return;
    }
    const channel = requireChannel(library, folder.channelId);
    navigation.goTo({ channelId: folder.channelId, path: pathToFolder(channel, folder.id) });
  };

  const saveNote = (draft: NoteDraft, editing: Note | null): void => {
    if (editing) {
      const note = buildNote(draft, { id: editing.id, addedAt: editing.addedAt });
      dispatch({ type: "note/move", location: draft.destination, note });
      closeDialog();
      fresh.mark(note.id);
      return;
    }

    const note = buildNote(draft);
    dispatch({ type: "note/add", location: draft.destination, note });
    closeDialog();
    fresh.mark(note.id);
    pushToast({
      folder: containerAt(library, draft.destination).name,
      location: draft.destination,
      note,
    });
  };

  const deleteNote = (note: Note): void => {
    dispatch({ type: "node/remove", id: note.id });
    if (dialog?.kind === "detail" && dialog.note.id === note.id) closeDialog();
  };

  const saveChannel = (channel: Channel | null, name: string, icon: IconName): void => {
    if (channel) {
      dispatch({ type: "channel/update", id: channel.id, name, icon });
    } else {
      const id = createId("ch");
      dispatch({ type: "channel/add", channel: { id, name, icon, children: [] } });
      navigation.enterChannel(id);
      navigation.clearTag();
    }
    closeDialog();
  };

  const deleteChannel = (channel: Channel): void => {
    const remaining = library.filter((entry) => entry.id !== channel.id);
    const fallback = remaining[0];
    if (!fallback) {
      closeDialog();
      return;
    }
    dispatch({ type: "channel/remove", id: channel.id });
    if (navigation.state.channelId === channel.id) navigation.enterChannel(fallback.id);
    closeDialog();
  };

  const saveTag = (original: Tag | null, name: string, color: string): void => {
    if (!original) {
      dispatch({ type: "tag/add", name, color });
    } else {
      if (name !== original.name) {
        dispatch({ type: "tag/rename", from: original.name, to: name });
        navigation.retagActive(original.name, name);
      }
      if (color !== original.color) dispatch({ type: "tag/recolor", name, color });
    }
    closeDialog();
  };

  const deleteTag = (name: string): void => {
    dispatch({ type: "tag/remove", name });
    navigation.retagActive(name, null);
    closeDialog();
  };

  const noteHandlers = {
    onOpen: (note: Note) => setDialog({ kind: "detail", note }),
    onEdit: (note: Note) => setDialog({ kind: "compose", mode: "edit", note }),
    onDelete: deleteNote,
  };

  const folderHandlers = {
    onOpen: openFolder,
    onRename: (folder: Folder) => setDialog({ kind: "rename-folder", folder }),
    onDelete: (folder: Folder) => dispatch({ type: "node/remove", id: folder.id }),
  };

  const isEmpty = viewState.folders.length === 0 && viewState.notes.length === 0;
  const activeTagColor = tags.find((tag) => tag.name === navigation.state.activeTag)?.color;

  return (
    <div className="app">
      <AppHeader
        query={navigation.state.query}
        searchRef={searchRef}
        appearance={appearance}
        onQueryChange={navigation.setQuery}
        onAppearanceChange={updateAppearance}
        onCompose={() => setDialog({ kind: "compose", mode: "new" })}
      />

      <div className="main">
        <Sidebar
          channels={library}
          tags={tags}
          activeChannelId={navigation.state.channelId}
          atChannelRoot={navigation.state.path.length === 0}
          activeTag={navigation.state.activeTag}
          onOpenChannel={(channel) => navigation.openChannel(channel.id)}
          onNewChannel={() => setDialog({ kind: "channel", mode: "new" })}
          onEditChannel={(channel) => setDialog({ kind: "channel", mode: "edit", channel })}
          onSelectTag={navigation.selectTag}
          onNewTag={() =>
            setDialog({ kind: "tag", mode: "new", color: availableColors(tags)[0] ?? "" })
          }
          onEditTag={(tag) => setDialog({ kind: "tag", mode: "edit", tag })}
        />

        <div className="body">
          <div
            className="body-inner"
            {...(viewState.canReorder ? locationDropProps(navigation.location) : {})}
          >
            <ContentToolbar
              noteCount={viewState.notes.length}
              folderCount={viewState.folders.length}
              view={view}
              canCreateFolder={viewState.canReorder}
              onViewChange={setView}
              onNewFolder={() => setDialog({ kind: "new-folder" })}
            >
              {viewState.mode === "searching" ? (
                <div className="crumbs">
                  <span className="crumb current">
                    <Icon name="search" />
                    <span className="ctxt">Results across all channels</span>
                  </span>
                </div>
              ) : viewState.mode === "tagged" ? (
                <div className="crumbs">
                  <span className="crumb current">
                    <span className="tag-crumb-dot" style={{ background: activeTagColor }} />
                    <span className="ctxt">{navigation.state.activeTag}</span>
                  </span>
                </div>
              ) : (
                <Breadcrumbs crumbs={viewState.crumbs} onJump={navigation.jumpToDepth} />
              )}
            </ContentToolbar>

            {isEmpty ? (
              <EmptyState {...emptyStateFor(viewState.mode, navigation.state)} />
            ) : (
              <div className="fade-swap" key={viewState.contentKey}>
                <LibraryContent
                  view={view}
                  folders={viewState.folders}
                  notes={viewState.notes}
                  tags={tags}
                  isFresh={fresh.has}
                  canReorder={viewState.canReorder}
                  noteHandlers={noteHandlers}
                  folderHandlers={folderHandlers}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <DialogHost
        dialog={dialog}
        library={library}
        tags={tags}
        currentLocation={navigation.location}
        detailLocationLabel={(note) =>
          parentContainerName(library, note.id) ?? viewState.channel.name
        }
        onClose={closeDialog}
        onEditNote={(note) => setDialog({ kind: "compose", mode: "edit", note })}
        onSaveNote={saveNote}
        onSaveChannel={saveChannel}
        onDeleteChannel={deleteChannel}
        onSaveTag={saveTag}
        onDeleteTag={deleteTag}
        onCreateFolder={(name) => {
          dispatch({
            type: "folder/add",
            location: navigation.location,
            id: createId("f"),
            name,
          });
          closeDialog();
        }}
        onRenameFolder={(folderId, name) => {
          dispatch({ type: "folder/rename", id: folderId, name });
          closeDialog();
        }}
      />

      <ToastStack
        toasts={toasts}
        onView={(toast) => {
          navigation.goTo(toast.location);
          if (toast.note) setDialog({ kind: "detail", note: toast.note });
        }}
      />
    </div>
  );
}
