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
  pending?: boolean;
}

export function NoteRow({
  note,
  tags,
  fresh,
  pending = false,
  onOpen,
  onEdit,
  onDelete,
}: NoteRowProps) {
  const tag = findTag(tags, note.tag);
  const hasLink = Boolean(note.domain);
  const named = note.title.trim().length > 0 && !pending;

  return (
    <div
      className={["row-item", fresh ? "fresh" : "", pending ? "pending" : ""]
        .filter(Boolean)
        .join(" ")}
      {...(pending ? {} : itemDragProps(note.id))}
      onClick={pending ? undefined : () => onOpen(note)}
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
        <div className={named ? "row-title" : "row-title muted"}>{note.title || "Untitled"}</div>
        {note.description ? <div className="row-desc">{note.description}</div> : null}
      </div>

      <div className="row-tag-slot">{tag ? <TagBadge tag={tag} className="row-tag" /> : null}</div>

      <div className="row-dom">
        {hasLink ? note.domain : <span className="none">— no link —</span>}
      </div>

      <div className="row-time">{relativeTime(note.addedAt)}</div>

      {pending ? null : (
        <NoteActions note={note} className="row-actions" onEdit={onEdit} onDelete={onDelete} />
      )}
    </div>
  );
}
