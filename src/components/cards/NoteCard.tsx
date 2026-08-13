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
import { Thumbnail } from "./Thumbnail";

const COVER_WIDTH = "264px";
const DESC_LINE_HEIGHT = 23;
const RESERVED_DESC_LINES = 2;

export interface NoteCardProps extends NoteHandlers {
  note: Note;
  tags: readonly Tag[];
  fresh: boolean;
}

export function NoteCard({ note, tags, fresh, onOpen, onEdit, onDelete }: NoteCardProps) {
  const tag = findTag(tags, note.tag);
  const hasLink = Boolean(note.domain);
  const { containerRef, fillerRef, lines } = useFittedLines(DESC_LINE_HEIGHT, RESERVED_DESC_LINES);

  const className = ["card", hasCover(note) ? "" : "no-cover", fresh ? "fresh" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} {...itemDragProps(note.id)} onClick={() => onOpen(note)}>
      <NoteActions note={note} className="card-actions" onEdit={onEdit} onDelete={onDelete} />
      <Thumbnail
        note={note}
        sizes={COVER_WIDTH}
        fallback={<SiteMark note={note} scale="cover" frame="cover icon-cover" />}
      />

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

        <div className="card-title">{note.title || "Untitled"}</div>
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
