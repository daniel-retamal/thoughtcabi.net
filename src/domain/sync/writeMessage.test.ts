import { describe, expect, it } from "vitest";
import { writeMessage } from "./writeMessage";

describe("writeMessage", () => {
  it("says what the cabinet holds, so the log reads as its growth", () => {
    expect(writeMessage({ shelves: 4, folders: 13, notes: 41, tags: 2 })).toBe(
      "Cabinet: 4 shelves, 13 folders, 41 cards",
    );
  });

  it("counts one of a thing properly", () => {
    expect(writeMessage({ shelves: 1, folders: 1, notes: 1, tags: 0 })).toBe(
      "Cabinet: 1 shelf, 1 folder, 1 card",
    );
  });
});
