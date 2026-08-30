import type { IconName } from "@/icons/names";
import { SHELF_ICON_CHOICES } from "@/icons/registry";
import { useCopy } from "@/i18n/I18nContext";
import { Icon } from "@/components/primitives/Icon";

export interface IconPickerProps {
  value: IconName;
  onChange: (icon: IconName) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const copy = useCopy();

  return (
    <div className="icon-grid">
      {SHELF_ICON_CHOICES.map((icon) => (
        <button
          type="button"
          key={icon}
          className={value === icon ? "ig-btn on" : "ig-btn"}
          title={copy.icons[icon]}
          aria-label={copy.icons[icon]}
          onClick={() => onChange(icon)}
        >
          <Icon name={icon} />
        </button>
      ))}
    </div>
  );
}
