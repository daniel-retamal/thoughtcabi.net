import type { Note } from "@/domain/model";
import { leadingInitial } from "@/lib/text";

export interface MonogramProps {
  note: Note;
  className: string;
}

export function Monogram({ note, className }: MonogramProps) {
  return (
    <span className={`${className} mark-letter`}>
      {leadingInitial(note.domain || note.siteName || note.title)}
    </span>
  );
}
