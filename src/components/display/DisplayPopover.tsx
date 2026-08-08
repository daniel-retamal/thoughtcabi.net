import { useRef, type RefObject } from "react";
import type { Appearance, CardSurface } from "@/domain/model";
import { COLOR_FAMILIES, colorById, familyOfColor } from "@/theme/colors";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useOnEscape } from "@/hooks/useOnEscape";
import { Icon } from "@/components/primitives/Icon";

export interface DisplayPopoverProps {
  appearance: Appearance;
  anchorRef: RefObject<HTMLElement>;
  onChange: (changes: Partial<Appearance>) => void;
  onClose: () => void;
}

export function DisplayPopover({ appearance, anchorRef, onChange, onClose }: DisplayPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const current = colorById(appearance.color);
  const family = familyOfColor(appearance.color);

  const surfaces: readonly { id: CardSurface; label: string; chip: string }[] = [
    { id: "cream", label: "Cream", chip: current.cream },
    { id: "color", label: family.label, chip: current.field },
  ];

  useOnClickOutside([popoverRef, anchorRef], onClose);
  useOnEscape(onClose);

  return (
    <div className="popover" ref={popoverRef}>
      <div className="pop-title">
        Color <span className="pop-note">{current.label}</span>
      </div>

      {COLOR_FAMILIES.map((group) => (
        <div
          className="color-family"
          key={group.id}
          role="group"
          aria-labelledby={`color-family-${group.id}`}
        >
          <div className="color-family-label" id={`color-family-${group.id}`}>
            {group.label}
          </div>
          <div className="color-grid">
            {group.colors.map((color) => (
              <button
                key={color.id}
                type="button"
                className={appearance.color === color.id ? "color-sw on" : "color-sw"}
                title={color.label}
                aria-label={color.label}
                aria-pressed={appearance.color === color.id}
                style={{ background: color.field }}
                onClick={() => onChange({ color: color.id })}
              >
                <span className="tick" style={{ color: color.cream }}>
                  <Icon name="check" />
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="pop-title">
        Cards <span className="pop-note">the surface saves sit on</span>
      </div>

      <div className="seg-toggle">
        {surfaces.map((surface) => (
          <button
            key={surface.id}
            type="button"
            className={appearance.cards === surface.id ? "on" : ""}
            onClick={() => onChange({ cards: surface.id })}
          >
            <span className="surface-sw">
              <span className="surface-chip" style={{ background: surface.chip }} /> {surface.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
