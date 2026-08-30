import type { ReactNode, RefObject } from "react";
import { useCopy } from "@/i18n/I18nContext";
import type { Copy } from "@/i18n/copy";
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

function toggleLabel(compact: boolean, wide: boolean, copy: Copy): string {
  if (compact) return copy.paneBar.shelvesAndTags;
  return wide ? copy.paneBar.narrowSidebar : copy.paneBar.widenSidebar;
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
  const copy = useCopy();
  const label = toggleLabel(compact, wide, copy);

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
            placeholder={copy.paneBar.searchPlaceholder}
            aria-label={copy.paneBar.searchLabel}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="search-clear"
              aria-label={copy.actions.clearSearch}
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
          <Icon name="plus" /> {copy.paneBar.compose}
        </button>
      </div>
    </div>
  );
}
