import type { Note, Tag } from "@/domain/model";
import { findTag } from "@/domain/tags/tagLibrary";
import { itemDragProps } from "@/dnd/dragProps";
import { relativeTime } from "@/lib/relativeTime";
import { Monogram } from "@/components/primitives/Monogram";
import { SiteMark } from "@/components/primitives/SiteMark";
import { TagBadge } from "@/components/primitives/TagBadge";
import { NoteActions } from "@/components/cards/NodeActions";
import { Thumbnail } from "@/components/cards/Thumbnail";
import type { NoteHandlers } from "@/components/handlers";

const SLOT_WIDTH = "72px";

export interface NoteRowProps extends NoteHandlers {
  note: Note;
  tags: readonly Tag[];
  fresh: boolean;
}

export function NoteRow({ note, tags, fresh, onOpen, onEdit, onDelete }: NoteRowProps) {
  const tag = findTag(tags, note.tag);
  const hasLink = Boolean(note.domain);
  const hasTitle = note.title.trim().length > 0;

  return (
    <div
      className={fresh ? "row-item fresh" : "row-item"}
      {...itemDragProps(note.id)}
      onClick={() => onOpen(note)}
    >
      <div className="row-slot">
        <Thumbnail
          note={note}
          sizes={SLOT_WIDTH}
          fallback={
            <SiteMark
              note={note}
              scale="row"
              fallback={<Monogram note={note} className="row-mark" />}
            />
          }
        />
      </div>

      <div className="row-main">
        <div className={hasTitle ? "row-title" : "row-title muted"}>{note.title || "Untitled"}</div>
        {note.description ? <div className="row-desc">{note.description}</div> : null}
      </div>

      <div className="row-tag-slot">{tag ? <TagBadge tag={tag} className="row-tag" /> : null}</div>

      <div className="row-dom">
        {hasLink ? note.domain : <span className="none">— no link —</span>}
      </div>

      <div className="row-time">{relativeTime(note.addedAt)}</div>

      <NoteActions note={note} className="row-actions" onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
