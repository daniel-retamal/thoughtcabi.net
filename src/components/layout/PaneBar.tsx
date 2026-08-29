import type { ReactNode, RefObject } from "react";
import { Icon } from "@/components/primitives/Icon";
import { ModKey } from "@/components/primitives/ModKey";

export interface PaneBarProps {
  query: string;
  searchRef: RefObject<HTMLInputElement>;
  crumbs: ReactNode;
  controls: ReactNode;
  compact: boolean;
  wide: boolean;
  onToggleSidebar: () => void;
  onQueryChange: (query: string) => void;
  onCompose: () => void;
}

function toggleLabel(compact: boolean, wide: boolean): string {
  if (compact) return "Shelves and tags";
  return wide ? "Narrow sidebar" : "Widen sidebar";
}

export function PaneBar({
  query,
  searchRef,
  crumbs,
  controls,
  compact,
  wide,
  onToggleSidebar,
  onQueryChange,
  onCompose,
}: PaneBarProps) {
  const label = toggleLabel(compact, wide);

  return (
    <div className="pane-bar">
      <div className="bar-nav">
        <button
          type="button"
          className="iconbtn sb-toggle"
          title={label}
          aria-label={label}
          aria-controls="cabinet-sidebar"
          aria-expanded={compact ? undefined : wide}
          onClick={onToggleSidebar}
        >
          <Icon name="panel-left" />
        </button>
        <span className="vrule" />
        {crumbs}
      </div>

      <div className="bar-right">
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

        {controls}

        <button type="button" className="btn-paste" onClick={onCompose}>
          <Icon name="plus" /> Save
        </button>
      </div>
    </div>
  );
}
