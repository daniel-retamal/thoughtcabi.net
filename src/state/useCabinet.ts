import { useEffect, useReducer, useState, type Dispatch } from "react";
import type { Cabinet } from "@/domain/model";
import { loadCabinet, saveCabinet } from "@/storage/appState";
import { STORAGE_KEYS } from "@/storage/keys";
import { isSelfWrite, parseJson, type WriteOutcome } from "@/storage/localStore";
import { parseCabinet } from "@/storage/parsers";
import { watchStorage } from "@/storage/watch";
import { cabinetReducer, type CabinetAction } from "./cabinetReducer";

export interface CabinetStore {
  cabinet: Cabinet;
  dispatch: Dispatch<CabinetAction>;
  storageStatus: WriteOutcome;
}

export function useCabinet(): CabinetStore {
  const [cabinet, dispatch] = useReducer(cabinetReducer, null, loadCabinet);
  const [storageStatus, setStorageStatus] = useState<WriteOutcome>("ok");

  useEffect(() => {
    setStorageStatus(saveCabinet(cabinet));
  }, [cabinet]);

  useEffect(
    () =>
      watchStorage(STORAGE_KEYS.cabinet, (raw) => {
        if (isSelfWrite(STORAGE_KEYS.cabinet, raw)) return;
        const incoming = parseJson(raw, parseCabinet);
        if (incoming) dispatch({ type: "cabinet/adopt", cabinet: incoming });
      }),
    [],
  );

  return { cabinet, dispatch, storageStatus };
}
