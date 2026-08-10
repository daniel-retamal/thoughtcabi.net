import { stopPropagation } from "@/lib/events";
import { pluralize } from "@/lib/text";

export interface DeleteFaceProps {
  count: number;
  className: "folder-face" | "row-face";
  onConfirm: () => void;
  onKeep: () => void;
}

export function DeleteFace({ count, className, onConfirm, onKeep }: DeleteFaceProps) {
  return (
    <div className={className} onClick={stopPropagation}>
      <p>Delete {pluralize(count, "save")}?</p>
      <div className="face-actions">
        <button type="button" className="face-delete" onClick={onConfirm}>
          Delete
        </button>
        <button type="button" className="face-keep" onClick={onKeep}>
          Keep
        </button>
      </div>
    </div>
  );
}
