import { useCallback, useEffect, useRef, useState } from "react";
import { createId } from "@/domain/ids";

export type ToastActionKind = "view" | "undo";

export type ToastVerb =
  | "savedTo"
  | "deleted"
  | "thumbnailSetOn"
  | "importedInto"
  | "movedTo"
  | "movedFolderTo"
  | "keptTwoVersions"
  | "savedACopy"
  | "couldNotConnect"
  | "couldNotSignIn";

export interface ToastAction {
  kind: ToastActionKind;
  run: () => void;
}

export interface Toast {
  id: string;
  verb: ToastVerb;
  subject: string;
  action: ToastAction | null;
}

export interface ToastInput {
  verb?: ToastVerb;
  subject: string;
  action?: ToastAction;
}

const LIFETIME_MS: Record<ToastActionKind, number> = {
  view: 3600,
  undo: 8000,
};

function lastUndo(toasts: readonly Toast[]): (() => void) | null {
  for (let index = toasts.length - 1; index >= 0; index -= 1) {
    const toast = toasts[index];
    if (toast?.action?.kind === "undo") return toast.action.run;
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
      const asked = input.action;
      const toast: Toast = {
        id,
        verb: input.verb ?? "savedTo",
        subject: input.subject,
        action: asked
          ? {
              kind: asked.kind,
              run: () => {
                dismiss(id);
                asked.run();
              },
            }
          : null,
      };

      setToasts((current) => [...current, toast]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), LIFETIME_MS[asked?.kind ?? "view"]),
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
