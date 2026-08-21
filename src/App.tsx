import { useEffect, useRef, useState } from "react";
import { createId } from "@/domain/ids";
import type { LinkPreview } from "@/domain/links/linkPreview";
import { availableColors } from "@/domain/tags/tagLibrary";
import { notesWithTag } from "@/domain/library/search";
import {
  containerAt,
  findNode,
  firstShelf,
  isCabinetEmpty,
  parentContainerName,
  pathToFolder,
  placementOf,
  requireShelf,
} from "@/domain/library/tree";
import { buildNote, type NoteDraft } from "@/domain/notes/buildNote";
import {
  isNote,
  type Cabinet,
  type Folder,
  type LibraryLocation,
  type NodeId,
  type Note,
  type Shelf,
  type Tag,
} from "@/domain/model";
import { sameName } from "@/domain/transfer/mergeCabinets";
import { withFreshIds } from "@/domain/transfer/reidentify";
import { locationDropProps } from "@/dnd/dragProps";
import type { IconName } from "@/icons/names";
import { downloadTextFile } from "@/lib/files";
import { cabinetFileName, serializeCabinet } from "@/storage/cabinetFile";
import { readLink as readLinkFromWeb, type LinkReader } from "@/links/readLink";
import { usePreferences } from "@/hooks/usePreferences";
import { useImageDropTargets } from "@/hooks/useImageDropTargets";
import { useSearchShortcut } from "@/hooks/useSearchShortcut";
import { useToasts, type ToastAction } from "@/hooks/useToasts";
import { useTransientIds } from "@/hooks/useTransientIds";
import { useUndoShortcut } from "@/hooks/useUndoShortcut";
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
import { EmptyPlate } from "@/components/feedback/EmptyPlate";
import { EmptyQuiet } from "@/components/feedback/EmptyQuiet";
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
  const { preferences, setView, updateAppearance, markOnboarded } = usePreferences();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const navigation = useNavigation(requireShelf(library, "").id);
  const { toasts, push: pushToast, undoable } = useToasts();
  const fresh = useTransientIds(FRESH_HIGHLIGHT_MS);
  const searchRef = useRef<HTMLInputElement>(null);

  const view = preferences.view;
  const viewState = useLibraryView(library, navigation.state, view);
  const cabinetEmpty = isCabinetEmpty(library);
  const closeDialog = (): void => setDialog(null);
  const openCompose = (): void => setDialog({ kind: "compose", mode: "new" });

  useEffect(() => {
    setNoticeDismissed(false);
  }, [storageStatus]);

  useEffect(() => {
    if (cabinetEmpty || preferences.onboarded) return;
    markOnboarded();
  }, [cabinetEmpty, preferences.onboarded, markOnboarded]);

  useSearchShortcut(searchRef);
  useUndoShortcut(undoable);
  useLibraryDragAndDrop({ library, navigation, dispatch, pushToast });

  const viewAction = (location: LibraryLocation, note?: Note): ToastAction => ({
    kind: "view",
    run: () => {
      navigation.goTo(location);
      if (note) setDialog({ kind: "detail", note });
    },
  });

  const announceDeletion = (subject: string, undo: () => void): void => {
    pushToast({ verb: "Deleted", subject, action: { kind: "undo", run: undo } });
  };

  const deleteNode = (node: Folder | Note, subject: string): void => {
    const placement = placementOf(library, node.id);
    dispatch({ type: "node/remove", id: node.id });
    if (placement) announceDeletion(subject, () => dispatch({ type: "node/restore", placement }));
  };

  const setThumbnail = (noteId: NodeId, image: string): void => {
    const node = findNode(library, noteId);
    const note = node && isNote(node) ? node : null;
    if (!note || note.image === image) return;

    const previous = note.image ?? "";
    dispatch({ type: "note/setImage", id: noteId, image });
    pushToast({
      verb: "Thumbnail set on",
      subject: note.title || note.domain || "Untitled",
      action: {
        kind: "undo",
        run: () => dispatch({ type: "note/setImage", id: noteId, image: previous }),
      },
    });
  };

  usePasteToSave({
    library,
    location: navigation.location,
    readLink,
    dispatch,
    onSaved: (note, folder, location) => {
      pushToast({ subject: folder, action: viewAction(location, note) });
    },
    onThumbnail: setThumbnail,
  });

  useImageDropTargets(setThumbnail);

  const openFolder = (folder: FolderEntry): void => {
    if (viewState.mode !== "searching" || !folder.shelfId) {
      navigation.openFolder(folder.id);
      return;
    }
    const shelf = requireShelf(library, folder.shelfId);
    navigation.goTo({ shelfId: folder.shelfId, path: pathToFolder(shelf, folder.id) });
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
      subject: containerAt(library, draft.destination).name,
      action: viewAction(draft.destination, note),
    });
  };

  const deleteNote = (note: Note): void => {
    deleteNode(note, note.title || note.domain || "Untitled");
    if (dialog?.kind === "detail" && dialog.note.id === note.id) closeDialog();
  };

  const saveShelf = (shelf: Shelf | null, name: string, icon: IconName): void => {
    if (shelf) {
      dispatch({ type: "shelf/update", id: shelf.id, name, icon });
    } else {
      const id = createId("ch");
      dispatch({ type: "shelf/add", shelf: { id, name, icon, children: [] } });
      navigation.enterShelf(id);
      navigation.clearTag();
    }
    closeDialog();
  };

  const deleteShelf = (shelf: Shelf): void => {
    const index = library.findIndex((entry) => entry.id === shelf.id);
    const fallback = library.find((entry) => entry.id !== shelf.id);
    closeDialog();
    if (!fallback) return;

    dispatch({ type: "shelf/remove", id: shelf.id });
    if (navigation.state.shelfId === shelf.id) navigation.enterShelf(fallback.id);
    announceDeletion(shelf.name, () => dispatch({ type: "shelf/restore", index, shelf }));
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
    const index = tags.findIndex((tag) => tag.name === name);
    const tag = tags[index];
    const noteIds = notesWithTag(library, name).map((note) => note.id);

    dispatch({ type: "tag/remove", name });
    navigation.retagActive(name, null);
    closeDialog();
    if (tag) announceDeletion(name, () => dispatch({ type: "tag/restore", index, tag, noteIds }));
  };

  const exportCabinet = (): void => {
    const exportedAt = Date.now();
    downloadTextFile(cabinetFileName(exportedAt), serializeCabinet(cabinet, exportedAt));
  };

  const replaceWith = (incoming: Cabinet): Shelf => {
    dispatch({ type: "cabinet/replace", cabinet: incoming });
    return firstShelf(incoming.library);
  };

  const mergeIn = (incoming: Cabinet): Shelf => {
    const freshened = withFreshIds(incoming, createId);
    dispatch({ type: "cabinet/merge", cabinet: freshened });
    const arriving = firstShelf(freshened.library);
    return library.find((shelf) => sameName(shelf.name, arriving.name)) ?? arriving;
  };

  const importCabinet = (incoming: Cabinet, mode: ImportMode): void => {
    const landing = mode === "replace" ? replaceWith(incoming) : mergeIn(incoming);
    closeDialog();
    navigation.openShelf(landing.id);
    pushToast({
      verb: "Imported into",
      subject: landing.name,
      action: viewAction({ shelfId: landing.id, path: [] }),
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
    onDelete: (folder: Folder) => deleteNode(folder, folder.name),
  };

  const isEmpty = viewState.folders.length === 0 && viewState.notes.length === 0;
  const activeTagColor = tags.find((tag) => tag.name === navigation.state.activeTag)?.color;

  const emptyState = isEmpty
    ? emptyStateFor({
        mode: viewState.mode,
        query: navigation.state.query,
        activeTag: navigation.state.activeTag,
        shelfName: viewState.shelf.name,
        inFolder: navigation.state.path.length > 0,
        cabinetEmpty,
        onboarded: preferences.onboarded,
      })
    : null;

  return (
    <div className="app">
      <AppHeader
        query={navigation.state.query}
        searchRef={searchRef}
        appearance={preferences}
        onQueryChange={navigation.setQuery}
        onAppearanceChange={updateAppearance}
        onTransfer={() => setDialog({ kind: "transfer" })}
        onCompose={openCompose}
      />

      <div className="main">
        <Sidebar
          shelves={library}
          tags={tags}
          activeShelfId={navigation.state.shelfId}
          atShelfRoot={navigation.state.path.length === 0}
          activeTag={navigation.state.activeTag}
          onOpenShelf={(shelf) => navigation.openShelf(shelf.id)}
          onNewShelf={() => setDialog({ kind: "shelf", mode: "new" })}
          onEditShelf={(shelf) => setDialog({ kind: "shelf", mode: "edit", shelf })}
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
              showTools={!cabinetEmpty}
              canCreateFolder={viewState.canReorder}
              onViewChange={setView}
              onNewFolder={() => setDialog({ kind: "new-folder" })}
            >
              {viewState.mode === "searching" ? (
                <div className="crumbs">
                  <span className="crumb current">
                    <Icon name="search" />
                    <span className="ctxt">Results across all shelves</span>
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

            {emptyState ? (
              emptyState.kind === "plate" ? (
                <EmptyPlate
                  title={emptyState.title}
                  text={emptyState.text}
                  primer={emptyState.primer}
                  onSaveLink={openCompose}
                />
              ) : (
                <EmptyQuiet
                  title={emptyState.title}
                  text={emptyState.text}
                  onClearSearch={emptyState.clearable ? () => navigation.setQuery("") : undefined}
                />
              )
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
          parentContainerName(library, note.id) ?? viewState.shelf.name
        }
        onClose={closeDialog}
        onEditNote={(note) => setDialog({ kind: "compose", mode: "edit", note })}
        onSaveNote={saveNote}
        onCreateTag={(name, color) => dispatch({ type: "tag/add", name, color })}
        onSaveShelf={saveShelf}
        onDeleteShelf={deleteShelf}
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

      <ToastStack toasts={toasts} />
    </div>
  );
}
