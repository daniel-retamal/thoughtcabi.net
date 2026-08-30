import { stopPropagation } from "@/lib/events";
import { useCopy } from "@/i18n/I18nContext";
import { countedTemplate } from "@/i18n/format";

export interface DeleteFaceProps {
  count: number;
  className: "folder-face" | "row-face";
  onConfirm: () => void;
  onKeep: () => void;
}

export function DeleteFace({ count, className, onConfirm, onKeep }: DeleteFaceProps) {
  const copy = useCopy();

  return (
    <div className={className} onClick={stopPropagation}>
      <p>{countedTemplate(copy.deleteFace.question, count)}</p>
      <div className="face-actions">
        <button type="button" className="face-delete" onClick={onConfirm}>
          {copy.actions.delete}
        </button>
        <button type="button" className="face-keep" onClick={onKeep}>
          {copy.actions.keep}
        </button>
      </div>
    </div>
  );
}
