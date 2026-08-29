import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Appearance } from "@/domain/model";
import { DisplayPopover } from "./DisplayPopover";

function renderPopover(appearance: Appearance) {
  const onChange = vi.fn();
  render(
    <DisplayPopover
      appearance={appearance}
      anchorRef={createRef<HTMLElement>()}
      onChange={onChange}
      onClose={vi.fn()}
    />,
  );
  return { onChange };
}

const BLUE = { color: "ultramarine", cards: "cream" } as const;

describe("DisplayPopover", () => {
  it("groups the twelve depths into a blue row, a green row and a mono row", () => {
    renderPopover(BLUE);

    const blue = within(screen.getByRole("group", { name: "Blue" }));
    expect(blue.getByRole("button", { name: "Ultramarine" })).toBeInTheDocument();
    expect(blue.getByRole("button", { name: "Cobalt" })).toBeInTheDocument();
    expect(blue.getByRole("button", { name: "Navy" })).toBeInTheDocument();
    expect(blue.getByRole("button", { name: "Midnight" })).toBeInTheDocument();

    const green = within(screen.getByRole("group", { name: "Green" }));
    expect(green.getByRole("button", { name: "Emerald" })).toBeInTheDocument();
    expect(green.getByRole("button", { name: "Viridian" })).toBeInTheDocument();
    expect(green.getByRole("button", { name: "Forest" })).toBeInTheDocument();
    expect(green.getByRole("button", { name: "Pine" })).toBeInTheDocument();

    const mono = within(screen.getByRole("group", { name: "Mono" }));
    expect(mono.getByRole("button", { name: "Paper" })).toBeInTheDocument();
    expect(mono.getByRole("button", { name: "Linen" })).toBeInTheDocument();
    expect(mono.getByRole("button", { name: "Graphite" })).toBeInTheDocument();
    expect(mono.getByRole("button", { name: "Onyx" })).toBeInTheDocument();
  });

  it("ticks a light swatch in ink, so the mark is not white on white", () => {
    renderPopover({ color: "paper", cards: "cream" });

    const swatch = screen.getByRole("button", { name: "Paper" });
    expect(swatch.querySelector(".tick")).toHaveStyle({ color: "#1C1B19" });

    const deep = screen.getByRole("button", { name: "Midnight" });
    expect(deep.querySelector(".tick")).toHaveStyle({ color: "#EFEADC" });
  });

  it("shows the card a surface would actually give you, not the field", () => {
    renderPopover({ color: "paper", cards: "cream" });

    const chips = document.querySelectorAll(".surface-chip");
    expect(chips[0]).toHaveStyle({ background: "#FFFFFF" });
    expect(chips[1]).toHaveStyle({ background: "#1C1B19" });
  });

  it("names the chosen color and marks only its swatch", () => {
    renderPopover({ color: "viridian", cards: "cream" });

    expect(screen.getByText("Viridian")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Viridian" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Emerald" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows the color alone in a swatch, with no cream in it", () => {
    renderPopover(BLUE);

    const swatch = screen.getByRole("button", { name: "Emerald" });
    expect(swatch).toHaveStyle({ background: "#00603A" });
    expect(swatch.querySelector(":scope > :not(.tick)")).toBeNull();
  });

  it("picks a color", async () => {
    const { onChange } = renderPopover(BLUE);

    await userEvent.click(screen.getByRole("button", { name: "Forest" }));
    expect(onChange).toHaveBeenCalledWith({ color: "forest" });
  });

  it("labels the second card surface with the family that is active", () => {
    renderPopover(BLUE);
    expect(screen.getByRole("button", { name: /blue/i })).toBeInTheDocument();
  });

  it("labels that surface Green once a green is chosen", async () => {
    const { onChange } = renderPopover({ color: "pine", cards: "cream" });

    const surface = screen.getByRole("button", { name: /green/i });
    expect(screen.queryByRole("button", { name: /^blue$/i })).toBeNull();

    await userEvent.click(surface);
    expect(onChange).toHaveBeenCalledWith({ cards: "color" });
  });
});
