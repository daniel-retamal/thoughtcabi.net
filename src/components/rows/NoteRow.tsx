import type { Note, Tag } from "@/domain/model";
import { hasThumbnail } from "@/domain/notes/buildNote";
import { findTag } from "@/domain/tags/tagLibrary";
import { itemDragProps } from "@/dnd/dragProps";
import { relativeTime } from "@/lib/relativeTime";
import { Icon } from "@/components/primitives/Icon";
import { SiteFavicon } from "@/components/primitives/SiteFavicon";
import { TagBadge } from "@/components/primitives/TagBadge";
import { NoteActions } from "@/components/cards/NodeActions";
import { Thumbnail } from "@/components/cards/Thumbnail";
import type { NoteHandlers } from "@/components/handlers";

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
      {hasThumbnail(note) ? (
        <div className="row-cover">
          <Thumbnail note={note} />
        </div>
      ) : (
        <span className="row-glyph">
          <Icon name="file-text" />
        </span>
      )}

      <div className="row-main">
        <div className={hasTitle ? "row-title" : "row-title muted"}>{note.title || "Untitled"}</div>
        {note.description ? <div className="row-desc">{note.description}</div> : null}
      </div>

      <div className="row-cat">
        {hasLink ? <span className="cat-chip">{note.catLabel}</span> : null}
        {tag ? <TagBadge tag={tag} className="row-tag" /> : null}
      </div>

      <div className="row-dom">
        {hasLink ? (
          <>
            <SiteFavicon note={note} />
            {note.domain}
          </>
        ) : (
          <span className="none">— no link —</span>
        )}
      </div>

      <div className="row-time">{relativeTime(note.addedAt)}</div>

      <NoteActions note={note} className="row-actions" onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
