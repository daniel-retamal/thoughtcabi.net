import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadTextFile, readTextFile } from "./files";

function stubObjectUrls(): { revoked: string[] } {
  const revoked: string[] = [];
  Object.defineProperty(URL, "createObjectURL", {
    value: () => "blob:cabinet",
    configurable: true,
    writable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: (url: string) => revoked.push(url),
    configurable: true,
    writable: true,
  });
  return { revoked };
}

describe("downloadTextFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hands the browser an anchor carrying the name it was given", () => {
    stubObjectUrls();
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download);
    });

    downloadTextFile("thoughtcabinet-2026-08-08.json", "{}");

    expect(clicked).toEqual(["thoughtcabinet-2026-08-08.json"]);
  });

  it("leaves nothing of the anchor or the url behind", () => {
    const { revoked } = stubObjectUrls();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    downloadTextFile("cabinet.json", "{}");

    expect(document.querySelector("a")).toBeNull();
    expect(revoked).toEqual(["blob:cabinet"]);
  });
});

describe("readTextFile", () => {
  it("reads a file back as text", async () => {
    const file = new File(['{"version":1}'], "cabinet.json", {
      type: "application/json",
    });

    await expect(readTextFile(file)).resolves.toBe('{"version":1}');
  });
});
