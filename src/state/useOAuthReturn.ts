import { useEffect, useRef } from "react";
import type { ProviderId } from "@/domain/sync/types";
import { useLatest } from "@/hooks/useLatest";
import { takeAuthReturn, type RedirectDeps } from "@/sync/auth/oauth";
import type { ConnectProblem, ConnectResult } from "@/sync/types";

export interface OAuthReturnOptions {
  connect: (provider: ProviderId, fields: Record<string, string>) => Promise<ConnectResult>;
  onRefused: (provider: ProviderId, problem: ConnectProblem) => void;
  deps?: RedirectDeps;
}

export function useOAuthReturn(options: OAuthReturnOptions): void {
  const latest = useLatest(options);
  const taken = useRef(false);

  useEffect(() => {
    if (taken.current) return;
    taken.current = true;

    const arrival = takeAuthReturn(latest.current.deps);
    if (!arrival) return;

    void latest.current.connect(arrival.provider, { ...arrival.fields }).then((result) => {
      if (!result.ok && result.reason !== "cancelled") {
        latest.current.onRefused(arrival.provider, result.reason);
      }
    });
  }, [latest]);
}
