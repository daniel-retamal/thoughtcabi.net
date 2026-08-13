import type { Note, Tag } from "@/domain/model";
import { hasCover } from "@/domain/notes/buildNote";
import { findTag } from "@/domain/tags/tagLibrary";
import { itemDragProps } from "@/dnd/dragProps";
import { useFittedLines } from "@/hooks/useFittedLines";
import { cssVars } from "@/lib/cssVars";
import { relativeTime } from "@/lib/relativeTime";
import { SiteMark } from "@/components/primitives/SiteMark";
import { TagBadge } from "@/components/primitives/TagBadge";
import type { NoteHandlers } from "@/components/handlers";
import { NoteActions } from "./NodeActions";
import { PendingFrame } from "./PendingFrame";
import { Thumbnail } from "./Thumbnail";

const COVER_WIDTH = "264px";
const DESC_LINE_HEIGHT = 23;
const RESERVED_DESC_LINES = 2;

export interface NoteCardProps extends NoteHandlers {
  note: Note;
  tags: readonly Tag[];
  fresh: boolean;
  pending?: boolean;
}

export function NoteCard({
  note,
  tags,
  fresh,
  pending = false,
  onOpen,
  onEdit,
  onDelete,
}: NoteCardProps) {
  const tag = findTag(tags, note.tag);
  const hasLink = Boolean(note.domain);
  const { containerRef, fillerRef, lines } = useFittedLines(DESC_LINE_HEIGHT, RESERVED_DESC_LINES);

  const className = [
    "card",
    hasCover(note) || pending ? "" : "no-cover",
    fresh ? "fresh" : "",
    pending ? "pending" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      {...(pending ? {} : itemDragProps(note.id))}
      onClick={pending ? undefined : () => onOpen(note)}
    >
      {pending ? null : (
        <NoteActions note={note} className="card-actions" onEdit={onEdit} onDelete={onDelete} />
      )}

      {pending ? (
        <PendingFrame />
      ) : (
        <Thumbnail
          note={note}
          sizes={COVER_WIDTH}
          fallback={<SiteMark note={note} scale="cover" frame="cover icon-cover" />}
        />
      )}

      <div
        className="card-body"
        ref={containerRef}
        style={cssVars({ "--desc-lines": String(lines) })}
      >
        <div className="card-cat">
          {hasLink ? <span className="cat-chip">{note.catLabel}</span> : null}
          {tag ? <TagBadge tag={tag} className="card-tag" /> : null}
          <span className="card-time">{relativeTime(note.addedAt)}</span>
        </div>

        <div className={pending ? "card-title provisional" : "card-title"}>
          {note.title || "Untitled"}
        </div>
        {note.description ? (
          <div className="card-desc" ref={fillerRef}>
            {note.description}
          </div>
        ) : null}

        {hasLink ? (
          <div className="card-foot">
            <span className="dom">{note.domain}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
