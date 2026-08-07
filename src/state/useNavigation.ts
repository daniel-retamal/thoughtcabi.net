import { useCallback, useMemo, useState } from "react";
import type { LibraryLocation, NodeId } from "@/domain/model";

export interface NavigationState {
  channelId: NodeId;
  path: NodeId[];
  query: string;
  activeTag: string | null;
}

export interface Navigation {
  state: NavigationState;
  location: LibraryLocation;
  openChannel: (channelId: NodeId) => void;
  enterChannel: (channelId: NodeId) => void;
  openFolder: (folderId: NodeId) => void;
  goTo: (location: LibraryLocation) => void;
  jumpToDepth: (depth: number) => void;
  selectTag: (name: string) => void;
  clearTag: () => void;
  retagActive: (from: string, to: string | null) => void;
  setQuery: (query: string) => void;
  restore: (state: NavigationState) => void;
}

export function useNavigation(initialChannelId: NodeId): Navigation {
  const [state, setState] = useState<NavigationState>({
    channelId: initialChannelId,
    path: [],
    query: "",
    activeTag: null,
  });

  const openChannel = useCallback((channelId: NodeId) => {
    setState({ channelId, path: [], query: "", activeTag: null });
  }, []);

  const enterChannel = useCallback((channelId: NodeId) => {
    setState((current) => ({ ...current, channelId, path: [] }));
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
      channelId: location.channelId,
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
    () => ({ channelId: state.channelId, path: state.path }),
    [state.channelId, state.path],
  );

  return {
    state,
    location,
    openChannel,
    enterChannel,
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
