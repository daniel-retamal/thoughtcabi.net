import { useRef, useState, type ReactNode } from "react";
import type { Appearance, Locale } from "@/domain/model";
import { useCopy } from "@/i18n/I18nContext";
import { Icon } from "@/components/primitives/Icon";
import { DisplayPopover } from "@/components/display/DisplayPopover";

export interface AppControlsProps {
  appearance: Appearance;
  language: Locale;
  onAppearanceChange: (changes: Partial<Appearance>) => void;
  onLanguageChange: (locale: Locale) => void;
  onTransfer: () => void;
  pill: ReactNode;
}

export function AppControls({
  appearance,
  language,
  onAppearanceChange,
  onLanguageChange,
  onTransfer,
  pill,
}: AppControlsProps) {
  const copy = useCopy();
  const [displayOpen, setDisplayOpen] = useState(false);
  const displayButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      {pill}

      <button
        type="button"
        className="iconbtn"
        title={copy.toolbar.transfer}
        aria-label={copy.toolbar.transfer}
        onClick={onTransfer}
      >
        <Icon name="archive" />
      </button>

      <div className="pop-wrap">
        <button
          ref={displayButtonRef}
          type="button"
          className={displayOpen ? "iconbtn active" : "iconbtn"}
          title={copy.toolbar.display}
          aria-label={copy.toolbar.display}
          onClick={() => setDisplayOpen((open) => !open)}
        >
          <Icon name="sliders-horizontal" />
        </button>
        {displayOpen ? (
          <DisplayPopover
            appearance={appearance}
            language={language}
            anchorRef={displayButtonRef}
            onChange={onAppearanceChange}
            onLanguageChange={onLanguageChange}
            onClose={() => setDisplayOpen(false)}
          />
        ) : null}
      </div>
    </>
  );
}
