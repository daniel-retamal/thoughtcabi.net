import type { Dispatch } from "react";
import { DND_ATTR } from "@/dnd/attributes";
import { createId } from "@/domain/ids";
import { previewFromUrl } from "@/domain/links/fromUrl";
import { imageUrlFrom } from "@/domain/links/imageUrl";
import { previewToNote } from "@/domain/links/linkPreview";
import { canonicalUrl } from "@/domain/links/url";
import { containerAt } from "@/domain/library/tree";
import type { Library, LibraryLocation, NodeId, Note } from "@/domain/model";
import { useGlobalPaste } from "@/hooks/useGlobalPaste";
import { usePointerPosition } from "@/hooks/usePointerPosition";
import type { LinkReader } from "@/links/readLink";
import type { CabinetAction } from "./cabinetReducer";

export interface PasteToSaveOptions {
  library: Library;
  location: LibraryLocation;
  readLink: LinkReader;
  dispatch: Dispatch<CabinetAction>;
  onSaved: (note: Note, folder: string, location: LibraryLocation) => void;
  onThumbnail: (noteId: NodeId, image: string) => void;
}

export function usePasteToSave({
  library,
  location,
  readLink,
  dispatch,
  onSaved,
  onThumbnail,
}: PasteToSaveOptions): void {
  const pointer = usePointerPosition();

  useGlobalPaste((text) => {
    const image = imageUrlFrom(text);
    const noteId = image ? noteUnder(pointer.current) : null;
    if (image && noteId) {
      onThumbnail(noteId, image);
      return true;
    }

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

function noteUnder(point: { x: number; y: number } | null): NodeId | null {
  if (!point) return null;
  const element = document.elementFromPoint(point.x, point.y);
  const card = element?.closest(`[${DND_ATTR.dragKind}="item"][${DND_ATTR.dragId}]`);
  return card?.getAttribute(DND_ATTR.dragId) ?? null;
}
