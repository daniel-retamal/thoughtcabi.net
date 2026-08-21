import type { DragEvent, ReactNode } from "react";
import { readDroppedImage } from "@/lib/imageDrop";
import { Modal, type ModalSize } from "./Modal";

export interface FormModalProps {
  size: ModalSize;
  kind?: string;
  heading: string;
  onClose: () => void;
  onImageDrop?: (image: string) => void;
  children: ReactNode;
}

export function FormModal({ size, kind, heading, onClose, onImageDrop, children }: FormModalProps) {
  const dropProps = onImageDrop
    ? {
        onDragOver: (event: DragEvent) => event.preventDefault(),
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          event.stopPropagation();
          void readDroppedImage(event.dataTransfer).then((image) => {
            if (image) onImageDrop(image);
          });
        },
      }
    : {};

  return (
    <Modal size={size} onClose={onClose}>
      <div className="modal-body form" {...dropProps}>
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
