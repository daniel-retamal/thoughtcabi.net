import { useRef, type RefObject } from "react";
import type { Appearance, CardSurface } from "@/domain/model";
import { AZUL_PALETTES, paletteById } from "@/theme/azul";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useOnEscape } from "@/hooks/useOnEscape";
import { Icon } from "@/components/primitives/Icon";

const CARD_SURFACES: readonly { id: CardSurface; label: string }[] = [
  { id: "cream", label: "Cream" },
  { id: "blue", label: "Blue" },
];

export interface DisplayPopoverProps {
  appearance: Appearance;
  anchorRef: RefObject<HTMLElement>;
  onChange: (changes: Partial<Appearance>) => void;
  onClose: () => void;
}

export function DisplayPopover({ appearance, anchorRef, onChange, onClose }: DisplayPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const current = paletteById(appearance.palette);

  useOnClickOutside([popoverRef, anchorRef], onClose);
  useOnEscape(onClose);

  return (
    <div className="popover" ref={popoverRef}>
      <div className="pop-title">
        Palette <span className="pop-note">{current.label}</span>
      </div>

      <div className="az-palettes">
        {AZUL_PALETTES.map((palette) => (
          <div
            key={palette.id}
            className={appearance.palette === palette.id ? "az-sw on" : "az-sw"}
            title={palette.label}
            style={{ background: palette.field }}
            onClick={() => onChange({ palette: palette.id })}
          >
            <span className="az-cream-half" style={{ background: palette.cream }} />
            <span className="tick" style={{ color: palette.field }}>
              <Icon name="check" />
            </span>
          </div>
        ))}
      </div>

      <div className="pop-title">
        Cards <span className="pop-note">the surface saves sit on</span>
      </div>

      <div className="seg-toggle">
        {CARD_SURFACES.map((surface) => (
          <button
            key={surface.id}
            type="button"
            className={appearance.cards === surface.id ? "on" : ""}
            onClick={() => onChange({ cards: surface.id })}
          >
            <span className="az-cardsw">
              <span
                className="az-chip"
                style={{ background: surface.id === "cream" ? current.cream : current.field }}
              />{" "}
              {surface.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
