import type { Cadence, ProviderId } from "@/domain/sync/types";
import type { DestinationView } from "@/state/useRemoteSync";
import type { CabinetFileRead } from "@/storage/cabinetFile";
import type { ConnectResult, RemoteProvider } from "@/sync/types";

export interface StagedCabinet {
  name: string;
  read: CabinetFileRead;
}

export interface SyncSurface {
  providers: readonly RemoteProvider[];
  destinations: readonly DestinationView[];
  staged: StagedCabinet | null;
  onAddPlace: () => void;
  onPlaces: () => void;
  onConnect: (provider: ProviderId, fields: Record<string, string>) => Promise<ConnectResult>;
  onResume: (id: string) => void;
  onRestore: (id: string) => void;
  onMakeHome: (id: string) => void;
  onCadence: (id: string, cadence: Cadence) => void;
  onDisconnect: (id: string) => void;
}
