import { describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { makeNote } from "@/test/factories";
import { youtubeThumbnail } from "@/domain/links/sites/youtube";
import type { Note } from "@/domain/model";
import { Thumbnail, type ThumbnailSurface } from "./Thumbnail";

const MAXRES = youtubeThumbnail("dQw4w9WgXcQ");
const HQ = "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg";

interface RenderOptions {
  surface?: ThumbnailSurface;
  sizes?: string;
}

function renderThumbnail(note: Note, { surface = "preview", sizes = "264px" }: RenderOptions = {}) {
  const { container } = render(
    <Thumbnail
      note={note}
      sizes={sizes}
      surface={surface}
      fallback={<span className="gave-up" />}
    />,
  );
  return { container, img: container.querySelector("img") as HTMLImageElement };
}

function loadAt(img: HTMLImageElement, naturalWidth: number, naturalHeight: number): void {
  Object.defineProperty(img, "naturalWidth", { value: naturalWidth, configurable: true });
  Object.defineProperty(img, "naturalHeight", { value: naturalHeight, configurable: true });
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

  it("fills the frame with a picture whose shape it does not know yet", () => {
    const { img } = renderThumbnail(makeNote({ image: "https://example.com/unmeasured.png" }));

    expect(img.closest(".cover")).toHaveClass("img-cover");
    expect(img.closest(".cover")).not.toHaveClass("fitted");
    expect(img).toHaveClass("img-fill");
    expect(img.style.maxWidth).toBe("");
  });

  it("gives the card's frame the shape of a picture wider than it", () => {
    const { img } = renderThumbnail(makeNote({ image: "https://example.com/repo-card.png" }));

    loadAt(img, 1280, 640);
    const frame = img.closest(".cover") as HTMLElement;

    expect(frame).toHaveClass("fitted");
    expect(frame.style.getPropertyValue("--frame-ratio")).toBe("2");
  });

  it("leaves the frame its own shape when the picture is not wider than it", () => {
    const { img } = renderThumbnail(makeNote({ image: "https://example.com/wide-enough.png" }));

    loadAt(img, 1600, 1000);
    const frame = img.closest(".cover") as HTMLElement;

    expect(frame).not.toHaveClass("fitted");
    expect(frame.style.getPropertyValue("--frame-ratio")).toBe("");
  });

  it("keeps filling the frame with a picture squarer than the rule allows", () => {
    const { img } = renderThumbnail(makeNote({ image: "https://example.com/screenshot.png" }));

    loadAt(img, 800, 600);

    expect(img.closest(".cover")).not.toHaveClass("fitted");
  });

  it("frames a picture it has already measured before the next render paints", () => {
    const note = makeNote({ siteImage: "https://example.com/still.jpg" });
    loadAt(renderThumbnail(note).img, 1280, 720);
    cleanup();

    const { img } = renderThumbnail(note);

    expect(img.closest(".cover")).toHaveClass("fitted");
    expect(img).not.toHaveClass("unsettled");
  });

  it("never fits a mark, whatever shape the picture turns out to be", () => {
    const { img } = renderThumbnail(makeNote({ image: "https://example.com/wide.png" }), {
      surface: "mark",
      sizes: "72px",
    });

    loadAt(img, 1280, 640);

    expect(img.closest(".cover")).not.toHaveClass("fitted");
    expect(img.closest(".cover")).not.toHaveClass("preview");
  });

  it("has no frame at all when the picture is the content", () => {
    const { container, img } = renderThumbnail(
      makeNote({ image: "https://example.com/tall.png" }),
      {
        surface: "natural",
        sizes: "min(612px, 88vw)",
      },
    );

    expect(container.querySelector(".cover")).toBeNull();
    expect(img.closest(".shot")).not.toBeNull();
    expect(img).toHaveClass("shot-img");
  });

  it("never defers a frameless picture, which would have no size to intersect with", () => {
    const framed = renderThumbnail(makeNote({ image: "https://example.com/a.png" }));
    expect(framed.img).toHaveAttribute("loading", "lazy");
    cleanup();

    const loose = renderThumbnail(makeNote({ image: "https://example.com/b.png" }), {
      surface: "natural",
      sizes: "612px",
    });
    expect(loose.img).not.toHaveAttribute("loading");
  });

  it("declares the width of the frame it is really going into", () => {
    const { img } = renderThumbnail(makeNote({ siteImage: MAXRES }));

    expect(img).toHaveAttribute("sizes", "264px");
  });

  it("asks for no variant when the source has none to offer", () => {
    const { img } = renderThumbnail(makeNote({ image: "https://example.com/og.png" }));

    expect(img).not.toHaveAttribute("srcset");
    expect(img).not.toHaveAttribute("sizes");
  });
});
