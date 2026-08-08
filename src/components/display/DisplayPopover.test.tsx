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
  it("groups the eight depths into a blue row and a green row", () => {
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
