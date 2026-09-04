import type { RefObject } from "react";
import { useCopy } from "@/i18n/I18nContext";
import type { PillState } from "@/state/useRemoteSync";
import { Icon } from "@/components/primitives/Icon";
import { needsAHand, providerFace } from "./providerFace";

export interface SyncPillProps {
  state: Exclude<PillState, "off">;
  provider: string;
  title: string;
  open: boolean;
  buttonRef: RefObject<HTMLButtonElement>;
  onClick: () => void;
}

export function SyncPill({ state, provider, title, open, buttonRef, onClick }: SyncPillProps) {
  const copy = useCopy();

  return (
    <button
      ref={buttonRef}
      type="button"
      className={
        open ? `iconbtn active sync-pill sync-${state}` : `iconbtn sync-pill sync-${state}`
      }
      title={title}
      aria-label={title}
      aria-expanded={open}
      onClick={onClick}
    >
      <Icon name={providerFace(provider, copy).icon} />
      {state === "synced" ? null : (
        <span className={needsAHand(state) ? "sync-dot danger" : "sync-dot"} aria-hidden="true" />
      )}
    </button>
  );
}
