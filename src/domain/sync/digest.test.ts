import { describe, expect, it } from "vitest";
import { buildNote } from "@/domain/notes/buildNote";
import type { Cabinet } from "@/domain/model";
import { readCabinetFile, serializeCabinet } from "@/storage/cabinetFile";
import {
  EN_NAMES,
  makeFolder,
  makeNote,
  makePendingNote,
  makeShelf,
  makeTag,
} from "@/test/factories";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { cabinetDigest, digestOf } from "./digest";

const [RED, AMBER] = TAG_PALETTE;

function roundTrip(cabinet: Cabinet): Cabinet {
  const read = readCabinetFile(serializeCabinet(cabinet, 1_700_000_000_000), EN_NAMES);
  if (!read.ok) throw new Error(`the fixture did not survive its own file: ${read.problem}`);
  return read.cabinet;
}

describe("digestOf", () => {
  it("is a stable sixteen character hex string", () => {
    expect(digestOf("thoughtcabinet")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("moves when the text moves", () => {
    expect(digestOf("a")).not.toBe(digestOf("b"));
    expect(digestOf("ab")).not.toBe(digestOf("ba"));
  });

  it("survives characters outside Latin-1", () => {
    expect(digestOf("café 🍩")).toMatch(/^[0-9a-f]{16}$/);
    expect(digestOf("café 🍩")).not.toBe(digestOf("cafe 🍩"));
  });

  it("digests an empty string without collapsing to zero", () => {
    expect(digestOf("")).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("cabinetDigest", () => {
  it("digests a cabinet built by the app identically to the same cabinet parsed back", () => {
    const built = buildNote(
      {
        url: "https://example.com/café",
        title: "Café ☕",
        description: "An accented title and an emoji",
        tag: "To read",
        image: "https://example.com/shot.png",
        destination: { shelfId: "ch1", path: [] },
      },
      null,
      { id: "n1", addedAt: 1_700_000_000_000 },
    );

    const cabinet: Cabinet = {
      library: [makeShelf("Reading", [makeFolder("Essays", [built], "f1")], "ch1")],
      tags: [makeTag("To read", RED)],
    };

    expect(cabinetDigest(roundTrip(cabinet))).toBe(cabinetDigest(cabinet));
  });

  it("ignores a pending note, which is never in the file it is compared against", () => {
    const shelf = makeShelf("Reading", [makeNote({ id: "n1" })], "ch1");
    const clean: Cabinet = { library: [shelf], tags: [] };
    const loading: Cabinet = {
      library: [{ ...shelf, children: [...shelf.children, makePendingNote({ id: "p1" })] }],
      tags: [],
    };

    expect(cabinetDigest(loading)).toBe(cabinetDigest(clean));
  });

  it("ignores a pending note nested inside a folder", () => {
    const clean: Cabinet = {
      library: [makeShelf("Reading", [makeFolder("Essays", [], "f1")], "ch1")],
      tags: [],
    };
    const loading: Cabinet = {
      library: [
        makeShelf("Reading", [makeFolder("Essays", [makePendingNote({ id: "p1" })], "f1")], "ch1"),
      ],
      tags: [],
    };

    expect(cabinetDigest(loading)).toBe(cabinetDigest(clean));
  });

  it("notices an edit to any field that travels", () => {
    const base: Cabinet = {
      library: [makeShelf("Reading", [makeNote({ id: "n1" })], "ch1")],
      tags: [],
    };
    const edited: Cabinet = {
      library: [makeShelf("Reading", [makeNote({ id: "n1", title: "Renamed" })], "ch1")],
      tags: [],
    };

    expect(cabinetDigest(edited)).not.toBe(cabinetDigest(base));
  });

  it("notices a move between folders, a shelf rename and a tag recolour", () => {
    const note = makeNote({ id: "n1" });
    const base: Cabinet = {
      library: [makeShelf("Reading", [makeFolder("Essays", [note], "f1")], "ch1")],
      tags: [makeTag("To read", RED)],
    };

    const moved: Cabinet = {
      library: [makeShelf("Reading", [makeFolder("Essays", [], "f1"), note], "ch1")],
      tags: [makeTag("To read", RED)],
    };
    const renamed: Cabinet = {
      library: [makeShelf("Later", [makeFolder("Essays", [note], "f1")], "ch1")],
      tags: [makeTag("To read", RED)],
    };
    const recoloured: Cabinet = { ...base, tags: [makeTag("To read", AMBER)] };

    for (const other of [moved, renamed, recoloured]) {
      expect(cabinetDigest(other)).not.toBe(cabinetDigest(base));
    }
  });

  it("does not move when nothing did", () => {
    const cabinet: Cabinet = {
      library: [makeShelf("Reading", [makeNote({ id: "n1" })], "ch1")],
      tags: [makeTag("To read", RED)],
    };
    expect(cabinetDigest(cabinet)).toBe(cabinetDigest(roundTrip(cabinet)));
  });
});
