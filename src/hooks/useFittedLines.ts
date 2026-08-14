import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

export interface FittedLines {
  containerRef: RefObject<HTMLDivElement>;
  fillerRef: RefObject<HTMLDivElement>;
  lines: number;
}

export function useFittedLines(lineHeight: number, minimum: number): FittedLines {
  const containerRef = useRef<HTMLDivElement>(null);
  const fillerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState(minimum);

  const measure = useCallback((): void => {
    const container = containerRef.current;
    if (!container) return;

    const style = getComputedStyle(container);
    const children = [...container.children];
    const gaps = (parseFloat(style.rowGap) || 0) * Math.max(children.length - 1, 0);
    const taken = children
      .filter((child) => child !== fillerRef.current)
      .reduce((total, child) => total + child.getBoundingClientRect().height, 0);

    const free =
      container.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom) -
      gaps -
      taken;

    setLines(Math.max(minimum, Math.floor(free / lineHeight)));
  }, [lineHeight, minimum]);

  useLayoutEffect(measure);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  return { containerRef, fillerRef, lines };
}
