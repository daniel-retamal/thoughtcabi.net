import type { Note, Tag } from "@/domain/model";
import { hasThumbnail } from "@/domain/notes/buildNote";
import { findTag } from "@/domain/tags/tagLibrary";
import { relativeTime } from "@/lib/relativeTime";
import { useCopyLink } from "@/hooks/useCopyLink";
import { Icon } from "@/components/primitives/Icon";
import { Button } from "@/components/primitives/Button";
import { TagBadge } from "@/components/primitives/TagBadge";
import { Thumbnail } from "@/components/cards/Thumbnail";
import { Modal } from "./Modal";

const SHOT_WIDTH = "min(612px, 88vw)";

export interface NoteDetailModalProps {
  note: Note;
  tags: readonly Tag[];
  location: string;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onClose: () => void;
}

export function NoteDetailModal({
  note,
  tags,
  location,
  onEdit,
  onDelete,
  onClose,
}: NoteDetailModalProps) {
  const { copied, copy } = useCopyLink();
  const tag = findTag(tags, note.tag);

  return (
    <Modal onClose={onClose}>
      <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
        <Icon name="x" />
      </button>

      <div className="modal-scroll">
        {hasThumbnail(note) ? <Thumbnail note={note} sizes={SHOT_WIDTH} surface="natural" /> : null}

        <div className="modal-body">
          <div className="m-cat">
            {note.url ? <span className="cat-chip">{note.catLabel}</span> : null}
            {tag ? <TagBadge tag={tag} className="row-tag" /> : null}
            <span className="card-time">Saved {relativeTime(note.addedAt)}</span>
          </div>

          <h2>{note.title || "Untitled"}</h2>
          {note.description ? <p className="m-desc">{note.description}</p> : null}

          <div className="modal-meta">
            {note.url ? (
              <>
                <div className="mm">
                  <span className="k">Source</span>
                  <span className="v">{note.siteName || note.domain}</span>
                </div>
                <div className="mm">
                  <span className="k">URL</span>
                  <span className="v">{note.url}</span>
                </div>
              </>
            ) : null}
            <div className="mm">
              <span className="k">In folder</span>
              <span className="v v-serif">{location}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <div className="modal-actions">
          {note.url ? (
            <>
              <a className="primary" href={note.url} target="_blank" rel="noreferrer">
                <Icon name="external-link" /> Open original
              </a>
              <Button
                variant="ghost"
                icon={copied ? "check" : "copy"}
                onClick={() => copy(note.url)}
              >
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button
                variant="ghost"
                className="icon-only"
                icon="pencil-line"
                title="Edit"
                onClick={() => onEdit(note)}
              />
              <Button
                variant="danger"
                className="icon-only"
                icon="trash-2"
                title="Delete"
                onClick={() => onDelete(note)}
              />
            </>
          ) : (
            <>
              <Button variant="primary" icon="pencil-line" onClick={() => onEdit(note)}>
                Edit
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Done
              </Button>
              <Button
                variant="danger"
                className="icon-only"
                icon="trash-2"
                title="Delete"
                onClick={() => onDelete(note)}
              />
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
