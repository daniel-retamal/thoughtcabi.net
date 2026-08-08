import type { IconName } from "@/icons/names";
import { Icon } from "@/components/primitives/Icon";

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  text: string;
}

export function EmptyState({ icon, title, text }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="eico">
        <Icon name={icon} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
