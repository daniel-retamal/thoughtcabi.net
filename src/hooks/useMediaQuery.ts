import { useEffect, useState } from "react";

function listFor(query: string): MediaQueryList | null {
  return typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => listFor(query)?.matches ?? false);

  useEffect(() => {
    const list = listFor(query);
    if (!list) return;

    setMatches(list.matches);
    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
