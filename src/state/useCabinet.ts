import { useEffect, useReducer, useState, type Dispatch } from "react";
import type { Cabinet } from "@/domain/model";
import { loadCabinet, saveCabinet } from "@/storage/appState";
import { STORAGE_KEYS } from "@/storage/keys";
import { isSelfWrite, parseJson, type WriteOutcome } from "@/storage/localStore";
import type { CabinetNames } from "@/storage/names";
import { parseCabinet } from "@/storage/parsers";
import { watchStorage } from "@/storage/watch";
import { useLatest } from "@/hooks/useLatest";
import { cabinetReducer, type CabinetAction } from "./cabinetReducer";

export interface CabinetStore {
  cabinet: Cabinet;
  dispatch: Dispatch<CabinetAction>;
  storageStatus: WriteOutcome;
}

export function useCabinet(names: CabinetNames): CabinetStore {
  const [cabinet, dispatch] = useReducer(cabinetReducer, names, loadCabinet);
  const [storageStatus, setStorageStatus] = useState<WriteOutcome>("ok");
  const namesRef = useLatest(names);

  useEffect(() => {
    setStorageStatus(saveCabinet(cabinet));
  }, [cabinet]);

  useEffect(
    () =>
      watchStorage(STORAGE_KEYS.cabinet, (raw) => {
        if (isSelfWrite(STORAGE_KEYS.cabinet, raw)) return;
        const incoming = parseJson(raw, (value) => parseCabinet(value, namesRef.current));
        if (incoming) dispatch({ type: "cabinet/adopt", cabinet: incoming });
      }),
    [namesRef],
  );

  return { cabinet, dispatch, storageStatus };
}
