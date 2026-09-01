import type { PillState } from "@/state/useRemoteSync";
import { useCopy } from "@/i18n/I18nContext";
import { format } from "@/i18n/format";
import { relativeTime } from "@/lib/relativeTime";
import { Icon } from "@/components/primitives/Icon";
import { providerFace } from "./providerFace";

export interface SyncPillProps {
  state: PillState;
  provider: string;
  label: string;
  lastSyncedAt: number | null;
  onClick: () => void;
}

const DANGEROUS = new Set<PillState>(["conflict", "blocked"]);

export function SyncPill({ state, provider, label, lastSyncedAt, onClick }: SyncPillProps) {
  const copy = useCopy();
  if (state === "off") return null;

  const name = label || providerFace(provider, copy).label;
  const said = format(copy.sync.states[state], { name });
  const when =
    state === "synced" && lastSyncedAt !== null
      ? format(copy.sync.lastSynced, { when: relativeTime(lastSyncedAt, copy.time) })
      : null;
  const title = when ? `${said}, ${when}` : said;

  return (
    <button
      type="button"
      className={`iconbtn sync-pill sync-${state}`}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      <Icon name={providerFace(provider, copy).icon} />
      {state === "synced" ? null : (
        <span
          className={DANGEROUS.has(state) ? "sync-dot danger" : "sync-dot"}
          aria-hidden="true"
        />
      )}
    </button>
  );
}
