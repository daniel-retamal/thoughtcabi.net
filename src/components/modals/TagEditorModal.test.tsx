import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTag } from "@/test/factories";
import { MAX_TAGS, TAG_PALETTE } from "@/domain/tags/palette";
import { TagEditorModal } from "./TagEditorModal";

const RED = TAG_PALETTE[0];
const AMBER = TAG_PALETTE[1];

function renderEditor(props: Partial<Parameters<typeof TagEditorModal>[0]> = {}) {
  const handlers = { onConfirm: vi.fn(), onDelete: vi.fn(), onCancel: vi.fn() };
  const { container } = render(
    <TagEditorModal
      mode="new"
      initialName=""
      initialColor={RED}
      tags={[]}
      {...handlers}
      {...props}
    />,
  );
  return { handlers, container };
}

describe("TagEditorModal", () => {
  it("cannot create a tag without a name", async () => {
    const { handlers } = renderEditor();
    expect(screen.getByRole("button", { name: /create/i })).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("e.g. To read"), "Later");
    await userEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(handlers.onConfirm).toHaveBeenCalledWith("Later", RED);
  });

  it("submits on Enter", async () => {
    const { handlers } = renderEditor();
    await userEvent.type(screen.getByPlaceholderText("e.g. To read"), "Later{Enter}");
    expect(handlers.onConfirm).toHaveBeenCalledWith("Later", RED);
  });

  it("marks colours already spoken for and refuses to pick them", async () => {
    const { container } = renderEditor({ tags: [makeTag("Reference", AMBER)], initialColor: RED });
    const used = container.querySelectorAll(".pchip.used");
    expect(used).toHaveLength(1);

    await userEvent.click(used[0]!);
    expect(container.querySelector(".pchip.used.on")).toBeNull();
  });

  it("keeps the edited tag's own colour selectable", () => {
    const { container } = renderEditor({
      mode: "edit",
      initialName: "Reference",
      initialColor: AMBER,
      tags: [makeTag("Reference", AMBER)],
    });
    expect(container.querySelectorAll(".pchip.used")).toHaveLength(0);
  });

  it("explains and blocks a full palette", () => {
    const tags = TAG_PALETTE.map((color, index) => makeTag(`t${index}`, color));
    renderEditor({ tags });
    expect(
      screen.getByText(`All ${MAX_TAGS} colours are in use — delete a tag to add another.`),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. To read")).toBeDisabled();
    expect(screen.getByRole("button", { name: /create/i })).toBeDisabled();
  });

  it("offers delete only while editing", () => {
    renderEditor();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();

    renderEditor({ mode: "edit", initialName: "Reference", initialColor: AMBER });
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("closes on Escape and on Cancel", async () => {
    const { handlers } = renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);

    await userEvent.keyboard("{Escape}");
    expect(handlers.onCancel).toHaveBeenCalledTimes(2);
  });
});
