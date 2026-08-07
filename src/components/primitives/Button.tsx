import type { ReactNode } from "react";
import type { IconName } from "@/icons/names";
import { Icon } from "./Icon";

export type ButtonVariant = "primary" | "ghost" | "danger";

export interface ButtonProps {
  variant: ButtonVariant;
  icon?: IconName;
  children?: ReactNode;
  disabled?: boolean;
  title?: string;
  className?: string;
  onClick: () => void;
}

export function Button({
  variant,
  icon,
  children,
  disabled,
  title,
  className,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      className={className ? `${variant} ${className}` : variant}
      disabled={disabled}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}
