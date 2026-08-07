import type { IconName } from "@/icons/names";
import { Icon } from "@/components/primitives/Icon";

export function SectionHeading({ icon, label }: { icon: IconName; label: string }) {
  return (
    <div className="section-head">
      <Icon name={icon} /> {label} <span className="line" />
    </div>
  );
}
