import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { emptyStateFor, type EmptyStateContext, type EmptyStateCopy } from "./emptyStates";

const BROWSING: EmptyStateContext = {
  mode: "browsing",
  query: "",
  activeTag: null,
  channelName: "Field notes",
  inFolder: false,
  cabinetEmpty: false,
  onboarded: true,
};

function resolve(overrides: Partial<EmptyStateContext> = {}): EmptyStateCopy {
  return emptyStateFor({ ...BROWSING, ...overrides });
}

function bodyText(copy: EmptyStateCopy): string {
  const { container } = render(<>{copy.text}</>);
  return container.textContent ?? "";
}

describe("emptyStateFor", () => {
  it("teaches the gesture on a cabinet that has never held anything", () => {
    const copy = resolve({ cabinetEmpty: true, onboarded: false });

    expect(copy.kind).toBe("plate");
    expect(copy.title).toBe("Your cabinet is empty.");
    if (copy.kind !== "plate") throw new Error("expected the plate");
    expect(copy.primer?.map((fact) => fact.term)).toEqual(["Channels", "Folders", "Tags"]);
    expect(copy.primer?.[0]?.text).toContain("Field notes");
  });

  it("drops the lesson once the cabinet has been used and emptied", () => {
    const copy = resolve({ cabinetEmpty: true, onboarded: true });

    expect(copy.title).toBe("Nothing saved.");
    if (copy.kind !== "plate") throw new Error("expected the plate");
    expect(copy.primer).toBeNull();
    expect(copy.text).toContain("Field notes");
  });

  it("names the channel when the cabinet holds saves elsewhere", () => {
    const copy = resolve();

    expect(copy.kind).toBe("quiet");
    expect(copy.title).toBe("Nothing in Field notes yet.");
    expect(bodyText(copy)).toBe("Paste a link with CtrlV, or drag saves in from another channel.");
  });

  it("says where you are standing inside a folder", () => {
    expect(resolve({ inFolder: true }).title).toBe("This folder is empty.");
  });

  it("quotes the query, and offers to drop it", () => {
    const copy = resolve({ mode: "searching", query: "rust" });

    expect(copy.title).toBe("No matches for “rust”.");
    if (copy.kind !== "quiet") throw new Error("expected the quiet block");
    expect(copy.clearable).toBe(true);
  });

  it("names the tag that carries nothing", () => {
    const copy = resolve({ mode: "tagged", activeTag: "Reference" });

    expect(copy.title).toBe("Nothing tagged Reference.");
    if (copy.kind !== "quiet") throw new Error("expected the quiet block");
    expect(copy.clearable).toBe(false);
  });

  it("answers a search before it answers an empty cabinet", () => {
    const copy = resolve({ mode: "searching", query: "rust", cabinetEmpty: true });
    expect(copy.kind).toBe("quiet");
  });

  it("renders the keystroke as keys rather than as prose", () => {
    render(<>{resolve().text}</>);
    expect(screen.getByText("Ctrl").tagName).toBe("KBD");
  });
});
