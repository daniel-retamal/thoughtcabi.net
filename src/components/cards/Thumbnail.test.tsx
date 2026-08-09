import { describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { makeNote } from "@/test/factories";
import { youtubeThumbnail } from "@/domain/links/sites/youtube";
import type { Note } from "@/domain/model";
import { Thumbnail } from "./Thumbnail";

const MAXRES = youtubeThumbnail("dQw4w9WgXcQ");
const HQ = "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg";

function renderThumbnail(note: Note, sizes = "300px", capResolution = false) {
  const { container } = render(
    <Thumbnail
      note={note}
      sizes={sizes}
      capResolution={capResolution}
      fallback={<span className="gave-up" />}
    />,
  );
  return { container, img: container.querySelector("img") as HTMLImageElement };
}

function loadWithNaturalSize(img: HTMLImageElement, width: number, height: number): void {
  Object.defineProperty(img, "naturalWidth", { value: width, configurable: true });
  Object.defineProperty(img, "naturalHeight", { value: height, configurable: true });
  fireEvent.load(img);
}

describe("Thumbnail", () => {
  it("fades the picture in only once, on the render that had to wait for it", () => {
    const note = makeNote({ siteImage: "https://example.com/og.png" });
    const first = renderThumbnail(note);
    expect(first.img).toHaveClass("unsettled");

    fireEvent.load(first.img);
    expect(first.container.querySelector("img")).not.toHaveClass("unsettled");

    cleanup();
    expect(renderThumbnail(note).img).not.toHaveClass("unsettled");
  });

  it("gives up to the fallback when the picture will not load", () => {
    const { container, img } = renderThumbnail(makeNote({ image: "https://example.com/gone.png" }));

    fireEvent.error(img);

    expect(container.querySelector(".gave-up")).not.toBeNull();
  });

  it("remembers a picture it has already seen fail", () => {
    const note = makeNote({ image: "https://example.com/gone.png" });
    fireEvent.error(renderThumbnail(note).img);
    cleanup();

    const { container } = renderThumbnail(note);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".gave-up")).not.toBeNull();
  });

  it("steps a missing YouTube maxres down to the size that always exists", () => {
    const { container, img } = renderThumbnail(makeNote({ siteImage: MAXRES }));
    expect(img).toHaveAttribute("src", MAXRES);

    fireEvent.error(img);

    expect(container.querySelector("img")).toHaveAttribute("src", HQ);
  });

  it("starts at that smaller size on every later render rather than stepping again", () => {
    const note = makeNote({ siteImage: MAXRES });
    fireEvent.error(renderThumbnail(note).img);
    cleanup();

    expect(renderThumbnail(note).img).toHaveAttribute("src", HQ);
  });

  it("prefers the user's own picture over the one the page published", () => {
    const note = makeNote({ image: "https://example.com/mine.png", siteImage: MAXRES });
    expect(renderThumbnail(note).img).toHaveAttribute("src", "https://example.com/mine.png");
  });

  it("caps a picture smaller than its slot instead of blowing it up, when asked to", () => {
    const note = makeNote({ image: "https://example.com/small.png" });
    const { img } = renderThumbnail(note, "640px", true);

    loadWithNaturalSize(img, 400, 400);

    expect(img.closest(".cover")).toHaveClass("img-capped");
    expect(img.style.maxWidth).toBe("400px");
    expect(img.style.maxHeight).toBe("400px");
  });

  it("leaves a picture that already fills its slot alone", () => {
    const note = makeNote({ image: "https://example.com/big.png" });
    const { img } = renderThumbnail(note, "640px", true);

    loadWithNaturalSize(img, 1280, 720);

    expect(img.closest(".cover")).not.toHaveClass("img-capped");
    expect(img.style.maxWidth).toBe("");
  });

  it("never caps when the caller has not opted in", () => {
    const note = makeNote({ image: "https://example.com/small.png" });
    const { img } = renderThumbnail(note, "640px", false);

    loadWithNaturalSize(img, 400, 400);

    expect(img.closest(".cover")).not.toHaveClass("img-capped");
  });
});
