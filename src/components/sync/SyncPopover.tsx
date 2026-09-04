import { useRef, type RefObject } from "react";
import { useCopy } from "@/i18n/I18nContext";
import { format } from "@/i18n/format";
import { relativeTime } from "@/lib/relativeTime";
import type { DestinationView, PillState } from "@/state/useRemoteSync";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useOnEscape } from "@/hooks/useOnEscape";
import { Icon } from "@/components/primitives/Icon";
import { needsAHand, providerFace } from "./providerFace";

export interface SyncPopoverProps {
  state: PillState;
  said: string;
  destinations: readonly DestinationView[];
  anchorRef: RefObject<HTMLElement>;
  onSyncNow: () => void;
  onResume: (id: string) => void;
  onManage: () => void;
  onClose: () => void;
}

export function SyncPopover({
  state,
  said,
  destinations,
  anchorRef,
  onSyncNow,
  onResume,
  onManage,
  onClose,
}: SyncPopoverProps) {
  const copy = useCopy();
  const popoverRef = useRef<HTMLDivElement>(null);

  useOnClickOutside([popoverRef, anchorRef], onClose);
  useOnEscape(onClose);

  return (
    <div className="popover sync-peek" ref={popoverRef}>
      <div className="pop-title">
        {copy.sync.places} <span className="pop-note">{said}</span>
      </div>

      <div className="sync-peek-list">
        {destinations.map(({ destination, status, available }) => {
          const face = providerFace(destination.provider, copy);
          const trouble = available ? status.problem : null;
          const when =
            destination.lastSyncedAt === null
              ? copy.sync.never
              : format(copy.sync.lastSynced, {
                  when: relativeTime(destination.lastSyncedAt, copy.time),
                });

          return (
            <div className={`sync-peek-row peek-${status.kind}`} key={destination.id}>
              <span className="place-mark">
                <Icon name={available ? face.icon : "globe"} />
                {status.kind === "synced" ? null : (
                  <span
                    className={needsAHand(status.kind) ? "peek-dot danger" : "peek-dot"}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="place-name">{destination.label || face.label}</span>
              <span className="place-role">
                {!available
                  ? copy.sync.connect.unavailable
                  : destination.direction === "two-way"
                    ? copy.sync.roles.home
                    : copy.sync.roles.mirror}
              </span>
              <span className="sync-peek-note">
                {trouble ? copy.sync.problems[trouble] : when}
                {status.kind === "paused" ? (
                  <button
                    type="button"
                    className="place-verb"
                    onClick={() => onResume(destination.id)}
                  >
                    {copy.sync.actions.resume}
                  </button>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      <div className="sync-peek-verbs">
        <button
          type="button"
          className="sync-peek-verb lead"
          disabled={state === "working"}
          onClick={onSyncNow}
        >
          <Icon name="refresh-cw" />
          {copy.sync.actions.syncNow}
        </button>
        <button type="button" className="sync-peek-verb" onClick={onManage}>
          {copy.sync.heading}
        </button>
      </div>
    </div>
  );
}
