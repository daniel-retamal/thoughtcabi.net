import { useState } from "react";
import { CADENCES, type Cadence } from "@/domain/sync/types";
import { useArmed } from "@/hooks/useArmed";
import { useCopy } from "@/i18n/I18nContext";
import { relativeTime } from "@/lib/relativeTime";
import type { DestinationView } from "@/state/useRemoteSync";
import { Icon } from "@/components/primitives/Icon";
import { providerFace } from "./providerFace";

export interface DestinationRowProps {
  view: DestinationView;
  onResume: () => void;
  onRestore: () => void;
  onMakeHome: () => void;
  onCadence: (cadence: Cadence) => void;
  onDisconnect: () => void;
}

export function DestinationRow({
  view,
  onResume,
  onRestore,
  onMakeHome,
  onCadence,
  onDisconnect,
}: DestinationRowProps) {
  const copy = useCopy();
  const [open, setOpen] = useState(false);
  const disconnect = useArmed();

  const { destination, status, available } = view;
  const face = providerFace(destination.provider, copy);
  const role = destination.direction === "two-way" ? copy.sync.roles.home : copy.sync.roles.mirror;
  const when =
    destination.lastSyncedAt === null
      ? copy.sync.never
      : relativeTime(destination.lastSyncedAt, copy.time);

  const trouble = available && status.problem ? copy.sync.problems[status.problem] : null;

  return (
    <div className={`place place-${status.kind}`}>
      <button
        type="button"
        className="place-head"
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
      >
        <span className="place-mark">
          <Icon name={available ? face.icon : "globe"} />
        </span>
        <span className="place-name">{destination.label || face.label}</span>
        <span className="place-role">{available ? role : copy.sync.connect.unavailable}</span>
        <span className="place-file">{destination.locator.name ?? ""}</span>
        <span className="place-when">{when}</span>
        <span className="place-chevron">
          <Icon name={open ? "chevron-down" : "chevron-right"} />
        </span>
      </button>

      {trouble ? (
        <p className="place-problem" role="status">
          {trouble}
          {status.kind === "paused" ? (
            <button type="button" className="place-verb" onClick={onResume}>
              {copy.sync.actions.resume}
            </button>
          ) : null}
        </p>
      ) : null}

      {open ? (
        <div className="place-detail">
          {available ? (
            <div className="place-cadence">
              {CADENCES.map((cadence) => (
                <button
                  key={cadence}
                  type="button"
                  className={destination.cadence === cadence ? "chip on" : "chip"}
                  aria-pressed={destination.cadence === cadence}
                  onClick={() => onCadence(cadence)}
                >
                  {copy.sync.cadences[cadence]}
                </button>
              ))}
            </div>
          ) : null}

          <div className="place-verbs">
            {available && destination.direction !== "two-way" ? (
              <button type="button" className="place-verb" onClick={onMakeHome}>
                <Icon name="house" />
                {copy.sync.actions.makeHome}
              </button>
            ) : null}

            {available ? (
              <button type="button" className="place-verb" onClick={onRestore}>
                <Icon name="rotate-ccw" />
                {copy.sync.actions.restore}
              </button>
            ) : null}

            <button
              type="button"
              className={disconnect.armed ? "place-verb armed" : "place-verb"}
              onClick={disconnect.armed ? onDisconnect : disconnect.arm}
            >
              <Icon name="unplug" />
              {disconnect.armed ? copy.sync.actions.disconnectArmed : copy.sync.actions.disconnect}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
