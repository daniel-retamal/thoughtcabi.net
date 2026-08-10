import { useCallback, useEffect, useState } from "react";

const DISARM_AFTER_MS = 4000;

export interface Armed {
  armed: boolean;
  arm: () => void;
  disarm: () => void;
}

export function useArmed(): Armed {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), DISARM_AFTER_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const arm = useCallback(() => setArmed(true), []);
  const disarm = useCallback(() => setArmed(false), []);

  return { armed, arm, disarm };
}
