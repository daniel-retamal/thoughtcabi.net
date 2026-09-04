import { useState } from "react";
import type { ProviderId } from "@/domain/sync/types";
import { useCopy } from "@/i18n/I18nContext";
import type { ConnectResult, RemoteProvider } from "@/sync/types";
import { providerById } from "@/sync/types";
import { Button } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { ConnectForm } from "@/components/sync/ConnectForm";
import { connectFieldsFor } from "@/components/sync/connectFields";
import { CONNECT_TILES, providerFace } from "@/components/sync/providerFace";
import { FormActions, FormModal } from "./FormModal";

export interface SyncConnectModalProps {
  providers: readonly RemoteProvider[];
  onConnect: (provider: ProviderId, fields: Record<string, string>) => Promise<ConnectResult>;
  onDownload: () => void;
  onBack: (() => void) | null;
  onCancel: () => void;
}

interface Tile {
  id: ProviderId;
  reason: string | null;
}

export function SyncConnectModal({
  providers,
  onConnect,
  onDownload,
  onBack,
  onCancel,
}: SyncConnectModalProps) {
  const copy = useCopy();
  const [asking, setAsking] = useState<ProviderId | null>(null);

  const tiles: Tile[] = CONNECT_TILES.map((id) => {
    const provider = providerById(providers, id);
    if (!provider) return { id, reason: copy.sync.connect.soon };
    const availability = provider.available();
    if (availability.ok) return { id, reason: null };
    return {
      id,
      reason:
        availability.reason === "unconfigured"
          ? copy.sync.connect.needsSetup
          : copy.sync.connect.needsChromium,
    };
  });

  const pick = (id: ProviderId): void => {
    if (connectFieldsFor(id, copy).length > 0) {
      setAsking(id);
      return;
    }
    void onConnect(id, {});
  };

  if (asking) {
    return (
      <FormModal size="md" heading={providerFace(asking, copy).label} onClose={onCancel}>
        <ConnectForm
          provider={asking}
          onConnect={(fields) => onConnect(asking, fields)}
          onBack={() => setAsking(null)}
        />
      </FormModal>
    );
  }

  return (
    <FormModal size="md" heading={copy.sync.connect.heading} onClose={onCancel}>
      <p className="tiles-lead">{copy.sync.connect.keepsItself}</p>

      <div className="tiles">
        {tiles.map((tile) => {
          const face = providerFace(tile.id, copy);
          return (
            <button
              key={tile.id}
              type="button"
              className="tile"
              disabled={tile.reason !== null}
              onClick={() => pick(tile.id)}
            >
              <span className="tile-mark">
                <Icon name={face.icon} />
              </span>
              <span className="tile-name">{face.label}</span>
              <span className="tile-sub">{tile.reason ?? face.sub}</span>
            </button>
          );
        })}

      </div>

      <button type="button" className="tile-aside" onClick={onDownload}>
        <Icon name="download" />
        <span className="tile-aside-name">{copy.sync.connect.file}</span>
        <span className="tile-aside-sub">{copy.sync.connect.fileSub}</span>
      </button>

      <FormActions>
        <Button variant="ghost" onClick={onBack ?? onCancel}>
          {onBack ? copy.actions.back : copy.actions.close}
        </Button>
      </FormActions>
    </FormModal>
  );
}
