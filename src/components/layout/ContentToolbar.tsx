import type { ViewMode } from "@/domain/model";
import { pluralize } from "@/lib/text";
import { Icon } from "@/components/primitives/Icon";

export interface ContentToolbarProps {
  noteCount: number;
  folderCount: number;
  view: ViewMode;
  showTools: boolean;
  canCreateFolder: boolean;
  onViewChange: (view: ViewMode) => void;
  onNewFolder: () => void;
}

export function ContentToolbar({
  noteCount,
  folderCount,
  view,
  showTools,
  canCreateFolder,
  onViewChange,
  onNewFolder,
}: ContentToolbarProps) {
  if (!showTools) return null;

  return (
    <div className="toolbar">
      {noteCount + folderCount > 0 ? (
        <span className="count-pill">
          {pluralize(noteCount, "item")}
          {folderCount ? ` · ${folderCount} folders` : ""}
        </span>
      ) : null}

      <div className="tools-right">
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
