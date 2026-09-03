import { describe, expect, it } from "vitest";
import {
  directoryOf,
  fileNameOf,
  normalizeRepoPath,
  pathBeside,
  repoLabel,
  repoTargetFrom,
} from "./github";

describe("repoTargetFrom", () => {
  it("takes the two fields the sheet asks for", () => {
    expect(repoTargetFrom({ owner: "danielr", repo: "cabinet" })).toEqual({
      owner: "danielr",
      repo: "cabinet",
      path: "thoughtcabinet.json",
    });
  });

  it("takes a pasted repository page, which is what a hand reaches for", () => {
    expect(repoTargetFrom({ owner: "https://github.com/danielr/cabinet", repo: "" })).toMatchObject(
      {
        owner: "danielr",
        repo: "cabinet",
      },
    );
  });

  it("takes an owner/repo pair typed into one field", () => {
    expect(repoTargetFrom({ owner: "danielr/cabinet", repo: "" })).toMatchObject({
      owner: "danielr",
      repo: "cabinet",
    });
  });

  it("takes an ssh remote, dot git and all", () => {
    expect(repoTargetFrom({ owner: "git@github.com:danielr/cabinet.git", repo: "" })).toMatchObject(
      {
        owner: "danielr",
        repo: "cabinet",
      },
    );
  });

  it("refuses what is not a repository", () => {
    expect(repoTargetFrom({ owner: "", repo: "" })).toBeNull();
    expect(repoTargetFrom({ owner: "danielr", repo: "" })).toBeNull();
    expect(repoTargetFrom({ owner: "danielr", repo: "cabinet/deep/er" })).toBeNull();
    expect(repoTargetFrom({ owner: "-danielr", repo: "cabinet" })).toBeNull();
    expect(repoTargetFrom({ owner: "daniel r", repo: "cabinet" })).toBeNull();
  });

  it("labels a destination the way GitHub does", () => {
    expect(repoLabel({ owner: "danielr", repo: "cabinet", path: "x.json" })).toBe(
      "danielr/cabinet",
    );
  });
});

describe("normalizeRepoPath", () => {
  it("defaults to the cabinet's own name", () => {
    expect(normalizeRepoPath("")).toBe("thoughtcabinet.json");
    expect(normalizeRepoPath("   ")).toBe("thoughtcabinet.json");
  });

  it("treats a folder as a folder to put the cabinet in", () => {
    expect(normalizeRepoPath("backups")).toBe("backups/thoughtcabinet.json");
    expect(normalizeRepoPath("/backups/")).toBe("backups/thoughtcabinet.json");
  });

  it("keeps a name the user chose", () => {
    expect(normalizeRepoPath("backups/mine.json")).toBe("backups/mine.json");
  });

  it("refuses to climb out of the repository", () => {
    expect(normalizeRepoPath("../../etc/passwd.json")).toBe("thoughtcabinet.json");
  });
});

describe("paths beside the cabinet", () => {
  it("finds the directory a file sits in", () => {
    expect(directoryOf("backups/mine.json")).toBe("backups");
    expect(directoryOf("mine.json")).toBe("");
  });

  it("finds the file name", () => {
    expect(fileNameOf("backups/mine.json")).toBe("mine.json");
    expect(fileNameOf("mine.json")).toBe("mine.json");
  });

  it("puts a sibling in the same directory", () => {
    expect(pathBeside("backups/mine.json", "copy.json")).toBe("backups/copy.json");
    expect(pathBeside("mine.json", "copy.json")).toBe("copy.json");
  });
});
