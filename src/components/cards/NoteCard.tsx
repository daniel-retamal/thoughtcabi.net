import type { Note, Tag } from "@/domain/model";
import { hasThumbnail } from "@/domain/notes/buildNote";
import { findTag } from "@/domain/tags/tagLibrary";
import { itemDragProps } from "@/dnd/dragProps";
import { relativeTime } from "@/lib/relativeTime";
import { SiteFavicon } from "@/components/primitives/SiteFavicon";
import { TagBadge } from "@/components/primitives/TagBadge";
import type { NoteHandlers } from "@/components/handlers";
import { NoteActions } from "./NodeActions";
import { Thumbnail } from "./Thumbnail";

export interface NoteCardProps extends NoteHandlers {
  note: Note;
  tags: readonly Tag[];
  fresh: boolean;
}

export function NoteCard({ note, tags, fresh, onOpen, onEdit, onDelete }: NoteCardProps) {
  const tag = findTag(tags, note.tag);
  const showThumbnail = hasThumbnail(note);
  const hasLink = Boolean(note.domain);

  const className = ["card", showThumbnail ? "" : "no-thumb", fresh ? "fresh" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} {...itemDragProps(note.id)} onClick={() => onOpen(note)}>
      <NoteActions note={note} className="card-actions" onEdit={onEdit} onDelete={onDelete} />
      {showThumbnail ? <Thumbnail note={note} /> : null}

      <div className="card-body">
        <div className="card-cat">
          {hasLink ? <span className="cat-chip">{note.catLabel}</span> : null}
          {tag ? <TagBadge tag={tag} className="card-tag" /> : null}
          <span className="card-time">{relativeTime(note.addedAt)}</span>
        </div>

        <div className="card-title">{note.title || "Untitled"}</div>
        {note.description ? <div className="card-desc">{note.description}</div> : null}

        {hasLink ? (
          <div className="card-foot">
            <SiteFavicon note={note} />
            <span className="dom">{note.domain}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
