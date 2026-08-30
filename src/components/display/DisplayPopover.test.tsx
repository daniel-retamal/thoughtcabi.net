import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Appearance, Locale } from "@/domain/model";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import { I18nProvider } from "@/i18n/I18nProvider";
import { dictionaryFor } from "@/i18n/locales";
import { DisplayPopover } from "./DisplayPopover";

function renderPopover(appearance: Appearance, language: Locale = "en") {
  const onChange = vi.fn();
  const onLanguageChange = vi.fn();
  render(
    <I18nProvider copy={dictionaryFor(language)}>
      <DisplayPopover
        appearance={appearance}
        language={language}
        anchorRef={createRef<HTMLElement>()}
        onChange={onChange}
        onLanguageChange={onLanguageChange}
        onClose={vi.fn()}
      />
    </I18nProvider>,
  );
  return { onChange, onLanguageChange };
}

const BLUE = { color: "ultramarine", cards: "cream" } as const;

describe("DisplayPopover", () => {
  it("groups the twelve depths into a blue row, a green row and a mono row", () => {
    renderPopover(BLUE);

    const blue = within(screen.getByRole("group", { name: en.colors.blue }));
    expect(blue.getByRole("button", { name: en.colors.ultramarine })).toBeInTheDocument();
    expect(blue.getByRole("button", { name: en.colors.cobalt })).toBeInTheDocument();
    expect(blue.getByRole("button", { name: en.colors.navy })).toBeInTheDocument();
    expect(blue.getByRole("button", { name: en.colors.midnight })).toBeInTheDocument();

    const green = within(screen.getByRole("group", { name: en.colors.green }));
    expect(green.getByRole("button", { name: en.colors.emerald })).toBeInTheDocument();
    expect(green.getByRole("button", { name: en.colors.viridian })).toBeInTheDocument();
    expect(green.getByRole("button", { name: en.colors.forest })).toBeInTheDocument();
    expect(green.getByRole("button", { name: en.colors.pine })).toBeInTheDocument();

    const mono = within(screen.getByRole("group", { name: en.colors.mono }));
    expect(mono.getByRole("button", { name: en.colors.paper })).toBeInTheDocument();
    expect(mono.getByRole("button", { name: en.colors.linen })).toBeInTheDocument();
    expect(mono.getByRole("button", { name: en.colors.graphite })).toBeInTheDocument();
    expect(mono.getByRole("button", { name: en.colors.onyx })).toBeInTheDocument();
  });

  it("ticks a light swatch in ink, so the mark is not white on white", () => {
    renderPopover({ color: "paper", cards: "cream" });

    const swatch = screen.getByRole("button", { name: en.colors.paper });
    expect(swatch.querySelector(".tick")).toHaveStyle({ color: "#1C1B19" });

    const deep = screen.getByRole("button", { name: en.colors.midnight });
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

    expect(screen.getByText(en.colors.viridian)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.colors.viridian })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: en.colors.emerald })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows the color alone in a swatch, with no cream in it", () => {
    renderPopover(BLUE);

    const swatch = screen.getByRole("button", { name: en.colors.emerald });
    expect(swatch).toHaveStyle({ background: "#00603A" });
    expect(swatch.querySelector(":scope > :not(.tick)")).toBeNull();
  });

  it("picks a color", async () => {
    const { onChange } = renderPopover(BLUE);

    await userEvent.click(screen.getByRole("button", { name: en.colors.forest }));
    expect(onChange).toHaveBeenCalledWith({ color: "forest" });
  });

  it("labels the second card surface with the family that is active", () => {
    renderPopover(BLUE);
    expect(screen.getByRole("button", { name: new RegExp(en.colors.blue, "i") })).toBeEnabled();
  });

  it("labels that surface Green once a green is chosen", async () => {
    const { onChange } = renderPopover({ color: "pine", cards: "cream" });

    const surface = screen.getByRole("button", { name: new RegExp(en.colors.green, "i") });
    expect(screen.queryByRole("button", { name: /^blue$/i })).toBeNull();

    await userEvent.click(surface);
    expect(onChange).toHaveBeenCalledWith({ cards: "color" });
  });

  it("offers the two languages by their own names, never by a flag", () => {
    renderPopover(BLUE);

    const english = screen.getByRole("button", { name: "English" });
    const spanish = screen.getByRole("button", { name: "Español" });
    expect(english).toHaveAttribute("aria-pressed", "true");
    expect(spanish).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelector(".popover")?.textContent).not.toMatch(
      /\p{Extended_Pictographic}/u,
    );
  });

  it("picks a language", async () => {
    const { onLanguageChange } = renderPopover(BLUE);

    await userEvent.click(screen.getByRole("button", { name: "Español" }));
    expect(onLanguageChange).toHaveBeenCalledWith("es");
  });

  it("names the colors in Spanish once Spanish is chosen", () => {
    renderPopover({ color: "midnight", cards: "cream" }, "es");

    expect(screen.getByRole("group", { name: es.colors.blue })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.colors.midnight })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(es.display.cardsNote)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Español" })).toHaveAttribute("aria-pressed", "true");
  });
});
