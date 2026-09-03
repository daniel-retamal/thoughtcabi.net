import { useState } from "react";
import { useCopy } from "@/i18n/I18nContext";
import { Icon } from "@/components/primitives/Icon";

export interface DownloadRowProps {
  onDownload: () => void;
}

export function DownloadRow({ onDownload }: DownloadRowProps) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);

  return (
    <div className="place place-idle">
      <button
        type="button"
        className="place-head"
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
      >
        <span className="place-mark">
          <Icon name="hard-drive" />
        </span>
        <span className="place-name">{copy.sync.download.label}</span>
        <span className="place-role">{copy.sync.roles.mirror}</span>
        <span className="place-note">{copy.sync.download.detail}</span>
        <span className="place-when">{copy.sync.download.when}</span>
        <span className="place-chevron">
          <Icon name={open ? "chevron-down" : "chevron-right"} />
        </span>
      </button>

      {open ? (
        <div className="place-detail">
          <div className="place-verbs">
            <button type="button" className="place-verb" onClick={onDownload}>
              <Icon name="download" />
              {copy.actions.download}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
