import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { budgetLines, DEFAULT_LINE_BUDGET } from "@/lib/lineBudget";

export interface FittedLines {
  containerRef: RefObject<HTMLDivElement>;
  titleRef: RefObject<HTMLDivElement>;
  descriptionRef: RefObject<HTMLDivElement>;
  titleLines: number;
  descriptionLines: number;
}

function linesNeededBy(element: HTMLElement | null, lineHeight: number): number {
  if (!element) return 0;
  return Math.max(1, Math.round(element.scrollHeight / lineHeight));
}

export function useFittedLines(lineHeight: number): FittedLines {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [titleLines, setTitleLines] = useState(DEFAULT_LINE_BUDGET.title);
  const [descriptionLines, setDescriptionLines] = useState(DEFAULT_LINE_BUDGET.description);

  const measure = useCallback((): void => {
    const container = containerRef.current;
    const title = titleRef.current;
    if (!container || !title) return;

    const style = getComputedStyle(container);
    const children = [...container.children];
    const gaps = (parseFloat(style.rowGap) || 0) * Math.max(children.length - 1, 0);
    const taken = children
      .filter((child) => child !== title && child !== descriptionRef.current)
      .reduce((total, child) => total + child.getBoundingClientRect().height, 0);

    const free =
      container.clientHeight -
      parseFloat(style.paddingTop) -
      parseFloat(style.paddingBottom) -
      gaps -
      taken;

    if (!Number.isFinite(free)) return;

    const budget = budgetLines({
      available: Math.floor(free / lineHeight),
      title: linesNeededBy(title, lineHeight),
      description: linesNeededBy(descriptionRef.current, lineHeight),
    });

    setTitleLines(budget.title);
    setDescriptionLines(budget.description);
  }, [lineHeight]);

  useLayoutEffect(measure);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  return { containerRef, titleRef, descriptionRef, titleLines, descriptionLines };
}
