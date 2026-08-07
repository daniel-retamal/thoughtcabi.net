import type { Toast } from "@/hooks/useToasts";
import { Icon } from "@/components/primitives/Icon";

export interface ToastStackProps {
  toasts: readonly Toast[];
  onView: (toast: Toast) => void;
}

export function ToastStack({ toasts, onView }: ToastStackProps) {
  return (
    <div className="toast-wrap">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <span className="tdot">
            <Icon name="check" />
          </span>
          <span>
            {toast.verb} <b>{toast.folder}</b>
          </span>
          <span className="tlink" onClick={() => onView(toast)}>
            View
          </span>
        </div>
      ))}
    </div>
  );
}
