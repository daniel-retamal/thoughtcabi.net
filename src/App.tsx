import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createId } from "@/domain/ids";
import { imageUrlFrom } from "@/domain/links/imageUrl";
import type { LinkPreview } from "@/domain/links/linkPreview";
import { availableColors } from "@/domain/tags/tagLibrary";
import { notesWithTag } from "@/domain/library/search";
import {
  containerAt,
  findNode,
  firstShelf,
  locateNode,
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
  type Locale,
  type Note,
  type Shelf,
  type Tag,
} from "@/domain/model";
import type { Cadence, ProviderId } from "@/domain/sync/types";
import { sameName } from "@/domain/transfer/mergeCabinets";
import { withFreshIds } from "@/domain/transfer/reidentify";
import { DND_ATTR } from "@/dnd/attributes";
import { locationDropProps } from "@/dnd/dragProps";
import type { IconName } from "@/icons/names";
import { readClipboardImage, readClipboardText, writeClipboardText } from "@/lib/clipboard";
import { downscaleImage } from "@/lib/downscaleImage";
import { cssVars } from "@/lib/cssVars";
import { downloadTextFile } from "@/lib/files";
import { cabinetFileName, serializeCabinet } from "@/storage/cabinetFile";
import { readLink as readLinkFromWeb, type LinkReader } from "@/links/readLink";
import { cabinetNames } from "@/storage/names";
import { I18nProvider } from "@/i18n/I18nProvider";
import { dictionaryFor } from "@/i18n/locales";
import { usePreferences } from "@/hooks/usePreferences";
import { useImageDropTargets } from "@/hooks/useImageDropTargets";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useOnEscape } from "@/hooks/useOnEscape";
import { useSearchShortcut } from "@/hooks/useSearchShortcut";
import { useSidebarResize } from "@/hooks/useSidebarResize";
import { useSidebarShortcut } from "@/hooks/useSidebarShortcut";
import { useLatest } from "@/hooks/useLatest";
import { useToasts, type ToastAction } from "@/hooks/useToasts";
import { useTransientIds } from "@/hooks/useTransientIds";
import { useUndoShortcut } from "@/hooks/useUndoShortcut";
import { browserBaseStore, type BaseStore } from "@/sync/baseStore";
import type { RemoteProvider } from "@/sync/types";
import { useCabinet } from "@/state/useCabinet";
import { useOAuthReturn } from "@/state/useOAuthReturn";
import { useRemoteSync } from "@/state/useRemoteSync";
import { useLibraryDragAndDrop } from "@/state/useLibraryDragAndDrop";
import { useLibraryView, type FolderEntry } from "@/state/useLibraryView";
import { useNavigation } from "@/state/useNavigation";
import { usePasteToSave } from "@/state/usePasteToSave";
import type { Dialog } from "@/state/dialogs";
import { DialogHost } from "@/components/DialogHost";
import { SyncAnswerModal } from "@/components/modals/SyncAnswerModal";
import type { ImportMode } from "@/components/modals/TransferModal";
import { SyncStatus } from "@/components/sync/SyncStatus";
import { providerFace } from "@/components/sync/providerFace";
import type { StagedCabinet, SyncSurface } from "@/components/sync/surface";
import { AppControls } from "@/components/layout/AppControls";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ContentToolbar } from "@/components/layout/ContentToolbar";
import { PaneBar } from "@/components/layout/PaneBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarGrip } from "@/components/layout/SidebarGrip";
import { LibraryContent } from "@/components/library/LibraryContent";
import { EmptyPlate } from "@/components/feedback/EmptyPlate";
import { EmptyQuiet } from "@/components/feedback/EmptyQuiet";
import { StorageNotice } from "@/components/feedback/StorageNotice";
import { ToastStack } from "@/components/feedback/ToastStack";
import { Icon } from "@/components/primitives/Icon";
import { emptyStateFor } from "@/components/library/emptyStates";
import { ContextMenu } from "@/components/menus/ContextMenu";
import { contextMenuFor, type ContextTarget } from "@/components/menus/contextMenuItems";

const FRESH_HIGHLIGHT_MS = 1500;

const NO_PROVIDERS: readonly RemoteProvider[] = [];

export interface AppProps {
  readLink?: LinkReader;
  providers?: readonly RemoteProvider[];
  baseStore?: BaseStore;
}

export function App({
  readLink = readLinkFromWeb,
  providers = NO_PROVIDERS,
  baseStore,
}: AppProps = {}) {
  const {
    preferences,
    setView,
    setSidebar,
    setSidebarSize,
    setLanguage,
    updateAppearance,
    markOnboarded,
  } = usePreferences();
  const copy = dictionaryFor(preferences.language);
  const { cabinet, dispatch, storageStatus } = useCabinet(cabinetNames(copy));
  const { library, tags } = cabinet;
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; target: ContextTarget } | null>(null);
  const [staged, setStaged] = useState<StagedCabinet | null>(null);

  const navigation = useNavigation(requireShelf(library, "").id);
  const { toasts, push: pushToast, undoable } = useToasts();
  const fresh = useTransientIds(FRESH_HIGHLIGHT_MS);
  const searchRef = useRef<HTMLInputElement>(null);
  const latestLibrary = useLatest(library);
  const fallbackBaseStore = useMemo(browserBaseStore, []);
  const shellRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  const view = preferences.view;
  const viewState = useLibraryView(library, navigation.state, view, copy.categories);
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

  const compact = useMediaQuery("(max-width: 760px)");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = (): void => setDrawerOpen(false);

  const toggleSidebar = (): void => {
    if (compact) {
      setDrawerOpen((open) => !open);
      return;
    }
    setSidebar(preferences.sidebar === "wide" ? "rail" : "wide");
  };

  useOnEscape(closeDrawer);

  useEffect(() => {
    document.documentElement.setAttribute("data-drawer", drawerOpen ? "open" : "shut");
  }, [drawerOpen]);

  const sidebarResize = useSidebarResize({
    shellRef,
    brandRef,
    mode: preferences.sidebar,
    width: preferences.sidebarWidth,
    onResize: setSidebarSize,
    onToggle: toggleSidebar,
  });

  useSearchShortcut(searchRef);
  useSidebarShortcut(toggleSidebar);
  useUndoShortcut(undoable);
  useLibraryDragAndDrop({ library, navigation, dispatch, pushToast });

  const viewAction = (location: LibraryLocation, note?: Note): ToastAction => ({
    kind: "view",
    run: () => {
      navigation.goTo(location);
      if (note) setDialog({ kind: "detail", note });
    },
  });

  const changeLanguage = (next: Locale): void => {
    const to = dictionaryFor(next).seed.shelfName;
    if (to !== copy.seed.shelfName) {
      dispatch({ type: "shelf/relabelSeed", from: copy.seed.shelfName, to });
    }
    setLanguage(next);
  };

  const announceDeletion = (subject: string, undo: () => void): void => {
    pushToast({ verb: "deleted", subject, action: { kind: "undo", run: undo } });
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
      verb: "thumbnailSetOn",
      subject: note.title || note.domain || copy.fallback.untitled,
      action: {
        kind: "undo",
        run: () => dispatch({ type: "note/setImage", id: noteId, image: previous }),
      },
    });
  };

  const takePastedText = usePasteToSave({
    library,
    location: viewState.location,
    readLink,
    dispatch,
    onSaved: (note, folder, location) => {
      pushToast({ subject: folder, action: viewAction(location, note) });
    },
    onThumbnail: setThumbnail,
  });

  useImageDropTargets(setThumbnail);

  const pasteLinkFromClipboard = (): void => {
    void readClipboardText().then((text) => {
      if (!text || !takePastedText(text)) openCompose();
    });
  };

  const pasteThumbnailOnto = (note: Note): void => {
    void readClipboardImage().then(async (blob) => {
      if (blob) {
        const stored = await downscaleImage(await blobToDataUrl(blob)).catch(() => null);
        if (stored) {
          setThumbnail(note.id, stored.dataUrl);
          return;
        }
      }

      const text = await readClipboardText();
      const image = imageUrlFrom(text);
      if (image) setThumbnail(note.id, image);
      else setDialog({ kind: "compose", mode: "edit", note });
    });
  };

  const openContextMenu = (event: ReactMouseEvent<HTMLDivElement>): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("input, textarea, a, .ctx-menu")) return;
    if (!window.getSelection()?.isCollapsed) return;

    const card = target.closest(
      `[${DND_ATTR.dragKind}="item"][${DND_ATTR.dragId}], [${DND_ATTR.dragKind}="folder"][${DND_ATTR.dragId}]`,
    );
    const cardId = card?.getAttribute(DND_ATTR.dragId);
    const folder = cardId ? viewState.folders.find((entry) => entry.id === cardId) : undefined;
    const node = cardId && !folder ? findNode(library, cardId) : undefined;
    const note = node && isNote(node) ? node : null;

    event.preventDefault();
    setMenu({
      x: event.clientX,
      y: event.clientY,
      target: folder
        ? { kind: "folder", folder }
        : note
          ? { kind: "note", note }
          : { kind: "background", canCreateFolder: viewState.canReorder },
    });
  };

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
    deleteNode(note, note.title || note.domain || copy.fallback.untitled);
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
      verb: "importedInto",
      subject: landing.name,
      action: viewAction({ shelfId: landing.id, path: [] }),
    });
  };

  const remote = useRemoteSync({
    cabinet,
    dispatch,
    names: cabinetNames(copy),
    conflictsFolder: copy.sync.conflictsFolder,
    providers,
    baseStore: baseStore ?? fallbackBaseStore,
    onArrived: (ids) => ids.forEach(fresh.mark),
    onParked: (ids) => {
      const parked = ids[0];
      pushToast({
        verb: "keptTwoVersions",
        subject: copy.sync.conflictsFolder,
        action: parked
          ? {
              kind: "view",
              run: () => {
                const at = locateNode(latestLibrary.current, parked);
                if (at) navigation.goTo(at);
              },
            }
          : undefined,
      });
    },
    onSavedAside: (name) => pushToast({ verb: "savedACopy", subject: name }),
  });

  useOAuthReturn({
    connect: remote.connect,
    onRefused: (provider, problem) =>
      pushToast({
        verb: problem === "auth" ? "couldNotSignIn" : "couldNotConnect",
        subject: providerFace(provider, copy).label,
      }),
  });

  const openTransfer = (): void => {
    setStaged(null);
    setDialog({ kind: "transfer" });
  };

  const syncSurface: SyncSurface = {
    providers,
    destinations: remote.destinations,
    staged,
    onAddPlace: () => setDialog({ kind: "sync-connect", from: "places" }),
    onPlaces: () => setDialog({ kind: "transfer" }),
    onConnect: async (provider: ProviderId, fields: Record<string, string>) => {
      const result = await remote.connect(provider, fields);
      if (result.ok) closeDialog();
      return result;
    },
    onResume: remote.resume,
    onRestore: (id) => {
      const view = remote.destinations.find((entry) => entry.destination.id === id);
      void remote.restore(id).then((read) => {
        if (!read) return;
        setStaged({ name: view?.destination.locator.name ?? id, read });
        setDialog({ kind: "transfer" });
      });
    },
    onMakeHome: remote.makeHome,
    onCadence: (id, cadence: Cadence) => remote.setCadence(id, cadence),
    onDisconnect: remote.disconnect,
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
    ? emptyStateFor(
        {
          mode: viewState.mode,
          query: navigation.state.query,
          activeTag: navigation.state.activeTag,
          shelfName: viewState.shelf.name,
          inFolder: navigation.state.path.length > 0,
          cabinetEmpty,
          onboarded: preferences.onboarded,
        },
        copy,
      )
    : null;

  const controls = (
    <AppControls
      appearance={preferences}
      language={preferences.language}
      onAppearanceChange={updateAppearance}
      onLanguageChange={changeLanguage}
      onTransfer={openTransfer}
      pill={
        <SyncStatus
          state={remote.pill}
          destinations={remote.destinations}
          onSyncNow={remote.syncNow}
          onResume={remote.resume}
          onManage={openTransfer}
        />
      }
    />
  );

  const crumbs =
    viewState.mode === "searching" ? (
      <div className="crumbs">
        <span className="crumb current">
          <Icon name="search" />
          <span className="ctxt">{copy.paneBar.searchResults}</span>
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
    );

  return (
    <I18nProvider copy={copy}>
      <div className="app">
        {drawerOpen ? (
          <div className="scrim drawer-scrim" onClick={closeDrawer} aria-hidden="true" />
        ) : null}

        <div
          className="shell"
          ref={shellRef}
          style={cssVars({ "--sidebar-set": `${preferences.sidebarWidth}px` })}
        >
          <Sidebar
            shelves={library}
            tags={tags}
            activeShelfId={navigation.state.shelfId}
            atShelfRoot={navigation.state.path.length === 0}
            activeTag={navigation.state.activeTag}
            mode={compact ? "wide" : preferences.sidebar}
            brandRef={brandRef}
            footer={compact ? controls : null}
            onOpenShelf={(shelf) => {
              navigation.openShelf(shelf.id);
              closeDrawer();
            }}
            onNewShelf={() => setDialog({ kind: "shelf", mode: "new" })}
            onEditShelf={(shelf) => setDialog({ kind: "shelf", mode: "edit", shelf })}
            onSelectTag={(name) => {
              navigation.selectTag(name);
              closeDrawer();
            }}
            onNewTag={() =>
              setDialog({ kind: "tag", mode: "new", color: availableColors(tags)[0] ?? "" })
            }
            onEditTag={(tag) => setDialog({ kind: "tag", mode: "edit", tag })}
          />

          <div className="pane">
            <PaneBar
              query={navigation.state.query}
              searchRef={searchRef}
              crumbs={crumbs}
              controls={compact ? null : controls}
              compact={compact}
              wide={preferences.sidebar === "wide"}
              onToggleSidebar={toggleSidebar}
              onQueryChange={navigation.setQuery}
              onCompose={openCompose}
            />

            <div className="pane-body" onContextMenu={openContextMenu}>
              <div
                className="body-inner"
                {...(viewState.canReorder ? locationDropProps(viewState.location) : {})}
              >
                {storageStatus !== "ok" && !noticeDismissed ? (
                  <StorageNotice
                    problem={storageStatus}
                    onDismiss={() => setNoticeDismissed(true)}
                  />
                ) : null}

                <ContentToolbar
                  noteCount={viewState.notes.length}
                  folderCount={viewState.folders.length}
                  view={view}
                  showTools={!cabinetEmpty}
                  canCreateFolder={viewState.canReorder}
                  onViewChange={setView}
                  onNewFolder={() => setDialog({ kind: "new-folder" })}
                />

                {emptyState ? (
                  emptyState.kind === "plate" ? (
                    <EmptyPlate
                      title={emptyState.title}
                      text={emptyState.text}
                      primer={emptyState.primer}
                      language={preferences.language}
                      onSaveLink={openCompose}
                      onBringCabinet={
                        remote.destinations.length === 0
                          ? () => setDialog({ kind: "sync-connect", from: "empty" })
                          : null
                      }
                      onLanguageChange={changeLanguage}
                    />
                  ) : (
                    <EmptyQuiet
                      title={emptyState.title}
                      text={emptyState.text}
                      onClearSearch={
                        emptyState.clearable ? () => navigation.setQuery("") : undefined
                      }
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

          {compact ? null : <SidebarGrip handlers={sidebarResize} />}
        </div>

        <DialogHost
          dialog={dialog}
          library={library}
          tags={tags}
          currentLocation={viewState.location}
          readLink={readLink}
          sync={syncSurface}
          detailLocationLabel={(note) =>
            parentContainerName(library, note.id) ?? viewState.shelf.name
          }
          onClose={closeDialog}
          onEditNote={(note) => setDialog({ kind: "compose", mode: "edit", note })}
          onDeleteNote={deleteNote}
          onSaveNote={saveNote}
          onCreateTag={(name, color) => dispatch({ type: "tag/add", name, color })}
          onSaveShelf={saveShelf}
          onDeleteShelf={deleteShelf}
          onSaveTag={saveTag}
          onDeleteTag={deleteTag}
          onCreateFolder={(name) => {
            dispatch({
              type: "folder/add",
              location: viewState.location,
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

        {remote.question ? (
          <SyncAnswerModal
            question={remote.question}
            library={library}
            tags={tags}
            onAnswer={remote.answer}
            onCancel={remote.dismissQuestion}
          />
        ) : null}

        {menu ? (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            items={contextMenuFor(
              menu.target,
              {
                onPasteLink: pasteLinkFromClipboard,
                onSaveLink: openCompose,
                onNewFolder: () => setDialog({ kind: "new-folder" }),
                onOpenFolder: folderHandlers.onOpen,
                onRenameFolder: folderHandlers.onRename,
                onDeleteFolder: folderHandlers.onDelete,
                onOpen: (note) => setDialog({ kind: "detail", note }),
                onCopyLink: (note) => writeClipboardText(note.url),
                onEdit: (note) => setDialog({ kind: "compose", mode: "edit", note }),
                onPasteThumbnail: pasteThumbnailOnto,
                onDelete: deleteNote,
              },
              copy,
            )}
            onClose={() => setMenu(null)}
          />
        ) : null}

        <ToastStack toasts={toasts} />
      </div>
    </I18nProvider>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("unreadable"));
    reader.readAsDataURL(blob);
  });
}
