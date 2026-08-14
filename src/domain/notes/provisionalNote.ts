import { previewFromUrl } from "@/domain/links/fromUrl";
import { emptyPreview, previewToNote } from "@/domain/links/linkPreview";
import { canonicalUrl, wordsFromPath } from "@/domain/links/url";
import type { Note, PendingNote } from "@/domain/model";

const UNKNOWN_CATEGORY = "—";

export function provisionalNote(pending: PendingNote): Note {
  const canonical = canonicalUrl(pending.url);
  const url = canonical ? new URL(canonical) : null;
  const preview = url ? previewFromUrl(url) : emptyPreview(pending.url, "");

  const note = previewToNote(
    {
      ...preview,
      title: (url ? wordsFromPath(url.pathname) : "") || preview.domain,
      description: "",
    },
    { id: pending.id, addedAt: pending.addedAt },
  );

  return { ...note, catLabel: UNKNOWN_CATEGORY };
}
