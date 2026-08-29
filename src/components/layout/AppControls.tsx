import { useRef, useState } from "react";
import type { Appearance } from "@/domain/model";
import { Icon } from "@/components/primitives/Icon";
import { DisplayPopover } from "@/components/display/DisplayPopover";

export interface AppControlsProps {
  appearance: Appearance;
  onAppearanceChange: (changes: Partial<Appearance>) => void;
  onTransfer: () => void;
}

export function AppControls({ appearance, onAppearanceChange, onTransfer }: AppControlsProps) {
  const [displayOpen, setDisplayOpen] = useState(false);
  const displayButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        type="button"
        className="iconbtn"
        title="Export & import"
        aria-label="Export and import"
        onClick={onTransfer}
      >
        <Icon name="archive" />
      </button>

      <div className="pop-wrap">
        <button
          ref={displayButtonRef}
          type="button"
          className={displayOpen ? "iconbtn active" : "iconbtn"}
          title="Display"
          aria-label="Display settings"
          onClick={() => setDisplayOpen((open) => !open)}
        >
          <Icon name="sliders-horizontal" />
        </button>
        {displayOpen ? (
          <DisplayPopover
            appearance={appearance}
            anchorRef={displayButtonRef}
            onChange={onAppearanceChange}
            onClose={() => setDisplayOpen(false)}
          />
        ) : null}
      </div>
    </>
  );
}
