import type { MouseEvent } from "react";
import type { IconName } from "@/icons/names";
import { Icon } from "./Icon";

export interface ActionButtonProps {
  icon: IconName;
  label: string;
  onClick: () => void;
  className?: string;
}

export function ActionButton({ icon, label, onClick, className }: ActionButtonProps) {
  const handleClick = (event: MouseEvent): void => {
    event.stopPropagation();
    onClick();
  };

  return (
    <button
      type="button"
      className={className}
      title={label}
      aria-label={label}
      onClick={handleClick}
    >
      <Icon name={icon} />
    </button>
  );
}
