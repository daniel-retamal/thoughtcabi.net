import { useRef, useState, type RefObject } from "react";
import type { Appearance } from "@/domain/model";
import { Icon } from "@/components/primitives/Icon";
import { DisplayPopover } from "@/components/display/DisplayPopover";

export interface AppHeaderProps {
  query: string;
  searchRef: RefObject<HTMLInputElement>;
  appearance: Appearance;
  onQueryChange: (query: string) => void;
  onAppearanceChange: (changes: Partial<Appearance>) => void;
  onCompose: () => void;
}

export function AppHeader({
  query,
  searchRef,
  appearance,
  onQueryChange,
  onAppearanceChange,
  onCompose,
}: AppHeaderProps) {
  const [displayOpen, setDisplayOpen] = useState(false);
  const displayButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <header className="header">
      <div className="brand">
        <span className="mark">
          <Icon name="brain-circuit" />
        </span>
        <span className="wordmark">
          thoughtcabi<span className="dotnet">.net</span>
        </span>
      </div>

      <div className="header-search">
        <div className="search-box">
          <Icon name="search" />
          <input
            ref={searchRef}
            value={query}
            placeholder="Search..."
            aria-label="Search your cabinet"
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => onQueryChange("")}
            >
              <Icon name="x" />
            </button>
          ) : (
            <span className="kbd-hint">
              <kbd>Ctrl</kbd>
              <kbd>K</kbd>
            </span>
          )}
        </div>
      </div>

      <div className="header-actions">
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

        <button type="button" className="btn-paste" onClick={onCompose}>
          <Icon name="plus" /> Save
        </button>
      </div>
    </header>
  );
}
