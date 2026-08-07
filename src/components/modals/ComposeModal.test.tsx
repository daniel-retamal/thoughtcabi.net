import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LinkPreview } from "@/domain/links/linkPreview";
import type { NoteDraft } from "@/domain/notes/buildNote";
import { makeLibrary } from "@/test/factories";
import { ComposeModal } from "./ComposeModal";

const URL = "https://example.com/the-quiet-revolution";

const PREVIEW: LinkPreview = {
  url: URL,
  domain: "example.com",
  title: "The Quiet Revolution",
  description: "How reading changed.",
  siteName: "Example",
  image: "https://example.com/og.png",
  favicon: "https://example.com/favicon.ico",
  cat: "article",
};

function renderCompose(initial: Partial<NoteDraft> = {}, preview: LinkPreview | null = PREVIEW) {
  const library = makeLibrary();
  const handlers = { onSave: vi.fn(), onCancel: vi.fn() };
  const readLink = vi.fn(() => Promise.resolve(preview));

  render(
    <ComposeModal
      mode="new"
      library={library}
      tags={[]}
      initial={{
        url: "",
        title: "",
        description: "",
        tag: "",
        image: "",
        destination: { channelId: "channel-reading", path: [] },
        ...initial,
      }}
      initialPreview={null}
      readLink={readLink}
      {...handlers}
    />,
  );

  return { handlers, readLink };
}

function urlField(): HTMLElement {
  return document.querySelector(".f-url-wrap input") as HTMLElement;
}

function titleField(): HTMLInputElement {
  return screen.getByPlaceholderText("What is this?");
}

function descriptionField(): HTMLTextAreaElement {
  return document.querySelector(".f-area") as HTMLTextAreaElement;
}

describe("ComposeModal", () => {
  it("fills empty fields once the link has been read", async () => {
    renderCompose();
    await userEvent.type(urlField(), URL);

    await waitFor(() => {
      expect(titleField().value).toBe("The Quiet Revolution");
    });
    expect(descriptionField().value).toBe("How reading changed.");
  });

  it("never overwrites what the user already typed", async () => {
    renderCompose({ title: "My own title", description: "My own note" });
    await userEvent.type(urlField(), URL);

    await waitFor(() => {
      expect(document.querySelector(".f-url-wrap .spinning")).toBeNull();
    });
    expect(titleField().value).toBe("My own title");
    expect(descriptionField().value).toBe("My own note");
  });

  it("hands the preview to the save handler alongside the draft", async () => {
    const { handlers } = renderCompose();
    await userEvent.type(urlField(), URL);
    await waitFor(() => {
      expect(titleField().value).toBe("The Quiet Revolution");
    });

    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(handlers.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ url: URL, title: "The Quiet Revolution" }),
      PREVIEW,
    );
  });

  it("leaves the form alone when the link could not be read", async () => {
    renderCompose({}, null);
    await userEvent.type(urlField(), URL);

    await waitFor(() => {
      expect(document.querySelector(".f-url-wrap .spinning")).toBeNull();
    });
    expect(titleField().value).toBe("");
    expect(descriptionField().value).toBe("");
  });

  it("does not read anything until there is a url worth reading", async () => {
    const { readLink } = renderCompose();
    await userEvent.type(titleField(), "Just a thought");
    expect(readLink).not.toHaveBeenCalled();
  });
});
