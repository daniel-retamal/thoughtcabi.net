import { useRef, useState } from "react";
import { useCopy } from "@/i18n/I18nContext";
import { format } from "@/i18n/format";
import { relativeTime } from "@/lib/relativeTime";
import type { DestinationView, PillState } from "@/state/useRemoteSync";
import { providerFace } from "./providerFace";
import { SyncPill } from "./SyncPill";
import { SyncPopover } from "./SyncPopover";

export interface SyncStatusProps {
  state: PillState;
  destinations: readonly DestinationView[];
  onSyncNow: () => void;
  onResume: (id: string) => void;
  onManage: () => void;
}

export function SyncStatus({
  state,
  destinations,
  onSyncNow,
  onResume,
  onManage,
}: SyncStatusProps) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const primary =
    destinations.find((view) => view.destination.direction === "two-way") ?? destinations[0];
  if (state === "off" || !primary) return null;

  const name = primary.destination.label || providerFace(primary.destination.provider, copy).label;
  const said = format(copy.sync.states[state], { name });
  const when =
    state === "synced" && primary.destination.lastSyncedAt !== null
      ? format(copy.sync.lastSynced, {
          when: relativeTime(primary.destination.lastSyncedAt, copy.time),
        })
      : null;

  return (
    <div className="pop-wrap">
      <SyncPill
        state={state}
        provider={primary.destination.provider}
        title={when ? `${said}, ${when}` : said}
        open={open}
        buttonRef={buttonRef}
        onClick={() => setOpen((shown) => !shown)}
      />
      {open ? (
        <SyncPopover
          state={state}
          said={said}
          destinations={destinations}
          anchorRef={buttonRef}
          onSyncNow={onSyncNow}
          onResume={onResume}
          onManage={() => {
            setOpen(false);
            onManage();
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
