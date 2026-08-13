import type { IconName } from "@/icons/names";
import { SHELF_ICON_CHOICES } from "@/icons/registry";
import { Icon } from "@/components/primitives/Icon";

export interface IconPickerProps {
  value: IconName;
  onChange: (icon: IconName) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="icon-grid">
      {SHELF_ICON_CHOICES.map((icon) => (
        <button
          type="button"
          key={icon}
          className={value === icon ? "ig-btn on" : "ig-btn"}
          title={icon}
          aria-label={icon}
          onClick={() => onChange(icon)}
        >
          <Icon name={icon} />
        </button>
      ))}
    </div>
  );
}
