import { Icon } from "@/components/primitives/Icon";

export type StorageProblem = "quota" | "unavailable";

const MESSAGES: Readonly<Record<StorageProblem, string>> = {
  quota:
    "This browser's storage is full, so recent changes have not been saved. Delete a few items to make room.",
  unavailable: "This browser is blocking local storage. Nothing you change here will be saved.",
};

export interface StorageNoticeProps {
  problem: StorageProblem;
  onDismiss: () => void;
}

export function StorageNotice({ problem, onDismiss }: StorageNoticeProps) {
  return (
    <div className="notice" role="alert">
      <span className="notice-mark">
        <Icon name="triangle-alert" />
      </span>
      <p className="notice-text">{MESSAGES[problem]}</p>
      <button
        type="button"
        className="notice-dismiss"
        title="Dismiss"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <Icon name="x" />
      </button>
    </div>
  );
}
