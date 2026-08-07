import type { ReactNode } from "react";
import { Icon } from "@/components/primitives/Icon";

export interface SidebarSectionProps {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}

export function SidebarSection({ title, addLabel, onAdd, children }: SidebarSectionProps) {
  return (
    <>
      <div className="side-section-label">
        <span>{title}</span>
        <button type="button" title={addLabel} aria-label={addLabel} onClick={onAdd}>
          <Icon name="plus" />
        </button>
      </div>
      {children}
    </>
  );
}
