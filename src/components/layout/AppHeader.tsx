import type { ReactNode, RefObject } from "react";
import { Icon } from "@/components/primitives/Icon";
import { ModKey } from "@/components/primitives/ModKey";

export interface AppHeaderProps {
  query: string;
  searchRef: RefObject<HTMLInputElement>;
  controls: ReactNode;
  compact: boolean;
  onQueryChange: (query: string) => void;
  onOpenDrawer: () => void;
  onCompose: () => void;
}

export function AppHeader({
  query,
  searchRef,
  controls,
  compact,
  onQueryChange,
  onOpenDrawer,
  onCompose,
}: AppHeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        {compact ? (
          <button
            type="button"
            className="iconbtn"
            title="Shelves and tags"
            aria-label="Shelves and tags"
            onClick={onOpenDrawer}
          >
            <Icon name="panel-left" />
          </button>
        ) : null}
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
              <ModKey />
              <kbd>K</kbd>
            </span>
          )}
        </div>
      </div>

      <div className="header-actions">
        {controls}
        <button type="button" className="btn-paste" onClick={onCompose}>
          <Icon name="plus" /> Save
        </button>
      </div>
    </header>
  );
}
