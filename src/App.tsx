import { useEffect, useRef, useState } from "react";
import { createId } from "@/domain/ids";
import type { LinkPreview } from "@/domain/links/linkPreview";
import { availableColors } from "@/domain/tags/tagLibrary";
import {
  containerAt,
  firstChannel,
  parentContainerName,
  pathToFolder,
  requireChannel,
} from "@/domain/library/tree";
import { buildNote, type NoteDraft } from "@/domain/notes/buildNote";
import type { Cabinet, Channel, Folder, Note, Tag } from "@/domain/model";
import { sameName } from "@/domain/transfer/mergeCabinets";
import { withFreshIds } from "@/domain/transfer/reidentify";
import { locationDropProps } from "@/dnd/dragProps";
import type { IconName } from "@/icons/names";
import { downloadTextFile } from "@/lib/files";
import { cabinetFileName, serializeCabinet } from "@/storage/cabinetFile";
import { readLink as readLinkFromWeb, type LinkReader } from "@/links/readLink";
import { usePreferences } from "@/hooks/usePreferences";
import { useSearchShortcut } from "@/hooks/useSearchShortcut";
import { useToasts } from "@/hooks/useToasts";
import { useTransientIds } from "@/hooks/useTransientIds";
import { useCabinet } from "@/state/useCabinet";
import { useLibraryDragAndDrop } from "@/state/useLibraryDragAndDrop";
import { useLibraryView, type FolderEntry } from "@/state/useLibraryView";
import { useNavigation } from "@/state/useNavigation";
import { usePasteToSave } from "@/state/usePasteToSave";
import type { Dialog } from "@/state/dialogs";
import { DialogHost } from "@/components/DialogHost";
import type { ImportMode } from "@/components/modals/TransferModal";
import { AppHeader } from "@/components/layout/AppHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ContentToolbar } from "@/components/layout/ContentToolbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { LibraryContent } from "@/components/library/LibraryContent";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StorageNotice } from "@/components/feedback/StorageNotice";
import { ToastStack } from "@/components/feedback/ToastStack";
import { Icon } from "@/components/primitives/Icon";
import { emptyStateFor } from "@/components/library/emptyStates";

const FRESH_HIGHLIGHT_MS = 1500;

export interface AppProps {
  readLink?: LinkReader;
}

export function App({ readLink = readLinkFromWeb }: AppProps = {}) {
  const { cabinet, dispatch, storageStatus } = useCabinet();
  const { library, tags } = cabinet;
  const { preferences, setView, updateAppearance } = usePreferences();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const navigation = useNavigation(requireChannel(library, "").id);
  const { toasts, push: pushToast } = useToasts();
  const fresh = useTransientIds(FRESH_HIGHLIGHT_MS);
  const searchRef = useRef<HTMLInputElement>(null);

  const view = preferences.view;
  const viewState = useLibraryView(library, navigation.state, view);
  const closeDialog = (): void => setDialog(null);

  useEffect(() => {
    setNoticeDismissed(false);
  }, [storageStatus]);

  useSearchShortcut(searchRef);
  useLibraryDragAndDrop({ library, navigation, dispatch, pushToast });

  usePasteToSave({
    library,
    location: navigation.location,
    readLink,
    dispatch,
    onSaved: (note, folder, location) => {
      fresh.mark(note.id);
      pushToast({ folder, location, note });
    },
  });

  const openFolder = (folder: FolderEntry): void => {
    if (viewState.mode !== "searching" || !folder.channelId) {
      navigation.openFolder(folder.id);
      return;
    }
    const channel = requireChannel(library, folder.channelId);
    navigation.goTo({ channelId: folder.channelId, path: pathToFolder(channel, folder.id) });
  };

  const saveNote = (draft: NoteDraft, preview: LinkPreview | null, editing: Note | null): void => {
    if (editing) {
      const note = buildNote(draft, preview, { id: editing.id, addedAt: editing.addedAt });
      dispatch({ type: "note/move", location: draft.destination, note });
      closeDialog();
      fresh.mark(note.id);
      return;
    }

    const note = buildNote(draft, preview);
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

  const exportCabinet = (): void => {
    const exportedAt = Date.now();
    downloadTextFile(cabinetFileName(exportedAt), serializeCabinet(cabinet, exportedAt));
  };

  const replaceWith = (incoming: Cabinet): Channel => {
    dispatch({ type: "cabinet/replace", cabinet: incoming });
    return firstChannel(incoming.library);
  };

  const mergeIn = (incoming: Cabinet): Channel => {
    const freshened = withFreshIds(incoming, createId);
    dispatch({ type: "cabinet/merge", cabinet: freshened });
    const arriving = firstChannel(freshened.library);
    return library.find((channel) => sameName(channel.name, arriving.name)) ?? arriving;
  };

  const importCabinet = (incoming: Cabinet, mode: ImportMode): void => {
    const landing = mode === "replace" ? replaceWith(incoming) : mergeIn(incoming);
    closeDialog();
    navigation.openChannel(landing.id);
    pushToast({
      verb: "Imported into",
      folder: landing.name,
      location: { channelId: landing.id, path: [] },
    });
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
        appearance={preferences}
        onQueryChange={navigation.setQuery}
        onAppearanceChange={updateAppearance}
        onTransfer={() => setDialog({ kind: "transfer" })}
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
            {storageStatus !== "ok" && !noticeDismissed ? (
              <StorageNotice problem={storageStatus} onDismiss={() => setNoticeDismissed(true)} />
            ) : null}

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
        readLink={readLink}
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
        onExportCabinet={exportCabinet}
        onImportCabinet={importCabinet}
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
