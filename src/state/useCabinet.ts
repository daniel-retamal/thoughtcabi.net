import { useEffect, useReducer, type Dispatch } from "react";
import { loadLibrary, loadTags, saveLibrary, saveTags } from "@/storage/appState";
import { cabinetReducer, type CabinetAction, type CabinetState } from "./cabinetReducer";

function loadCabinet(): CabinetState {
  return { library: loadLibrary(), tags: loadTags() };
}

export function useCabinet(): [CabinetState, Dispatch<CabinetAction>] {
  const [state, dispatch] = useReducer(cabinetReducer, null, loadCabinet);

  useEffect(() => {
    saveLibrary(state.library);
  }, [state.library]);

  useEffect(() => {
    saveTags(state.tags);
  }, [state.tags]);

  return [state, dispatch];
}
