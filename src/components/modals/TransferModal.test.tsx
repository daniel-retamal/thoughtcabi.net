import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeLibrary, makeNote, makeShelf, makeTag } from "@/test/factories";
import { TAG_PALETTE } from "@/domain/tags/palette";
import { serializeCabinet } from "@/storage/cabinetFile";
import { TransferModal } from "./TransferModal";

const DROP_LABEL = "Drop a cabinet file, or click to choose";

function cabinetFile(name = "cabinet.json"): File {
  const text = serializeCabinet(
    { library: [makeShelf("Recipes", [makeNote({ id: "arrived" })], "ch-file")], tags: [] },
    Date.UTC(2026, 7, 8),
  );
  return new File([text], name, { type: "application/json" });
}

function setup() {
  const onExport = vi.fn();
  const onImport = vi.fn();
  render(
    <TransferModal
      library={makeLibrary()}
      tags={[makeTag("To read", TAG_PALETTE[0]), makeTag("Reference", TAG_PALETTE[1])]}
      onExport={onExport}
      onImport={onImport}
      onCancel={vi.fn()}
    />,
  );
  return { onExport, onImport };
}

async function choose(file: File): Promise<void> {
  await userEvent.upload(screen.getByLabelText(DROP_LABEL), file);
}

function drop(file: File): void {
  fireEvent.drop(screen.getByLabelText(DROP_LABEL), { dataTransfer: { files: [file] } });
}

describe("TransferModal", () => {
  it("says what is in the cabinet before it is downloaded", () => {
    setup();

    expect(screen.getByLabelText("2 shelves")).toBeInTheDocument();
    expect(screen.getByLabelText("2 folders")).toBeInTheDocument();
    expect(screen.getByLabelText("4 cards")).toBeInTheDocument();
    expect(screen.getByLabelText("2 tags")).toBeInTheDocument();
  });

  it("asks for the download when told to", async () => {
    const { onExport } = setup();

    await userEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it("shows what a chosen file holds before anything is imported", async () => {
    const { onImport } = setup();

    await choose(cabinetFile("backup.json"));

    expect(await screen.findByText("backup.json")).toBeInTheDocument();
    expect(screen.getByLabelText("1 shelf")).toBeInTheDocument();
    expect(screen.getByLabelText("1 card")).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });

  it("says when the file was exported", async () => {
    setup();

    await choose(cabinetFile());

    expect(await screen.findByText(/^exported /)).toBeInTheDocument();
  });

  it("merges the chosen file when asked", async () => {
    const { onImport } = setup();

    await choose(cabinetFile());
    await userEvent.click(await screen.findByRole("button", { name: "Merge" }));

    const [cabinet, mode] = onImport.mock.calls[0] as [{ library: { name: string }[] }, string];
    expect(cabinet.library.map((shelf) => shelf.name)).toEqual(["Recipes"]);
    expect(mode).toBe("merge");
  });

  it("replaces with the chosen file when asked", async () => {
    const { onImport } = setup();

    await choose(cabinetFile());
    await userEvent.click(await screen.findByRole("button", { name: "Replace" }));

    expect(onImport).toHaveBeenCalledWith(expect.anything(), "replace");
  });

  it("takes a file dropped onto it", async () => {
    setup();

    drop(cabinetFile("dropped.json"));

    expect(await screen.findByText("dropped.json")).toBeInTheDocument();
  });

  it("explains a file that is not a cabinet instead of offering to import it", async () => {
    setup();

    drop(new File(['{"type":"excalidraw","elements":[]}'], "drawing.excalidraw"));

    expect(await screen.findByRole("alert")).toHaveTextContent("no shelves in it");
    expect(screen.queryByRole("button", { name: "Merge" })).not.toBeInTheDocument();
  });

  it("explains a file that is not JSON", async () => {
    setup();

    drop(new File(["nonsense"], "notes.txt", { type: "text/plain" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("not JSON");
  });

  it("goes back to the drop zone when the chosen file is cleared", async () => {
    setup();

    await choose(cabinetFile("backup.json"));
    await userEvent.click(await screen.findByLabelText("Choose another file"));

    expect(screen.getByLabelText(DROP_LABEL)).toBeInTheDocument();
    expect(screen.queryByText("backup.json")).not.toBeInTheDocument();
  });
});
