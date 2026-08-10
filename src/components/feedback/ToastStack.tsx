import type { Toast, ToastActionKind } from "@/hooks/useToasts";
import { Icon } from "@/components/primitives/Icon";

const ACTION_LABEL: Record<ToastActionKind, string> = {
  view: "View",
  undo: "Undo",
};

export interface ToastStackProps {
  toasts: readonly Toast[];
}

export function ToastStack({ toasts }: ToastStackProps) {
  return (
    <div className="toast-wrap">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <span className="tdot">
            <Icon name="check" />
          </span>
          <span>
            {toast.verb} <b>{toast.subject}</b>
          </span>
          <button type="button" className="tlink" onClick={toast.action.run}>
            {ACTION_LABEL[toast.action.kind]}
          </button>
        </div>
      ))}
    </div>
  );
}
