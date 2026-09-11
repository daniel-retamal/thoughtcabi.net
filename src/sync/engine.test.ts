import { describe, expect, it, vi } from "vitest";
import { cabinetDigest } from "@/domain/sync/digest";
import type { Destination } from "@/domain/sync/types";
import type { Cabinet, NodeId } from "@/domain/model";
import { collectNotes } from "@/domain/library/tree";
import { serializeCabinet } from "@/storage/cabinetFile";
import {
  EN_NAMES,
  makeDestination,
  makeNote,
  makePendingNote,
  makeShelf,
  makeTag,
} from "@/test/factories";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { FakeGithub } from "@/test/fakeGithub";
import { memoryBaseStore, type BaseStore } from "./baseStore";
import { MemoryRemote, memoryProvider } from "./memoryStore";
import { githubProvider } from "./providers/github";
import { answerQuestion, settleDestination, type EngineContext, type SyncQuestion } from "./engine";
import type { RemoteStore } from "./types";

const [RED] = TAG_PALETTE;
const NOW = 1_700_000_000_000;

function cabinetOf(titles: string[], tags = [makeTag("To read", RED)]): Cabinet {
  return {
    library: [
      makeShelf(
        "Reading",
        titles.map((title) => makeNote({ id: `n-${title}`, title })),
        "ch1",
      ),
    ],
    tags,
  };
}

interface Harness {
  context: EngineContext;
  store: RemoteStore;
  remote: MemoryRemote;
  baseStore: BaseStore;
  adopted: Cabinet[];
  replaced: Cabinet[];
  arrived: NodeId[][];
  parked: NodeId[][];
  questions: SyncQuestion[];
}

async function harness(cabinet: Cabinet, remote = new MemoryRemote()): Promise<Harness> {
  const baseStore = memoryBaseStore();
  const adopted: Cabinet[] = [];
  const replaced: Cabinet[] = [];
  const arrived: NodeId[][] = [];
  const parked: NodeId[][] = [];
  const questions: SyncQuestion[] = [];
  let ordinal = 0;

  const provider = memoryProvider(remote);
  const reopened = await provider.reopen({ name: remote.name }, null, "quiet");
  if (!reopened.ok) throw new Error("the fake provider refused to open");

  return {
    remote,
    baseStore,
    adopted,
    replaced,
    arrived,
    parked,
    questions,
    store: reopened.store,
    context: {
      cabinet,
      names: EN_NAMES,
      conflictsFolder: "Conflicts",
      createId: (prefix) => {
        ordinal += 1;
        return `${prefix}_fresh_${ordinal}`;
      },
      baseStore,
      now: () => NOW,
      adopt: (next) => adopted.push(next),
      replace: (next) => replaced.push(next),
      arrived: (ids) => arrived.push([...ids]),
      parked: (ids) => parked.push([...ids]),
      ask: (question) => questions.push(question),
    },
  };
}

function home(overrides: Partial<Destination> = {}): Destination {
  return makeDestination({ id: "d1", direction: "two-way", adopted: true, ...overrides });
}

function mirror(overrides: Partial<Destination> = {}): Destination {
  return makeDestination({ id: "d1", direction: "mirror", adopted: true, ...overrides });
}

describe("settleDestination, through the github store", () => {
  it("pulls what another device wrote rather than calling it empty", async () => {
    const before = cabinetOf(["One"]);
    const github = new FakeGithub();
    github.put("thoughtcabinet.json", serializeCabinet(before, NOW));
    const connected = await githubProvider({ fetcher: github.fetcher }).connect({
      fields: { owner: github.owner, repo: github.repo, token: github.token },
    });
    if (!connected.ok) throw new Error("the fake github refused");
    const { store } = connected.connection;
    const destination = home({
      baseRevision: (await store.head())?.revision ?? null,
      baseDigest: cabinetDigest(before),
    });
    github.put("thoughtcabinet.json", serializeCabinet(cabinetOf(["One", "Two"]), NOW));
    const harnessed = await harness(before);

    const outcome = await settleDestination(destination, store, harnessed.context);

    expect(outcome.status).toEqual({ kind: "synced", problem: null });
    expect(collectNotes(harnessed.adopted[0]?.library[0] as never).map((n) => n.title)).toEqual([
      "One",
      "Two",
    ]);
  });
});

describe("settleDestination, a home", () => {
  it("creates the file on a first connection and remembers where it landed", async () => {
    const cabinet = cabinetOf(["One"]);
    const { context, store, remote } = await harness(cabinet);

    const outcome = await settleDestination(home(), store, context);

    expect(remote.text()).toContain("One");
    expect(outcome.status.kind).toBe("synced");
    expect(outcome.patch).toMatchObject({
      baseRevision: "rev-1",
      baseDigest: cabinetDigest(cabinet),
      lastSyncedAt: NOW,
    });
  });

  it("pulls into an empty cabinet with no question in the way", async () => {
    const theirs = cabinetOf(["Theirs"]);
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(theirs, NOW));
    const harnessed = await harness(
      { library: [makeShelf("Reading", [], "ch1")], tags: [] },
      remote,
    );

    const outcome = await settleDestination(home(), harnessed.store, harnessed.context);

    expect(harnessed.questions).toHaveLength(0);
    expect(collectNotes(harnessed.adopted[0]?.library[0] as never).map((n) => n.title)).toEqual([
      "Theirs",
    ]);
    expect(outcome.status.kind).toBe("synced");
  });

  it("asks before it mixes two unrelated cabinets", async () => {
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinetOf(["Theirs"]), NOW));
    const harnessed = await harness(cabinetOf(["Mine"]), remote);

    const outcome = await settleDestination(home(), harnessed.store, harnessed.context);

    expect(harnessed.questions[0]?.kind).toBe("reconcile");
    expect(harnessed.adopted).toHaveLength(0);
    expect(outcome.status.kind).toBe("conflict");
  });

  it("pushes when only this machine moved", async () => {
    const remote = new MemoryRemote();
    const revision = remote.put(serializeCabinet(cabinetOf(["One"]), NOW));
    const cabinet = cabinetOf(["One", "Two"]);
    const { context, store } = await harness(cabinet, remote);

    const outcome = await settleDestination(
      home({ baseRevision: revision, baseDigest: cabinetDigest(cabinetOf(["One"])) }),
      store,
      context,
    );

    expect(remote.text()).toContain("Two");
    expect(outcome.patch.baseDigest).toBe(cabinetDigest(cabinet));
  });

  it("pulls when only the other machine moved, and changes no id doing it", async () => {
    const before = cabinetOf(["One"]);
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(before, NOW));
    const after = cabinetOf(["One", "Two"]);
    remote.put(serializeCabinet(after, NOW));

    const harnessed = await harness(before, remote);
    await settleDestination(
      home({ baseRevision: "rev-1", baseDigest: cabinetDigest(before) }),
      harnessed.store,
      harnessed.context,
    );

    const landed = harnessed.adopted[0];
    expect(collectNotes(landed?.library[0] as never).map((n) => n.id)).toEqual(["n-One", "n-Two"]);
    expect(harnessed.arrived[0]).toEqual(["n-Two"]);
  });

  it("merges both machines' edits silently when it has a base to work from", async () => {
    const base = cabinetOf(["Shared"]);
    const remote = new MemoryRemote();
    const revision = remote.put(serializeCabinet(base, NOW));

    const mine: Cabinet = {
      library: [
        makeShelf("Reading", [makeNote({ id: "n-Shared" }), makeNote({ id: "n-mine" })], "ch1"),
      ],
      tags: base.tags,
    };
    const harnessed = await harness(mine, remote);
    await harnessed.baseStore.write("d1", { text: serializeCabinet(base, NOW), revision });

    remote.put(
      serializeCabinet(
        {
          library: [
            makeShelf(
              "Reading",
              [makeNote({ id: "n-Shared" }), makeNote({ id: "n-theirs" })],
              "ch1",
            ),
          ],
          tags: base.tags,
        },
        NOW,
      ),
    );

    const outcome = await settleDestination(
      home({ baseRevision: revision, baseDigest: cabinetDigest(base) }),
      harnessed.store,
      harnessed.context,
    );

    expect(harnessed.questions).toHaveLength(0);
    expect(outcome.status.kind).toBe("synced");
    const ids = collectNotes(harnessed.adopted[0]?.library[0] as never)
      .map((n) => n.id)
      .sort();
    expect(ids).toEqual(["n-Shared", "n-mine", "n-theirs"]);
    expect(remote.text()).toContain("n-mine");
  });

  it("asks rather than guesses when there is no base copy to merge against", async () => {
    const remote = new MemoryRemote();
    const revision = remote.put(serializeCabinet(cabinetOf(["Shared"]), NOW));
    remote.put(serializeCabinet(cabinetOf(["Shared", "Theirs"]), NOW));

    const harnessed = await harness(cabinetOf(["Shared", "Mine"]), remote);
    const outcome = await settleDestination(
      home({ baseRevision: revision, baseDigest: "stale" }),
      harnessed.store,
      harnessed.context,
    );

    expect(harnessed.questions[0]?.kind).toBe("conflict");
    expect(outcome.status.kind).toBe("conflict");
  });

  it("recreates a file the user deleted rather than emptying the cabinet", async () => {
    const cabinet = cabinetOf(["One"]);
    const { context, store, remote } = await harness(cabinet);

    await settleDestination(home({ baseRevision: "rev-9", baseDigest: "old" }), store, context);

    expect(remote.text()).toContain("One");
  });

  it("is idle, and writes nothing, when neither side moved", async () => {
    const cabinet = cabinetOf(["One"]);
    const remote = new MemoryRemote();
    const revision = remote.put(serializeCabinet(cabinet, NOW));
    const { context, store } = await harness(cabinet, remote);

    const outcome = await settleDestination(
      home({ baseRevision: revision, baseDigest: cabinetDigest(cabinet) }),
      store,
      context,
    );

    expect(outcome.status.kind).toBe("synced");
    expect(remote.pushes).toBe(0);
  });
});

describe("settleDestination, the rules that must not break", () => {
  it("never pushes over a file a newer build wrote", async () => {
    const remote = new MemoryRemote();
    remote.put(JSON.stringify({ version: 99, cabinet: { library: [], tags: [] } }));
    const { context, store } = await harness(cabinetOf(["Mine"]), remote);

    const outcome = await settleDestination(home(), store, context);

    expect(outcome.status).toEqual({ kind: "blocked", problem: "newer" });
    expect(remote.pushes).toBe(0);
  });

  it("stops at a mirror too rather than downgrading what a newer build wrote", async () => {
    const remote = new MemoryRemote();
    const fromTheFuture = JSON.stringify({ version: 99, cabinet: { library: [], tags: [] } });
    remote.put(fromTheFuture);
    const { context, store } = await harness(cabinetOf(["Mine"]), remote);

    const outcome = await settleDestination(
      mirror({ baseRevision: "rev-0", baseDigest: "old" }),
      store,
      context,
    );

    expect(outcome.status).toEqual({ kind: "blocked", problem: "newer" });
    expect(remote.text()).toBe(fromTheFuture);
    expect(remote.pushes).toBe(0);
  });

  it("never sends a pending note", async () => {
    const cabinet: Cabinet = {
      library: [
        makeShelf(
          "Reading",
          [makeNote({ id: "n1", title: "Real" }), makePendingNote({ id: "p1" })],
          "ch1",
        ),
      ],
      tags: [],
    };
    const { context, store, remote } = await harness(cabinet);

    await settleDestination(home(), store, context);

    expect(remote.text()).toContain("Real");
    expect(remote.text()).not.toContain("p1");
  });

  it("reports a head it could not read as a failure and writes nothing", async () => {
    const remote = new MemoryRemote();
    remote.fail("head", "failed");
    const { context, store } = await harness(cabinetOf(["Mine"]), remote);

    const outcome = await settleDestination(home(), store, context);

    expect(outcome.status).toEqual({ kind: "pending", problem: "failed" });
    expect(remote.pushes).toBe(0);
  });

  it("calls a refused sign-in blocked and a lost network pending", async () => {
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinetOf(["One"]), NOW));
    const { context, store } = await harness(cabinetOf(["One", "Two"]), remote);
    const destination = home({ baseRevision: "rev-1", baseDigest: "moved" });

    remote.fail("push", "auth");
    expect((await settleDestination(destination, store, context)).status.kind).toBe("blocked");

    remote.fail("push", "offline");
    expect((await settleDestination(destination, store, context)).status.kind).toBe("pending");
  });
});

describe("settleDestination, a mirror", () => {
  it("asks once before it overwrites contents it has not adopted", async () => {
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinetOf(["Theirs"]), NOW));
    const harnessed = await harness(cabinetOf(["Mine"]), remote);

    const outcome = await settleDestination(
      mirror({ adopted: false }),
      harnessed.store,
      harnessed.context,
    );

    expect(harnessed.questions[0]?.kind).toBe("adopt");
    expect(remote.pushes).toBe(0);
    expect(outcome.status.kind).toBe("conflict");
  });

  it("never touches the local cabinet, whatever the remote does", async () => {
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinetOf(["Theirs"]), NOW));
    const harnessed = await harness(cabinetOf(["Mine"]), remote);

    for (const failure of ["auth", "conflict", "offline", "failed"] as const) {
      remote.fail("push", failure);
      await settleDestination(
        mirror({ baseRevision: "rev-1", baseDigest: "moved" }),
        harnessed.store,
        harnessed.context,
      );
    }

    remote.fail("push", null);
    await settleDestination(
      mirror({ baseRevision: "rev-1", baseDigest: "moved" }),
      harnessed.store,
      harnessed.context,
    );

    expect(harnessed.adopted).toHaveLength(0);
    expect(harnessed.replaced).toHaveLength(0);
  });

  it("writes nothing at all when the digest has not moved", async () => {
    const cabinet = cabinetOf(["One"]);
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinet, NOW));
    const { context, store } = await harness(cabinet, remote);

    await settleDestination(
      mirror({ baseRevision: "rev-1", baseDigest: cabinetDigest(cabinet) }),
      store,
      context,
    );

    expect(remote.pushes).toBe(0);
  });
});

describe("answerQuestion", () => {
  async function asked(kind: "reconcile" | "adopt"): Promise<Harness & { question: SyncQuestion }> {
    const remote = new MemoryRemote();
    remote.put(serializeCabinet(cabinetOf(["Theirs"]), NOW));
    const harnessed = await harness(cabinetOf(["Mine"]), remote);
    const destination = kind === "adopt" ? mirror({ adopted: false }) : home();
    await settleDestination(destination, harnessed.store, harnessed.context);
    const question = harnessed.questions[0];
    if (!question) throw new Error("nothing was asked");
    return { ...harnessed, question };
  }

  it("keeps both by taking the union and pushing it back", async () => {
    const { question, store, context, remote, replaced } = await asked("reconcile");

    const outcome = await answerQuestion(
      question,
      { answer: "keep-both", label: "" },
      home(),
      store,
      context,
    );

    const titles = collectNotes(replaced[0]?.library[0] as never)
      .map((note) => note.title)
      .sort();
    expect(titles).toEqual(["Mine", "Theirs"]);
    expect(remote.text()).toContain("Mine");
    expect(outcome.status.kind).toBe("synced");
  });

  it("saves the losing side beside the file before any answer acts", async () => {
    for (const answer of ["keep-both", "keep-mine", "keep-theirs"] as const) {
      const { question, store, context, remote } = await asked("reconcile");
      const outcome = await answerQuestion(question, { answer, label: "" }, home(), store, context);
      expect(outcome.savedAs).toMatch(/^thoughtcabinet-conflict-/);
      expect(remote.siblingNames()).toHaveLength(1);
    }
  });

  it("keeps theirs by replacing, not by merging", async () => {
    const { question, store, context, replaced } = await asked("reconcile");

    await answerQuestion(question, { answer: "keep-theirs", label: "" }, home(), store, context);

    expect(collectNotes(replaced[0]?.library[0] as never).map((n) => n.title)).toEqual(["Theirs"]);
  });

  it("keeps mine by pushing over the remote", async () => {
    const { question, store, context, remote, replaced, adopted } = await asked("reconcile");

    await answerQuestion(question, { answer: "keep-mine", label: "" }, home(), store, context);

    expect(remote.text()).toContain("Mine");
    expect(remote.text()).not.toContain("Theirs");
    expect([...replaced, ...adopted]).toHaveLength(0);
  });

  it("adopts a mirror by saving what was there and then overwriting it", async () => {
    const { question, store, context, remote } = await asked("adopt");

    const outcome = await answerQuestion(
      question,
      { answer: "keep-mine", label: "" },
      mirror({ adopted: false }),
      store,
      context,
    );

    expect(outcome.patch.adopted).toBe(true);
    expect(remote.text()).toContain("Mine");
    expect(remote.siblingNames()).toHaveLength(1);
  });

  it("keeps both at a mirror by writing a file named for this machine", async () => {
    const { question, store, context, remote } = await asked("adopt");

    const outcome = await answerQuestion(
      question,
      { answer: "keep-both", label: "Work laptop" },
      mirror({ adopted: false }),
      store,
      context,
    );

    expect(outcome.savedAs).toBe("thoughtcabinet-work-laptop.json");
    expect(outcome.patch.locator).toEqual({ name: "thoughtcabinet-work-laptop.json" });
    expect(remote.text()).toContain("Theirs");
  });

  it("never dispatches from a mirror's adoption", async () => {
    const { question, store, context, adopted, replaced } = await asked("adopt");
    await answerQuestion(
      question,
      { answer: "keep-mine", label: "" },
      mirror({ adopted: false }),
      store,
      context,
    );
    expect([...adopted, ...replaced]).toHaveLength(0);
  });
});

describe("the base copy", () => {
  it("is written on every settled push, so the next merge has something to work from", async () => {
    const cabinet = cabinetOf(["One"]);
    const { context, store, baseStore } = await harness(cabinet);

    const outcome = await settleDestination(home(), store, context);
    const copy = await baseStore.read("d1");

    expect(copy?.revision).toBe(outcome.patch.baseRevision);
    expect(copy?.text).toContain("One");
  });

  it("falls back to the guarded dialog when it cannot be kept", async () => {
    const remote = new MemoryRemote();
    const revision = remote.put(serializeCabinet(cabinetOf(["Shared"]), NOW));
    remote.put(serializeCabinet(cabinetOf(["Shared", "Theirs"]), NOW));

    const harnessed = await harness(cabinetOf(["Shared", "Mine"]), remote);
    vi.spyOn(harnessed.baseStore, "read").mockResolvedValue(null);

    await settleDestination(
      home({ baseRevision: revision, baseDigest: "moved" }),
      harnessed.store,
      harnessed.context,
    );

    expect(harnessed.questions[0]?.kind).toBe("conflict");
  });
});

describe("a conflicted copy another program left behind", () => {
  const STRAY = "thoughtcabinet (Daniel's conflicted copy 2026-09-01).json";

  async function pulled(
    strayText: string,
    overrides: Partial<Destination> = {},
  ): Promise<Harness & { destination: Destination }> {
    const mine = cabinetOf(["Shared"]);
    const remote = new MemoryRemote();
    const synced = remote.put(serializeCabinet(mine, NOW));
    remote.files.set(STRAY, { text: strayText, revision: "stray-1", modifiedAt: NOW });

    const harnessed = await harness(mine, remote);
    remote.put(serializeCabinet(cabinetOf(["Shared", "Theirs"]), NOW));

    const destination = home({
      baseRevision: synced,
      baseDigest: cabinetDigest(mine),
      ...overrides,
    });
    const outcome = await settleDestination(destination, harnessed.store, harnessed.context);
    const landed = harnessed.adopted.at(-1);
    if (landed) harnessed.context.cabinet = landed;

    return {
      ...harnessed,
      destination: { ...destination, ...outcome.patch },
    };
  }

  it("is offered after a pull, named by the file it was found in", async () => {
    const { questions } = await pulled(serializeCabinet(cabinetOf(["Stranded"]), NOW));

    expect(questions[0]?.kind).toBe("stray");
    expect(questions[0]?.label).toBe(STRAY);
  });

  it("is left alone when it does not read as a cabinet", async () => {
    const { questions } = await pulled("this is somebody else's file");

    expect(questions).toHaveLength(0);
  });

  it("is never offered at a mirror, which may not change the local cabinet", async () => {
    const { questions } = await pulled(serializeCabinet(cabinetOf(["Stranded"]), NOW), {
      direction: "mirror",
    });

    expect(questions.filter((question) => question.kind === "stray")).toHaveLength(0);
  });

  it("merges into the cabinet and pushes the result when it is taken", async () => {
    const harnessed = await pulled(serializeCabinet(cabinetOf(["Shared", "Stranded"]), NOW));
    const question = harnessed.questions[0];
    if (!question) throw new Error("nothing was offered");

    const outcome = await answerQuestion(
      question,
      { answer: "keep-both", label: "" },
      harnessed.destination,
      harnessed.store,
      harnessed.context,
    );

    const titles = collectNotes(harnessed.adopted.at(-1)?.library[0] as never).map((n) => n.title);
    expect(titles.sort()).toEqual(["Shared", "Stranded", "Theirs"]);
    expect(harnessed.remote.text()).toContain("Stranded");
    expect(outcome.patch.strays).toEqual([STRAY]);
  });

  it("remembers a copy that was left alone, so the offer is not made twice", async () => {
    const harnessed = await pulled(serializeCabinet(cabinetOf(["Stranded"]), NOW));
    const question = harnessed.questions[0];
    if (!question) throw new Error("nothing was offered");
    const before = harnessed.adopted.length;

    const outcome = await answerQuestion(
      question,
      { answer: "keep-mine", label: "" },
      harnessed.destination,
      harnessed.store,
      harnessed.context,
    );

    expect(outcome.patch.strays).toEqual([STRAY]);
    expect(harnessed.adopted).toHaveLength(before);
    expect(harnessed.remote.siblingNames()).toEqual([STRAY]);
  });

  it("is not offered again once it has been answered", async () => {
    const { questions } = await pulled(serializeCabinet(cabinetOf(["Stranded"]), NOW), {
      strays: [STRAY],
    });

    expect(questions).toHaveLength(0);
  });

  it("leaves a card that is already here as it is", async () => {
    const older: Cabinet = {
      library: [
        makeShelf("Reading", [makeNote({ id: "n-Shared", title: "An older title" })], "ch1"),
      ],
      tags: [makeTag("To read", RED)],
    };
    const harnessed = await pulled(serializeCabinet(older, NOW));
    const question = harnessed.questions[0];
    if (!question) throw new Error("nothing was offered");

    await answerQuestion(
      question,
      { answer: "keep-both", label: "" },
      harnessed.destination,
      harnessed.store,
      harnessed.context,
    );

    const titles = collectNotes(harnessed.adopted.at(-1)?.library[0] as never).map((n) => n.title);
    expect(titles).not.toContain("An older title");
    expect(titles).toContain("Shared");
  });

  it("never deletes the file it found", async () => {
    const harnessed = await pulled(serializeCabinet(cabinetOf(["Shared", "Stranded"]), NOW));
    const question = harnessed.questions[0];
    if (!question) throw new Error("nothing was offered");

    await answerQuestion(
      question,
      { answer: "keep-both", label: "" },
      harnessed.destination,
      harnessed.store,
      harnessed.context,
    );

    expect(harnessed.remote.files.has(STRAY)).toBe(true);
  });
});
