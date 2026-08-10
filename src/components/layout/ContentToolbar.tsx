import type { ReactNode } from "react";
import type { ViewMode } from "@/domain/model";
import { pluralize } from "@/lib/text";
import { Icon } from "@/components/primitives/Icon";

export interface ContentToolbarProps {
  children: ReactNode;
  noteCount: number;
  folderCount: number;
  view: ViewMode;
  showTools: boolean;
  canCreateFolder: boolean;
  onViewChange: (view: ViewMode) => void;
  onNewFolder: () => void;
}

export function ContentToolbar({
  children,
  noteCount,
  folderCount,
  view,
  showTools,
  canCreateFolder,
  onViewChange,
  onNewFolder,
}: ContentToolbarProps) {
  if (!showTools) {
    return <div className="toolbar">{children}</div>;
  }

  return (
    <div className="toolbar">
      {children}
      <div className="tools-right">
        {noteCount + folderCount > 0 ? (
          <span className="count-pill">
            {pluralize(noteCount, "item")}
            {folderCount ? ` · ${folderCount} folders` : ""}
          </span>
        ) : null}

        {canCreateFolder ? (
          <button
            type="button"
            className="iconbtn"
            title="New folder"
            aria-label="New folder"
            onClick={onNewFolder}
          >
            <Icon name="folder-plus" />
          </button>
        ) : null}

        <div className="segmented">
          <button
            type="button"
            className={view === "grid" ? "on" : ""}
            title="Grid"
            aria-label="Grid view"
            onClick={() => onViewChange("grid")}
          >
            <Icon name="layout-grid" />
          </button>
          <button
            type="button"
            className={view === "list" ? "on" : ""}
            title="Rows"
            aria-label="Row view"
            onClick={() => onViewChange("list")}
          >
            <Icon name="list" />
          </button>
        </div>
      </div>
    </div>
  );
}
