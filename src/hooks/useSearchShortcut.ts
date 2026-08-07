import { useEffect, type RefObject } from "react";

export function useSearchShortcut(inputRef: RefObject<HTMLInputElement>): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      const input = inputRef.current;
      input?.focus();
      input?.select();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [inputRef]);
}
