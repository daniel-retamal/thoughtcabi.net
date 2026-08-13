import { useCallback, useMemo, useState } from "react";
import type { LibraryLocation, NodeId } from "@/domain/model";

export interface NavigationState {
  shelfId: NodeId;
  path: NodeId[];
  query: string;
  activeTag: string | null;
}

export interface Navigation {
  state: NavigationState;
  location: LibraryLocation;
  openShelf: (shelfId: NodeId) => void;
  enterShelf: (shelfId: NodeId) => void;
  openFolder: (folderId: NodeId) => void;
  goTo: (location: LibraryLocation) => void;
  jumpToDepth: (depth: number) => void;
  selectTag: (name: string) => void;
  clearTag: () => void;
  retagActive: (from: string, to: string | null) => void;
  setQuery: (query: string) => void;
  restore: (state: NavigationState) => void;
}

export function useNavigation(initialShelfId: NodeId): Navigation {
  const [state, setState] = useState<NavigationState>({
    shelfId: initialShelfId,
    path: [],
    query: "",
    activeTag: null,
  });

  const openShelf = useCallback((shelfId: NodeId) => {
    setState({ shelfId, path: [], query: "", activeTag: null });
  }, []);

  const enterShelf = useCallback((shelfId: NodeId) => {
    setState((current) => ({ ...current, shelfId, path: [] }));
  }, []);

  const openFolder = useCallback((folderId: NodeId) => {
    setState((current) => ({
      ...current,
      path: [...current.path, folderId],
      query: "",
      activeTag: null,
    }));
  }, []);

  const goTo = useCallback((location: LibraryLocation) => {
    setState({
      shelfId: location.shelfId,
      path: [...location.path],
      query: "",
      activeTag: null,
    });
  }, []);

  const jumpToDepth = useCallback((depth: number) => {
    setState((current) => ({ ...current, path: current.path.slice(0, depth), query: "" }));
  }, []);

  const selectTag = useCallback((name: string) => {
    setState((current) => ({
      ...current,
      activeTag: current.activeTag === name ? null : name,
      query: "",
    }));
  }, []);

  const clearTag = useCallback(() => {
    setState((current) => ({ ...current, activeTag: null }));
  }, []);

  const retagActive = useCallback((from: string, to: string | null) => {
    setState((current) => (current.activeTag === from ? { ...current, activeTag: to } : current));
  }, []);

  const setQuery = useCallback((query: string) => {
    setState((current) => ({ ...current, query }));
  }, []);

  const restore = useCallback((snapshot: NavigationState) => {
    setState(snapshot);
  }, []);

  const location = useMemo<LibraryLocation>(
    () => ({ shelfId: state.shelfId, path: state.path }),
    [state.shelfId, state.path],
  );

  return {
    state,
    location,
    openShelf,
    enterShelf,
    openFolder,
    goTo,
    jumpToDepth,
    selectTag,
    clearTag,
    retagActive,
    setQuery,
    restore,
  };
}
