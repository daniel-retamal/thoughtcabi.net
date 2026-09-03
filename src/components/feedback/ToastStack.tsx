import type { Toast, ToastActionKind } from "@/hooks/useToasts";
import { useCopy } from "@/i18n/I18nContext";
import { Icon } from "@/components/primitives/Icon";

export interface ToastStackProps {
  toasts: readonly Toast[];
}

export function ToastStack({ toasts }: ToastStackProps) {
  const copy = useCopy();
  const actionLabel: Record<ToastActionKind, string> = {
    view: copy.toasts.view,
    undo: copy.toasts.undo,
  };

  return (
    <div className="toast-wrap">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <span className="tdot">
            <Icon name="check" />
          </span>
          <span>
            {copy.toasts[toast.verb]} <b>{toast.subject}</b>
          </span>
          {toast.action ? (
            <button type="button" className="tlink" onClick={toast.action.run}>
              {actionLabel[toast.action.kind]}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
