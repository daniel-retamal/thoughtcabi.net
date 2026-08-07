import type { MouseEvent, ReactNode } from "react";
import { useOnEscape } from "@/hooks/useOnEscape";

export type ModalSize = "xs" | "sm" | "md";

export interface ModalProps {
  size?: ModalSize;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ size, onClose, children }: ModalProps) {
  useOnEscape(onClose);

  const onScrimMouseDown = (event: MouseEvent): void => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="scrim" onMouseDown={onScrimMouseDown}>
      <div className={size ? `modal modal-${size}` : "modal"}>{children}</div>
    </div>
  );
}
