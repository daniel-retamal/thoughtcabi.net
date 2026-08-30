import { Icon } from "@/components/primitives/Icon";
import { useCopy } from "@/i18n/I18nContext";

export type StorageProblem = "quota" | "unavailable";

export interface StorageNoticeProps {
  problem: StorageProblem;
  onDismiss: () => void;
}

export function StorageNotice({ problem, onDismiss }: StorageNoticeProps) {
  const copy = useCopy();

  return (
    <div className="notice" role="alert">
      <span className="notice-mark">
        <Icon name="triangle-alert" />
      </span>
      <p className="notice-text">{copy.storage[problem]}</p>
      <button
        type="button"
        className="notice-dismiss"
        title={copy.actions.dismiss}
        aria-label={copy.actions.dismiss}
        onClick={onDismiss}
      >
        <Icon name="x" />
      </button>
    </div>
  );
}
