export interface LineNeeds {
  available: number;
  title: number;
  description: number;
}

export interface LineBudget {
  title: number;
  description: number;
}

export const MINIMUM_TITLE_LINES = 2;
export const RESERVED_DESCRIPTION_LINES = 2;

export const DEFAULT_LINE_BUDGET: LineBudget = {
  title: MINIMUM_TITLE_LINES,
  description: RESERVED_DESCRIPTION_LINES,
};

export function budgetLines({ available, title, description }: LineNeeds): LineBudget {
  const reserved = Math.min(description, RESERVED_DESCRIPTION_LINES);
  const titleLines = Math.max(MINIMUM_TITLE_LINES, available - reserved);

  return {
    title: titleLines,
    description: Math.max(reserved, available - Math.min(title, titleLines)),
  };
}
