import type { ProviderId } from "@/domain/sync/types";
import type { Copy } from "@/i18n/copy";
import type { ConnectProblem } from "@/sync/types";

export function refusalFor(
  provider: ProviderId,
  problem: ConnectProblem,
  copy: Copy,
): string | null {
  const refused = copy.sync.refused;
  if (problem === "cancelled") return null;
  if (problem === "failed" || problem === "cors" || problem === "mixedContent") {
    return refused[problem];
  }

  if (provider === "github") return refused.github[problem];
  if (provider === "webdav") return refused.webdav[problem];
  return refused.failed;
}
