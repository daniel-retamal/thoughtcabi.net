import type { ViewMode } from "@/domain/model";
import { useCopy } from "@/i18n/I18nContext";
import { counted, format } from "@/i18n/format";
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
  const copy = useCopy();
  if (!showTools) return null;

  return (
    <div className="toolbar">
      {noteCount + folderCount > 0 ? (
        <span className="count-pill">
          {counted(copy.counts.items, noteCount)}
          {folderCount ? ` · ${format(copy.folder.foldersFlat, { n: folderCount })}` : ""}
        </span>
      ) : null}

      <div className="tools-right">
        {canCreateFolder ? (
          <button
            type="button"
            className="iconbtn"
            title={copy.toolbar.newFolder}
            aria-label={copy.toolbar.newFolder}
            onClick={onNewFolder}
          >
            <Icon name="folder-plus" />
          </button>
        ) : null}

        <div className="segmented">
          <button
            type="button"
            className={view === "grid" ? "on" : ""}
            title={copy.toolbar.grid}
            aria-label={copy.toolbar.gridView}
            onClick={() => onViewChange("grid")}
          >
            <Icon name="layout-grid" />
          </button>
          <button
            type="button"
            className={view === "list" ? "on" : ""}
            title={copy.toolbar.rows}
            aria-label={copy.toolbar.rowView}
            onClick={() => onViewChange("list")}
          >
            <Icon name="list" />
          </button>
        </div>
      </div>
    </div>
  );
}
