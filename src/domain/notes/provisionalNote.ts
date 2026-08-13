import { previewFromUrl } from "@/domain/links/fromUrl";
import { emptyPreview, previewToNote } from "@/domain/links/linkPreview";
import { canonicalUrl } from "@/domain/links/url";
import type { Note, PendingNote } from "@/domain/model";

export function provisionalNote(pending: PendingNote): Note {
  const canonical = canonicalUrl(pending.url);
  const preview = canonical ? previewFromUrl(new URL(canonical)) : emptyPreview(pending.url, "");

  return previewToNote(
    { ...preview, title: preview.title || preview.domain, description: "" },
    { id: pending.id, addedAt: pending.addedAt },
  );
}
