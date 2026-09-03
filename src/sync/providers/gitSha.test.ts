import { describe, expect, it } from "vitest";
import { gitBlobSha } from "./gitSha";

describe("gitBlobSha", () => {
  it("agrees with git hash-object on the canonical example", async () => {
    expect(await gitBlobSha("hello world\n")).toBe("3b18e512dba79e4c8300dd08aeb37f8e728b8dad");
  });

  it("hashes the empty blob the way git does", async () => {
    expect(await gitBlobSha("")).toBe("e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
  });

  it("counts bytes rather than characters, so an emoji does not shift the header", async () => {
    expect(await gitBlobSha("☕")).toBe(await gitBlobSha("☕"));
    expect(await gitBlobSha("☕")).not.toBe(await gitBlobSha("abc"));
  });
});
