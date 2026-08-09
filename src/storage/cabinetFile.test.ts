import { describe, expect, it } from "vitest";
import { makeChannel, makeLibrary, makeNote, makeTag } from "@/test/factories";
import type { Cabinet, PendingNote } from "@/domain/model";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { CABINET_FILE_VERSION, cabinetFileName, readCabinetFile, serializeCabinet } from "./cabinetFile";

const EXPORTED_AT = Date.UTC(2026, 7, 8, 14, 30);

function cabinet(): Cabinet {
  return { library: makeLibrary(), tags: [makeTag("To read", TAG_PALETTE[0])] };
}

function envelope(overrides: Record<string, unknown>): string {
  return JSON.stringify({
    version: CABINET_FILE_VERSION,
    cabinet: { library: makeLibrary(), tags: [] },
    ...overrides,
  });
}

describe("serializeCabinet", () => {
  it("round trips a cabinet through the file and back", () => {
    const original = cabinet();
    const read = readCabinetFile(serializeCabinet(original, EXPORTED_AT));

    expect(read).toMatchObject({ ok: true, cabinet: original, exportedAt: EXPORTED_AT });
  });

  it("stamps the file with what wrote it", () => {
    const written = JSON.parse(serializeCabinet(cabinet(), EXPORTED_AT)) as Record<string, unknown>;

    expect(written).toMatchObject({
      version: 1,
      exportedAt: EXPORTED_AT,
    });
  });

  it("leaves out a link that had not finished loading", () => {
    const pending: PendingNote = { id: "p", type: "note", url: "https://a.com", loading: true };
    const written = serializeCabinet(
      { library: [makeChannel("Inbox", [makeNote({ id: "real" }), pending])], tags: [] },
      EXPORTED_AT,
    );

    expect(written).toContain("real");
    expect(written).not.toContain('"loading"');
  });

  it("carries no preferences, because those belong to the browser", () => {
    const written = JSON.parse(serializeCabinet(cabinet(), EXPORTED_AT)) as Record<string, unknown>;

    expect(Object.keys(written)).toEqual(["version", "exportedAt", "cabinet"]);
    expect(Object.keys(written.cabinet as object)).toEqual(["library", "tags"]);
  });
});

describe("cabinetFileName", () => {
  it("names the file after the day it was written", () => {
    expect(cabinetFileName(EXPORTED_AT)).toBe("thoughtcabinet-2026-08-08.json");
  });
});

describe("readCabinetFile", () => {
  it("accepts the bare cabinet shape that localStorage holds", () => {
    const raw = JSON.stringify({ library: makeLibrary(), tags: [] });

    expect(readCabinetFile(raw)).toMatchObject({ ok: true });
  });

  it("reports a file that is not JSON at all", () => {
    expect(readCabinetFile("not json")).toEqual({ ok: false, problem: "unreadable" });
  });

  it("reports JSON that is not an object", () => {
    expect(readCabinetFile("[1, 2, 3]")).toEqual({ ok: false, problem: "unreadable" });
  });

  it("refuses a file from a version it does not understand", () => {
    expect(readCabinetFile(envelope({ version: CABINET_FILE_VERSION + 1 }))).toEqual({
      ok: false,
      problem: "newer",
    });
  });

  it("reports a file with no channels in it", () => {
    expect(readCabinetFile(envelope({ cabinet: { library: [], tags: [] } }))).toEqual({
      ok: false,
      problem: "empty",
    });
  });

  it("has no export date to show when the file carries none", () => {
    expect(readCabinetFile(envelope({}))).toMatchObject({ ok: true, exportedAt: null });
  });

  it("validates what it reads rather than trusting it", () => {
    const raw = envelope({
      cabinet: {
        library: [{ id: "ch1", name: "Kept", children: [{ id: "n1", type: "note", tag: 7 }] }],
        tags: [{ name: "Half" }],
      },
    });

    const read = readCabinetFile(raw);
    expect(read.ok && read.cabinet.library[0]?.children[0]).toMatchObject({ id: "n1", tag: "" });
    expect(read.ok && read.cabinet.tags).toEqual([]);
  });
});
