import type { ReactNode } from "react";
import { Modal, type ModalSize } from "./Modal";

export interface FormModalProps {
  size: ModalSize;
  kind?: string;
  heading: string;
  onClose: () => void;
  children: ReactNode;
}

export function FormModal({ size, kind, heading, onClose, children }: FormModalProps) {
  return (
    <Modal size={size} onClose={onClose}>
      <div className="modal-body form">
        {kind ? (
          <div className="m-cat">
            <span className="cat-chip">{kind}</span>
          </div>
        ) : null}
        <h2 className="form-title">{heading}</h2>
        {children}
      </div>
    </Modal>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="modal-actions form-actions">{children}</div>;
}
