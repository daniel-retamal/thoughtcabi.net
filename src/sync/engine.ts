import { isCabinetEmpty } from "@/domain/library/tree";
import type { Cabinet, NodeId } from "@/domain/model";
import { arrivals, arrivedIds } from "@/domain/sync/arrivals";
import { conflictFileName, labelledFileName, REMOTE_FILE_NAME } from "@/domain/sync/conflictName";
import { conflictedCopies } from "@/domain/sync/conflictedCopy";
import { cabinetDigest } from "@/domain/sync/digest";
import { mergeThree } from "@/domain/sync/mergeThree";
import { planFollow, planMirror, planSync } from "@/domain/sync/planSync";
import { writeMessage } from "@/domain/sync/writeMessage";
import type { DestinationPatch } from "@/domain/sync/topology";
import type {
  Destination,
  LocalSyncState,
  RemoteHead,
  RemoteLocator,
  SyncProblem,
} from "@/domain/sync/types";
import { summarizeCabinet } from "@/domain/transfer/cabinetSummary";
import { mergeCabinets } from "@/domain/transfer/mergeCabinets";
import { withFreshIds, type IdFactory } from "@/domain/transfer/reidentify";
import { readCabinetFile, serializeCabinet, type CabinetFileRead } from "@/storage/cabinetFile";
import type { CabinetNames } from "@/storage/names";
import type { BaseStore } from "./baseStore";
import { problemOf, type PushFailure, type RemoteSnapshot, type RemoteStore } from "./types";

export type SyncStateKind = "synced" | "working" | "pending" | "paused" | "conflict" | "blocked";

export interface DestinationStatus {
  kind: SyncStateKind;
  problem: SyncProblem | null;
}

export type QuestionKind = "reconcile" | "adopt" | "conflict" | "stray";

export interface SyncQuestion {
  kind: QuestionKind;
  destinationId: string;
  label: string;
  remote: Cabinet;
  snapshot: RemoteSnapshot;
}

export type SyncAnswer = "keep-both" | "keep-mine" | "keep-theirs";

export interface AnswerInput {
  answer: SyncAnswer;
  label: string;
}

export interface SyncOutcome {
  status: DestinationStatus;
  patch: DestinationPatch;
  savedAs: string | null;
}

export interface EngineContext {
  cabinet: Cabinet;
  names: CabinetNames;
  conflictsFolder: string;
  createId: IdFactory;
  baseStore: BaseStore;
  now: () => number;
  adopt: (cabinet: Cabinet) => void;
  replace: (cabinet: Cabinet) => void;
  arrived: (ids: readonly NodeId[]) => void;
  parked: (ids: readonly NodeId[]) => void;
  ask: (question: SyncQuestion) => void;
}

const PROBLEM_FOR_PUSH: Record<PushFailure, SyncProblem> = {
  conflict: "failed",
  auth: "auth",
  permission: "permission",
  offline: "offline",
  denied: "denied",
  quota: "tooLarge",
  readonly: "readonly",
  "too-large": "tooLarge",
  failed: "failed",
};

const BLOCKING_PROBLEMS: ReadonlySet<SyncProblem> = new Set<SyncProblem>([
  "newer",
  "unreadable",
  "empty",
  "auth",
  "denied",
  "permission",
  "readonly",
]);

function idle(): SyncOutcome {
  return { status: { kind: "synced", problem: null }, patch: {}, savedAs: null };
}

function stalled(problem: SyncProblem): SyncOutcome {
  const kind = BLOCKING_PROBLEMS.has(problem) ? "blocked" : "pending";
  return { status: { kind, problem }, patch: { lastProblem: problem }, savedAs: null };
}

function asked(): SyncOutcome {
  return { status: { kind: "conflict", problem: null }, patch: {}, savedAs: null };
}

function settledAt(revision: string, digest: string, at: number, extra: DestinationPatch = {}) {
  return {
    status: { kind: "synced", problem: null } as DestinationStatus,
    patch: {
      baseRevision: revision,
      baseDigest: digest,
      lastSyncedAt: at,
      lastProblem: null,
      adopted: true,
      ...extra,
    },
    savedAs: null,
  };
}

function localStateOf(destination: Destination, context: EngineContext): LocalSyncState {
  return {
    baseRevision: destination.baseRevision,
    baseDigest: destination.baseDigest,
    digest: cabinetDigest(context.cabinet),
    empty: isCabinetEmpty(context.cabinet.library),
  };
}

function textOf(cabinet: Cabinet, context: EngineContext): string {
  return serializeCabinet(cabinet, context.now());
}

type RemoteRead = { snapshot: RemoteSnapshot; read: CabinetFileRead } | { problem: SyncProblem };

function unread(value: RemoteRead): value is { problem: SyncProblem } {
  return "problem" in value;
}

async function readRemote(store: RemoteStore, context: EngineContext): Promise<RemoteRead> {
  try {
    const snapshot = await store.pull();
    return { snapshot, read: readCabinetFile(snapshot.text, context.names) };
  } catch (error) {
    return { problem: problemOf(error) };
  }
}

function movedTo(destination: Destination, found: RemoteLocator | undefined): DestinationPatch {
  return found ? { locator: { ...destination.locator, ...found } } : {};
}

async function writeTo(
  destination: Destination,
  store: RemoteStore,
  context: EngineContext,
  cabinet: Cabinet,
  expected: string | null,
): Promise<SyncOutcome> {
  const digest = cabinetDigest(cabinet);
  const message = writeMessage(summarizeCabinet(cabinet.library, cabinet.tags));
  const outcome = await store.push(textOf(cabinet, context), expected, message);
  if (!outcome.ok) return stalled(PROBLEM_FOR_PUSH[outcome.reason]);

  await context.baseStore.write(destination.id, {
    text: textOf(cabinet, context),
    revision: outcome.revision,
  });

  return settledAt(outcome.revision, digest, context.now(), movedTo(destination, outcome.locator));
}

async function siblingOut(
  store: RemoteStore,
  context: EngineContext,
  name: string,
  text: string,
): Promise<string | null> {
  try {
    return await store.sibling(conflictFileName(name, context.now()), text);
  } catch {
    return null;
  }
}

function fileNameOf(destination: Destination): string {
  return destination.locator.name ?? REMOTE_FILE_NAME;
}

async function offerStray(
  destination: Destination,
  store: RemoteStore,
  context: EngineContext,
): Promise<void> {
  if (destination.direction !== "two-way" || !store.siblings || !store.pullFrom) return;

  const names = await store.siblings().catch(() => []);
  const found = conflictedCopies([...names], fileNameOf(destination)).filter(
    (name) => !destination.strays.includes(name),
  );

  for (const name of found) {
    const snapshot = await store.pullFrom(name).catch(() => null);
    if (!snapshot) continue;

    const read = readCabinetFile(snapshot.text, context.names);
    if (!read.ok) continue;

    context.ask({
      kind: "stray",
      destinationId: destination.id,
      label: name,
      remote: read.cabinet,
      snapshot,
    });
    return;
  }
}

async function pullInto(
  destination: Destination,
  store: RemoteStore,
  context: EngineContext,
): Promise<SyncOutcome> {
  const remote = await readRemote(store, context);
  if (unread(remote)) return stalled(remote.problem);
  if (!remote.read.ok) return stalled(remote.read.problem);

  const incoming = remote.read.cabinet;
  context.arrived(arrivedIds(arrivals(context.cabinet, incoming)));
  context.adopt(incoming);

  await context.baseStore.write(destination.id, remote.snapshot);
  await offerStray(destination, store, context);
  return settledAt(remote.snapshot.revision, cabinetDigest(incoming), context.now());
}

async function reconcileWith(
  destination: Destination,
  store: RemoteStore,
  context: EngineContext,
  kind: QuestionKind,
): Promise<SyncOutcome> {
  const remote = await readRemote(store, context);
  if (unread(remote)) return stalled(remote.problem);
  if (!remote.read.ok) return stalled(remote.read.problem);

  context.ask({
    kind,
    destinationId: destination.id,
    label: destination.label,
    remote: remote.read.cabinet,
    snapshot: remote.snapshot,
  });

  return asked();
}

async function mergeWith(
  destination: Destination,
  store: RemoteStore,
  context: EngineContext,
): Promise<SyncOutcome> {
  const remote = await readRemote(store, context);
  if (unread(remote)) return stalled(remote.problem);
  if (!remote.read.ok) return stalled(remote.read.problem);

  const copy = await context.baseStore.read(destination.id);
  if (!copy || copy.revision !== destination.baseRevision) {
    return reconcileWith(destination, store, context, "conflict");
  }

  const base = readCabinetFile(copy.text, context.names);
  if (!base.ok) return reconcileWith(destination, store, context, "conflict");

  const merged = mergeThree(base.cabinet, context.cabinet, remote.read.cabinet, {
    createId: context.createId,
    conflictsFolder: context.conflictsFolder,
  });

  context.arrived(arrivedIds(merged.report));
  context.adopt(merged.cabinet);
  if (merged.report.parked.length > 0) context.parked(merged.report.parked);

  const written = await writeTo(
    destination,
    store,
    context,
    merged.cabinet,
    remote.snapshot.revision,
  );
  await offerStray(destination, store, context);
  return written;
}

async function mirrorWrite(
  destination: Destination,
  store: RemoteStore,
  context: EngineContext,
  head: string | null,
): Promise<SyncOutcome> {
  if (head !== null && head !== destination.baseRevision) {
    const remote = await readRemote(store, context);
    if (!unread(remote) && !remote.read.ok && remote.read.problem === "newer")
      return stalled("newer");
  }
  return writeTo(destination, store, context, context.cabinet, head);
}

export async function settleDestination(
  destination: Destination,
  store: RemoteStore,
  context: EngineContext,
): Promise<SyncOutcome> {
  let head: RemoteHead | null;
  try {
    head = await store.head();
  } catch (error) {
    return stalled(problemOf(error));
  }

  const local = localStateOf(destination, context);

  if (destination.direction === "mirror") {
    switch (planMirror(local, head, destination.adopted)) {
      case "create":
        return writeTo(destination, store, context, context.cabinet, null);
      case "reconcile":
        return reconcileWith(destination, store, context, "adopt");
      case "push":
        return mirrorWrite(destination, store, context, head?.revision ?? null);
      default:
        return idle();
    }
  }

  const plan = destination.direction === "follow" ? planFollow(local, head) : planSync(local, head);

  switch (plan) {
    case "create":
      return writeTo(destination, store, context, context.cabinet, null);
    case "push":
      return writeTo(destination, store, context, context.cabinet, destination.baseRevision);
    case "pull":
      return pullInto(destination, store, context);
    case "reconcile":
      return reconcileWith(destination, store, context, "reconcile");
    case "diverged":
      return mergeWith(destination, store, context);
    default:
      return idle();
  }
}

async function adoptAnswer(
  destination: Destination,
  store: RemoteStore,
  context: EngineContext,
  question: SyncQuestion,
  input: AnswerInput,
): Promise<SyncOutcome> {
  if (input.answer === "keep-both") {
    const name = labelledFileName(fileNameOf(destination), input.label);
    const written = await store.sibling(name, textOf(context.cabinet, context));
    if (!written) return stalled("failed");
    return {
      ...settledAt(question.snapshot.revision, cabinetDigest(context.cabinet), context.now(), {
        adopted: true,
        locator: { ...destination.locator, name: written },
      }),
      savedAs: written,
    };
  }

  const savedAs = await siblingOut(store, context, fileNameOf(destination), question.snapshot.text);
  const written = await writeTo(
    destination,
    store,
    context,
    context.cabinet,
    question.snapshot.revision,
  );
  return { ...written, patch: { ...written.patch, adopted: true }, savedAs };
}

const NO_ANCESTOR: Cabinet = { library: [], tags: [] };

function mergedWithStray(context: EngineContext, stray: Cabinet): Cabinet {
  return mergeThree(NO_ANCESTOR, stray, context.cabinet, {
    createId: context.createId,
    conflictsFolder: context.conflictsFolder,
  }).cabinet;
}

async function strayAnswer(
  destination: Destination,
  store: RemoteStore,
  context: EngineContext,
  question: SyncQuestion,
  input: AnswerInput,
): Promise<SyncOutcome> {
  const remembered: DestinationPatch = { strays: [...destination.strays, question.label] };
  if (input.answer !== "keep-both") {
    return { status: { kind: "synced", problem: null }, patch: remembered, savedAs: null };
  }

  const merged = mergedWithStray(context, question.remote);
  context.arrived(arrivedIds(arrivals(context.cabinet, merged)));
  context.adopt(merged);

  const head = await store.head().catch(() => undefined);
  if (head === undefined) {
    const failed = stalled("failed");
    return { ...failed, patch: { ...failed.patch, ...remembered } };
  }

  const written = await writeTo(destination, store, context, merged, head?.revision ?? null);
  return { ...written, patch: { ...written.patch, ...remembered } };
}

export async function answerQuestion(
  question: SyncQuestion,
  input: AnswerInput,
  destination: Destination,
  store: RemoteStore,
  context: EngineContext,
): Promise<SyncOutcome> {
  const name = fileNameOf(destination);

  if (question.kind === "stray") {
    return strayAnswer(destination, store, context, question, input);
  }

  if (question.kind === "adopt") {
    return adoptAnswer(destination, store, context, question, input);
  }

  if (input.answer === "keep-theirs") {
    const savedAs = await siblingOut(store, context, name, textOf(context.cabinet, context));
    context.arrived(arrivedIds(arrivals(context.cabinet, question.remote)));
    context.replace(question.remote);
    await context.baseStore.write(destination.id, question.snapshot);
    return {
      ...settledAt(question.snapshot.revision, cabinetDigest(question.remote), context.now()),
      savedAs,
    };
  }

  const savedAs = await siblingOut(store, context, name, question.snapshot.text);

  if (input.answer === "keep-mine") {
    const written = await writeTo(
      destination,
      store,
      context,
      context.cabinet,
      question.snapshot.revision,
    );
    return { ...written, savedAs };
  }

  const union = mergeCabinets(context.cabinet, withFreshIds(question.remote, context.createId));
  context.arrived(arrivedIds(arrivals(context.cabinet, union)));
  context.replace(union);
  const written = await writeTo(destination, store, context, union, question.snapshot.revision);
  return { ...written, savedAs };
}
