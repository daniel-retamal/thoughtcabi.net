import { describe, expect, it } from "vitest";
import {
  accountFrom,
  fileFrom,
  filesFrom,
  headOf,
  multipartBody,
  nameQuery,
  reasonFrom,
} from "./drive";

describe("the search Drive is given", () => {
  it("asks for a live file by that exact name", () => {
    expect(nameQuery("thoughtcabinet.json")).toBe(
      "name = 'thoughtcabinet.json' and trashed = false",
    );
  });

  it("escapes a quote rather than ending the string early", () => {
    expect(nameQuery("daniel's.json")).toBe("name = 'daniel\\'s.json' and trashed = false");
  });
});

describe("a file as Drive describes it", () => {
  const payload = {
    id: "f-1",
    name: "thoughtcabinet.json",
    headRevisionId: "r7",
    modifiedTime: "2026-09-01T12:00:00.000Z",
  };

  it("carries its revision and the moment it changed", () => {
    expect(fileFrom(payload)).toEqual({
      id: "f-1",
      name: "thoughtcabinet.json",
      revision: "r7",
      modifiedAt: Date.UTC(2026, 8, 1, 12),
    });
  });

  it("is nothing without an id and a name", () => {
    expect(fileFrom({ name: "thoughtcabinet.json" })).toBeNull();
    expect(fileFrom(null)).toBeNull();
  });

  it("leaves the time unknown rather than guessing at a date it cannot read", () => {
    expect(fileFrom({ id: "f-1", name: "c.json", modifiedTime: "soon" })?.modifiedAt).toBeNull();
  });

  it("becomes a head the engine can compare", () => {
    const file = fileFrom(payload);

    expect(file && headOf(file)).toEqual({ revision: "r7", modifiedAt: Date.UTC(2026, 8, 1, 12) });
  });
});

describe("a listing", () => {
  it("drops an entry it cannot read rather than the whole answer", () => {
    const listed = filesFrom({ files: [{ id: "f-1", name: "a.json" }, { name: "b.json" }] });

    expect(listed.map((file) => file.id)).toEqual(["f-1"]);
  });

  it("is empty when Drive sent no files at all", () => {
    expect(filesFrom({})).toEqual([]);
    expect(filesFrom(null)).toEqual([]);
  });
});

describe("what a multipart create sends", () => {
  const body = multipartBody({ name: "thoughtcabinet.json" }, '{"library":[]}', "B");

  it("puts the name in the first part and the cabinet in the second", () => {
    expect(body).toBe(
      [
        "--B",
        "Content-Type: application/json; charset=UTF-8",
        "",
        '{"name":"thoughtcabinet.json"}',
        "--B",
        "Content-Type: application/json; charset=UTF-8",
        "",
        '{"library":[]}',
        "--B--",
        "",
      ].join("\r\n"),
    );
  });
});

describe("what Drive says went wrong", () => {
  it("finds the reason a write was refused", () => {
    expect(reasonFrom({ error: { errors: [{ reason: "storageQuotaExceeded" }] } })).toBe(
      "storageQuotaExceeded",
    );
    expect(reasonFrom({ error: {} })).toBeNull();
    expect(reasonFrom(null)).toBeNull();
  });

  it("finds the account behind the grant, and settles for none", () => {
    expect(accountFrom({ user: { emailAddress: "danielr@example.com" } })).toBe(
      "danielr@example.com",
    );
    expect(accountFrom({ user: {} })).toBeNull();
  });
});
