import type { Dispatch } from "react";
import { createId } from "@/domain/ids";
import { previewFromUrl } from "@/domain/links/fromUrl";
import { previewToNote } from "@/domain/links/linkPreview";
import { canonicalUrl } from "@/domain/links/url";
import { containerAt } from "@/domain/library/tree";
import type { Library, LibraryLocation, Note } from "@/domain/model";
import { useGlobalPaste } from "@/hooks/useGlobalPaste";
import type { LinkReader } from "@/links/readLink";
import type { CabinetAction } from "./cabinetReducer";

export interface PasteToSaveOptions {
  library: Library;
  location: LibraryLocation;
  readLink: LinkReader;
  dispatch: Dispatch<CabinetAction>;
  onSaved: (note: Note, folder: string, location: LibraryLocation) => void;
}

export function usePasteToSave({
  library,
  location,
  readLink,
  dispatch,
  onSaved,
}: PasteToSaveOptions): void {
  useGlobalPaste((text) => {
    const url = canonicalUrl(text);
    if (!url) return false;

    const id = createId("l");
    const addedAt = Date.now();
    const destination = location;
    const folder = containerAt(library, destination).name;

    dispatch({ type: "note/addPending", location: destination, id, url, addedAt });

    void readLink(url)
      .catch(() => null)
      .then((preview) => {
        const note = previewToNote(preview ?? previewFromUrl(new URL(url)), { id, addedAt });
        dispatch({ type: "note/resolvePending", note });
        onSaved(note, folder, destination);
      });

    return true;
  });
}
