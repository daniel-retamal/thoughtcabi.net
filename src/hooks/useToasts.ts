import { useCallback, useEffect, useRef, useState } from "react";
import { createId } from "@/domain/ids";

export type ToastActionKind = "view" | "undo";

export interface ToastAction {
  kind: ToastActionKind;
  run: () => void;
}

export interface Toast {
  id: string;
  verb: string;
  subject: string;
  action: ToastAction;
}

export interface ToastInput {
  verb?: string;
  subject: string;
  action: ToastAction;
}

const LIFETIME_MS: Record<ToastActionKind, number> = {
  view: 3600,
  undo: 8000,
};

function lastUndo(toasts: readonly Toast[]): (() => void) | null {
  for (let index = toasts.length - 1; index >= 0; index -= 1) {
    const toast = toasts[index];
    if (toast?.action.kind === "undo") return toast.action.run;
  }
  return null;
}

export function useToasts(): {
  toasts: Toast[];
  push: (input: ToastInput) => void;
  undoable: (() => void) | null;
} {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = createId("t");
      const toast: Toast = {
        id,
        verb: input.verb ?? "Saved to",
        subject: input.subject,
        action: {
          kind: input.action.kind,
          run: () => {
            dismiss(id);
            input.action.run();
          },
        },
      };

      setToasts((current) => [...current, toast]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), LIFETIME_MS[toast.action.kind]),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return { toasts, push, undoable: lastUndo(toasts) };
}
