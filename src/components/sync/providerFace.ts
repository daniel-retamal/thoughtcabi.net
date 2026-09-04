import { PROVIDER_IDS, type ProviderId } from "@/domain/sync/types";
import type { IconName } from "@/icons/names";
import type { Copy } from "@/i18n/copy";
import type { PillState } from "@/state/useRemoteSync";

export interface ProviderFace {
  icon: IconName;
  label: string;
  sub: string;
}

const ICONS: Readonly<Record<ProviderId, IconName>> = {
  folder: "folder",
  github: "github",
  drive: "cloud",
  webdav: "server",
  s3: "server",
};

export const CONNECT_TILES: readonly ProviderId[] = ["folder", "github", "drive", "webdav"];

export function isProviderId(value: string): value is ProviderId {
  return PROVIDER_IDS.some((id) => id === value);
}

export function needsAHand(state: PillState): boolean {
  return state === "conflict" || state === "blocked";
}

export function providerFace(provider: string, copy: Copy): ProviderFace {
  const connect = copy.sync.connect;

  switch (provider) {
    case "folder":
      return { icon: ICONS.folder, label: connect.folder, sub: connect.folderSub };
    case "github":
      return { icon: ICONS.github, label: connect.github, sub: connect.githubSub };
    case "drive":
      return { icon: ICONS.drive, label: connect.drive, sub: connect.driveSub };
    case "webdav":
      return { icon: ICONS.webdav, label: connect.webdav, sub: connect.webdavSub };
    case "s3":
      return { icon: ICONS.s3, label: connect.webdav, sub: connect.webdavSub };
    default:
      return { icon: "globe", label: provider, sub: "" };
  }
}
