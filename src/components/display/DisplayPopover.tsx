import { useRef, type RefObject } from "react";
import { LOCALES, type Appearance, type CardSurface, type Locale } from "@/domain/model";
import { COLOR_FAMILIES, colorById, familyOfColor } from "@/theme/colors";
import { useCopy } from "@/i18n/I18nContext";
import { LOCALE_ENDONYMS } from "@/i18n/locales";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useOnEscape } from "@/hooks/useOnEscape";
import { Icon } from "@/components/primitives/Icon";

export interface DisplayPopoverProps {
  appearance: Appearance;
  language: Locale;
  anchorRef: RefObject<HTMLElement>;
  onChange: (changes: Partial<Appearance>) => void;
  onLanguageChange: (locale: Locale) => void;
  onClose: () => void;
}

export function DisplayPopover({
  appearance,
  language,
  anchorRef,
  onChange,
  onLanguageChange,
  onClose,
}: DisplayPopoverProps) {
  const copy = useCopy();
  const popoverRef = useRef<HTMLDivElement>(null);
  const current = colorById(appearance.color);
  const family = familyOfColor(appearance.color);

  const surfaces: readonly { id: CardSurface; label: string; chip: string }[] = [
    { id: "cream", label: copy.display.cream, chip: current.paper },
    { id: "color", label: copy.colors[family.id], chip: current.plate },
  ];

  useOnClickOutside([popoverRef, anchorRef], onClose);
  useOnEscape(onClose);

  return (
    <div className="popover" ref={popoverRef}>
      <div className="pop-title">
        {copy.display.color} <span className="pop-note">{copy.colors[current.id]}</span>
      </div>

      {COLOR_FAMILIES.map((group) => (
        <div
          className="color-family"
          key={group.id}
          role="group"
          aria-labelledby={`color-family-${group.id}`}
        >
          <div className="color-family-label" id={`color-family-${group.id}`}>
            {copy.colors[group.id]}
          </div>
          <div className="color-grid">
            {group.colors.map((color) => (
              <button
                key={color.id}
                type="button"
                className={appearance.color === color.id ? "color-sw on" : "color-sw"}
                title={copy.colors[color.id]}
                aria-label={copy.colors[color.id]}
                aria-pressed={appearance.color === color.id}
                style={{ background: color.field }}
                onClick={() => onChange({ color: color.id })}
              >
                <span className="tick" style={{ color: color.light ? color.plate : color.paper }}>
                  <Icon name="check" />
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="pop-title">
        {copy.display.cards} <span className="pop-note">{copy.display.cardsNote}</span>
      </div>

      <div className="seg-toggle">
        {surfaces.map((surface) => (
          <button
            key={surface.id}
            type="button"
            className={appearance.cards === surface.id ? "on" : ""}
            aria-pressed={appearance.cards === surface.id}
            onClick={() => onChange({ cards: surface.id })}
          >
            <span className="surface-sw">
              <span className="surface-chip" style={{ background: surface.chip }} /> {surface.label}
            </span>
          </button>
        ))}
      </div>

      <div className="pop-title">
        {copy.display.language} <span className="pop-note">{copy.display.languageNote}</span>
      </div>

      <div className="seg-toggle">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            className={language === locale ? "on" : ""}
            aria-pressed={language === locale}
            onClick={() => onLanguageChange(locale)}
          >
            {LOCALE_ENDONYMS[locale]}
          </button>
        ))}
      </div>
    </div>
  );
}
