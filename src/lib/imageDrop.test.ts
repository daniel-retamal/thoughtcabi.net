import { describe, expect, it } from "vitest";
import { hasImagePayload, readDroppedImage } from "./imageDrop";

interface TransferParts {
  data?: Record<string, string>;
  files?: File[];
}

function transfer({ data = {}, files = [] }: TransferParts): DataTransfer {
  return {
    files,
    items: files.map((file) => ({ type: file.type })),
    types: Object.keys(data),
    getData: (type: string) => data[type] ?? "",
  } as unknown as DataTransfer;
}

const pixel = new File(["x"], "shot.png", { type: "image/png" });

describe("reading an image out of a drop", () => {
  it("keeps the page's own URL when the drag also carries the file behind it", async () => {
    const dropped = await readDroppedImage(
      transfer({
        data: { "text/uri-list": "https://pbs.twimg.com/media/HPyrL0VbsAAQHvv.jpg" },
        files: [pixel],
      }),
    );

    expect(dropped).toBe("https://pbs.twimg.com/media/HPyrL0VbsAAQHvv.jpg");
  });

  it("digs the source out of the dragged markup when no URL was listed", async () => {
    const dropped = await readDroppedImage(
      transfer({ data: { "text/html": '<img alt="" src="https://example.com/og.png">' } }),
    );

    expect(dropped).toBe("https://example.com/og.png");
  });

  it("takes nothing from a drag that carries no picture at all", async () => {
    expect(await readDroppedImage(transfer({ data: { text: "just some words" } }))).toBeNull();
  });
});

describe("recognising an image payload", () => {
  it("accepts a bare image URL, a file, and refuses plain text", () => {
    expect(hasImagePayload(transfer({ data: { text: "https://example.com/og.png" } }))).toBe(true);
    expect(hasImagePayload(transfer({ files: [pixel] }))).toBe(true);
    expect(hasImagePayload(transfer({ data: { text: "https://example.com/article" } }))).toBe(
      false,
    );
  });
});
