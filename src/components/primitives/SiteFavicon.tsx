import type { Note } from "@/domain/model";
import { leadingInitial } from "@/lib/text";

export function SiteFavicon({ note }: { note: Note }) {
  return (
    <span className="fav" style={{ background: note.cover?.color }}>
      {leadingInitial(note.siteName || note.domain)}
    </span>
  );
}
