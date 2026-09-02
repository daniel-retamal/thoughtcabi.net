import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import { createId } from "@/domain/ids";
import type { Cabinet, NodeId } from "@/domain/model";
import { cabinetDigest } from "@/domain/sync/digest";
import { backoffAfter, pollEvery, pushAfter } from "@/domain/sync/rhythm";
import {
  addDestination,
  homeOf,
  removeDestination,
  setHome,
  updateDestination,
  type DestinationPatch,
} from "@/domain/sync/topology";
import {
  EMPTY_REMOTE_STATE,
  type Cadence,
  type Destination,
  type ProviderId,
  type RemoteState,
} from "@/domain/sync/types";
import { useLatest } from "@/hooks/useLatest";
import { loadRemoteState, saveRemoteState } from "@/storage/appState";
import { readCabinetFile, type CabinetFileRead } from "@/storage/cabinetFile";
import { STORAGE_KEYS } from "@/storage/keys";
import { isSelfWrite, parseJson } from "@/storage/localStore";
import type { CabinetNames } from "@/storage/names";
import { parseRemoteState } from "@/storage/parsers";
import { watchStorage } from "@/storage/watch";
import type { BaseStore } from "@/sync/baseStore";
import {
  answerQuestion,
  settleDestination,
  type AnswerInput,
  type DestinationStatus,
  type EngineContext,
  type SyncOutcome,
  type SyncQuestion,
  type SyncStateKind,
} from "@/sync/engine";
import {
  directionFor,
  providerById,
  type ConnectResult,
  type RemoteProvider,
  type RemoteStore,
  type ReopenMode,
} from "@/sync/types";
import type { CabinetAction } from "./cabinetReducer";

const TICK = 1000;
const NEVER = Number.POSITIVE_INFINITY;

export type PillState = SyncStateKind | "off";

export interface DestinationView {
  destination: Destination;
  status: DestinationStatus;
  available: boolean;
}

export interface RemoteSync {
  destinations: readonly DestinationView[];
  pill: PillState;
  question: SyncQuestion | null;
  connect: (provider: ProviderId, fields: Record<string, string>) => Promise<ConnectResult>;
  answer: (input: AnswerInput) => void;
  dismissQuestion: () => void;
  disconnect: (id: string) => void;
  makeHome: (id: string) => void;
  setCadence: (id: string, cadence: Cadence) => void;
  syncNow: () => void;
  resume: (id: string) => void;
  restore: (id: string) => Promise<CabinetFileRead | null>;
}

export interface RemoteSyncOptions {
  cabinet: Cabinet;
  dispatch: Dispatch<CabinetAction>;
  names: CabinetNames;
  conflictsFolder: string;
  providers: readonly RemoteProvider[];
  baseStore: BaseStore;
  onArrived: (ids: readonly NodeId[]) => void;
  onParked: (ids: readonly NodeId[]) => void;
  onSavedAside: (name: string) => void;
}

interface Runtime {
  store: RemoteStore | null;
  status: DestinationStatus;
  pollAt: number;
  pushAt: number | null;
  failures: number;
  busy: boolean;
}

const WAITING: DestinationStatus = { kind: "pending", problem: null };

function freshRuntime(): Runtime {
  return { store: null, status: WAITING, pollAt: 0, pushAt: null, failures: 0, busy: false };
}

function pillStateOf(views: readonly DestinationView[]): PillState {
  if (views.length === 0) return "off";
  if (views.some((view) => view.status.kind === "working")) return "working";

  const home = views.find((view) => view.destination.direction === "two-way");
  if (home && home.status.kind !== "synced") return home.status.kind;

  return views.some((view) => view.status.kind !== "synced") ? "pending" : "synced";
}

export function useRemoteSync(options: RemoteSyncOptions): RemoteSync {
  const [state, setState] = useState<RemoteState>(loadRemoteState);
  const [statuses, setStatuses] = useState<Record<string, DestinationStatus>>({});
  const [question, setQuestion] = useState<SyncQuestion | null>(null);

  const runtimes = useRef(new Map<string, Runtime>());
  const digest = useMemo(() => cabinetDigest(options.cabinet), [options.cabinet]);
  const latest = useLatest({ ...options, state, digest });

  const runtimeFor = useCallback((id: string): Runtime => {
    const existing = runtimes.current.get(id);
    if (existing) return existing;
    const created = freshRuntime();
    runtimes.current.set(id, created);
    return created;
  }, []);

  const publish = useCallback(
    (id: string, status: DestinationStatus): void => {
      runtimeFor(id).status = status;
      setStatuses((current) => ({ ...current, [id]: status }));
    },
    [runtimeFor],
  );

  const patch = useCallback((id: string, changes: DestinationPatch): void => {
    setState((current) => updateDestination(current, id, changes));
  }, []);

  const contextFor = useCallback((): EngineContext => {
    const now = latest.current;
    return {
      cabinet: now.cabinet,
      names: now.names,
      conflictsFolder: now.conflictsFolder,
      createId,
      baseStore: now.baseStore,
      now: Date.now,
      adopt: (cabinet) => now.dispatch({ type: "cabinet/adopt", cabinet }),
      replace: (cabinet) => now.dispatch({ type: "cabinet/replace", cabinet }),
      arrived: (ids) => {
        if (ids.length > 0) now.onArrived(ids);
      },
      parked: now.onParked,
      ask: setQuestion,
    };
  }, [latest]);

  const openStore = useCallback(
    async (destination: Destination, mode: ReopenMode = "quiet"): Promise<RemoteStore | null> => {
      const runtime = runtimeFor(destination.id);
      if (runtime.store) return runtime.store;

      const provider = providerById(latest.current.providers, destination.provider);
      if (!provider) {
        publish(destination.id, { kind: "blocked", problem: "gone" });
        return null;
      }

      const opened = await provider.reopen(destination.locator, destination.secret, mode);
      if (opened.ok) {
        runtime.store = opened.store;
        return opened.store;
      }

      publish(
        destination.id,
        opened.reason === "needs-permission"
          ? { kind: "paused", problem: "permission" }
          : opened.reason === "auth"
            ? { kind: "blocked", problem: "auth" }
            : opened.reason === "gone"
              ? { kind: "blocked", problem: "gone" }
              : { kind: "pending", problem: "failed" },
      );
      return null;
    },
    [latest, publish, runtimeFor],
  );

  const apply = useCallback(
    (destination: Destination, outcome: SyncOutcome): void => {
      const runtime = runtimeFor(destination.id);
      const provider = providerById(latest.current.providers, destination.provider);
      const rhythm = provider?.defaults.rhythm;

      if (Object.keys(outcome.patch).length > 0) patch(destination.id, outcome.patch);
      if (outcome.savedAs) latest.current.onSavedAside(outcome.savedAs);

      const now = Date.now();
      runtime.pushAt = null;

      if (outcome.status.kind === "synced") {
        runtime.failures = 0;
        const every = rhythm ? pollEvery(rhythm, destination.cadence, document.hasFocus()) : null;
        runtime.pollAt = every === null ? NEVER : now + every;
      } else if (outcome.status.kind === "pending") {
        runtime.failures += 1;
        runtime.pollAt = now + backoffAfter(runtime.failures);
      } else {
        runtime.pollAt = NEVER;
      }

      publish(destination.id, outcome.status);
    },
    [latest, patch, publish, runtimeFor],
  );

  const settle = useCallback(
    async (destination: Destination, mode: ReopenMode = "quiet"): Promise<void> => {
      const runtime = runtimeFor(destination.id);
      if (runtime.busy) return;
      runtime.busy = true;
      publish(destination.id, { kind: "working", problem: null });

      try {
        const store = await openStore(destination, mode);
        if (!store) return;
        apply(destination, await settleDestination(destination, store, contextFor()));
      } finally {
        runtime.busy = false;
      }
    },
    [apply, contextFor, openStore, publish, runtimeFor],
  );

  const settleAll = useCallback((): void => {
    for (const destination of latest.current.state.destinations) void settle(destination);
  }, [latest, settle]);

  const wakeAll = useCallback(
    (includeStalled: boolean): void => {
      const now = Date.now();
      for (const destination of latest.current.state.destinations) {
        const runtime = runtimeFor(destination.id);
        if (!includeStalled && runtime.status.kind !== "pending") continue;
        runtime.failures = 0;
        runtime.pollAt = now;
      }
    },
    [latest, runtimeFor],
  );

  useEffect(() => {
    saveRemoteState(state);
  }, [state]);

  useEffect(
    () =>
      watchStorage(STORAGE_KEYS.remote, (raw) => {
        if (isSelfWrite(STORAGE_KEYS.remote, raw)) return;
        const incoming = parseJson(raw, parseRemoteState);
        if (incoming) setState(incoming);
      }),
    [],
  );

  useEffect(() => {
    const now = Date.now();
    for (const destination of latest.current.state.destinations) {
      const runtime = runtimeFor(destination.id);
      if (runtime.pushAt !== null) continue;
      const provider = providerById(latest.current.providers, destination.provider);
      const delay = provider ? pushAfter(provider.defaults.rhythm, destination.cadence) : null;
      if (delay !== null) runtime.pushAt = now + delay;
    }
  }, [digest, latest, runtimeFor]);

  useEffect(() => {
    const tick = (): void => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      for (const destination of latest.current.state.destinations) {
        const runtime = runtimeFor(destination.id);
        const due = now >= runtime.pollAt || (runtime.pushAt !== null && now >= runtime.pushAt);
        if (due) void settle(destination);
      }
    };

    const wake = (): void => {
      wakeAll(false);
      tick();
    };

    const timer = window.setInterval(tick, TICK);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);

    tick();

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [latest, runtimeFor, settle, wakeAll]);

  useEffect(() => {
    const leaving = (): void => settleAll();
    window.addEventListener("pagehide", leaving);
    return () => window.removeEventListener("pagehide", leaving);
  }, [settleAll]);

  const connect = useCallback(
    async (id: ProviderId, fields: Record<string, string>): Promise<ConnectResult> => {
      const provider = providerById(latest.current.providers, id);
      if (!provider) return { ok: false, reason: "failed" };

      const result = await provider
        .connect({ fields })
        .catch((): ConnectResult => ({ ok: false, reason: "failed" }));
      if (!result.ok) return result;

      const { connection } = result;
      const writable = (await connection.store.writable?.()) ?? true;

      const destination: Destination = {
        id: createId("d"),
        provider: id,
        locator: connection.locator,
        label: connection.label,
        direction: writable
          ? directionFor(provider.defaults, Boolean(homeOf(latest.current.state)))
          : "follow",
        cadence: provider.defaults.cadence,
        adopted: false,
        baseRevision: null,
        baseDigest: null,
        lastSyncedAt: null,
        lastProblem: null,
        strays: [],
        secret: connection.secret,
      };

      runtimeFor(destination.id).store = connection.store;
      setState((current) => addDestination(current, destination));
      void settle(destination);
      return result;
    },
    [latest, runtimeFor, settle],
  );

  const disconnect = useCallback(
    (id: string): void => {
      const destination = latest.current.state.destinations.find((entry) => entry.id === id);
      const provider = destination && providerById(latest.current.providers, destination.provider);
      if (destination && provider) {
        void provider.disconnect(destination.locator, destination.secret).catch(() => undefined);
      }

      void latest.current.baseStore.forget(id);
      runtimes.current.delete(id);
      setStatuses(({ [id]: _gone, ...rest }) => rest);
      setState((current) => removeDestination(current, id));
      setQuestion((current) => (current?.destinationId === id ? null : current));
    },
    [latest],
  );

  const answer = useCallback(
    (input: AnswerInput): void => {
      const asked = question;
      if (!asked) return;
      setQuestion(null);

      const destination = latest.current.state.destinations.find(
        (entry) => entry.id === asked.destinationId,
      );
      const store = runtimes.current.get(asked.destinationId)?.store;
      if (!destination || !store) return;

      void answerQuestion(asked, input, destination, store, contextFor()).then((outcome) =>
        apply(destination, outcome),
      );
    },
    [apply, contextFor, latest, question],
  );

  const restore = useCallback(
    async (id: string): Promise<CabinetFileRead | null> => {
      const destination = latest.current.state.destinations.find((entry) => entry.id === id);
      if (!destination) return null;

      const store = await openStore(destination, "gesture");
      if (!store) return null;

      try {
        const snapshot = await store.pull();
        return readCabinetFile(snapshot.text, latest.current.names);
      } catch {
        return null;
      }
    },
    [latest, openStore],
  );

  const resume = useCallback(
    (id: string): void => {
      const destination = latest.current.state.destinations.find((entry) => entry.id === id);
      if (!destination) return;
      runtimeFor(id).store = null;
      runtimeFor(id).failures = 0;
      void settle(destination, "gesture");
    },
    [latest, runtimeFor, settle],
  );

  const syncNow = useCallback((): void => {
    wakeAll(true);
    settleAll();
  }, [settleAll, wakeAll]);

  const destinations = useMemo(
    (): DestinationView[] =>
      state.destinations.map((destination) => ({
        destination,
        status: statuses[destination.id] ?? WAITING,
        available: providerById(options.providers, destination.provider) !== undefined,
      })),
    [options.providers, state.destinations, statuses],
  );

  return {
    destinations,
    pill: pillStateOf(destinations),
    question,
    connect,
    answer,
    dismissQuestion: () => setQuestion(null),
    disconnect,
    makeHome: (id) => setState((current) => setHome(current, id)),
    setCadence: (id, cadence) => patch(id, { cadence }),
    syncNow,
    resume,
    restore,
  };
}

export const NO_REMOTE_STATE = EMPTY_REMOTE_STATE;
