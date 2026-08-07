import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeId } from "@/domain/model";

export function useTransientIds(durationMs: number): {
  has: (id: NodeId) => boolean;
  mark: (id: NodeId) => void;
} {
  const [ids, setIds] = useState<ReadonlySet<NodeId>>(() => new Set());
  const timers = useRef(new Map<NodeId, ReturnType<typeof setTimeout>>());

  const mark = useCallback(
    (id: NodeId) => {
      setIds((current) => new Set(current).add(id));

      const existing = timers.current.get(id);
      if (existing) clearTimeout(existing);

      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          setIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });
        }, durationMs),
      );
    },
    [durationMs],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const has = useCallback((id: NodeId) => ids.has(id), [ids]);

  return { has, mark };
}
