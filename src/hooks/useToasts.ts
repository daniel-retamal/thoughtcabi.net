import { useCallback, useEffect, useRef, useState } from "react";
import { createId } from "@/domain/ids";
import type { LibraryLocation, Note } from "@/domain/model";

const TOAST_LIFETIME_MS = 3600;

export interface Toast {
  id: string;
  verb: string;
  folder: string;
  location: LibraryLocation;
  note: Note | null;
}

export interface ToastInput {
  verb?: string;
  folder: string;
  location: LibraryLocation;
  note?: Note | null;
}

export function useToasts(): {
  toasts: Toast[];
  push: (input: ToastInput) => void;
} {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const push = useCallback((input: ToastInput) => {
    const toast: Toast = {
      id: createId("t"),
      verb: input.verb ?? "Saved to",
      folder: input.folder,
      location: input.location,
      note: input.note ?? null,
    };

    setToasts((current) => [...current, toast]);

    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setToasts((current) => current.filter((entry) => entry.id !== toast.id));
    }, TOAST_LIFETIME_MS);

    timers.current.add(timer);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return { toasts, push };
}
