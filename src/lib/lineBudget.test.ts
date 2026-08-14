import { describe, expect, it } from "vitest";
import { budgetLines } from "./lineBudget";

describe("budgetLines", () => {
  it("gives the title everything but the two lines the description is owed", () => {
    expect(budgetLines({ available: 11, title: 12, description: 9 })).toEqual({
      title: 9,
      description: 2,
    });
  });

  it("reserves nothing for a description that is not there", () => {
    expect(budgetLines({ available: 4, title: 5, description: 0 })).toEqual({
      title: 4,
      description: 0,
    });
  });

  it("holds back only the lines a short description can actually use", () => {
    expect(budgetLines({ available: 4, title: 3, description: 1 })).toEqual({
      title: 3,
      description: 1,
    });
  });

  it("spends the height a wide picture gave back on the title that needs it", () => {
    const matted = budgetLines({ available: 4, title: 3, description: 1 });
    const fitted = budgetLines({ available: 5, title: 3, description: 1 });

    expect(matted.title).toBe(3);
    expect(fitted.title).toBe(4);
  });

  it("hands the description whatever a short title left behind", () => {
    expect(budgetLines({ available: 6, title: 1, description: 9 })).toEqual({
      title: 4,
      description: 5,
    });
  });

  it("never fits more lines than the card has room for", () => {
    for (let available = 4; available <= 12; available += 1) {
      for (let title = 1; title <= 14; title += 1) {
        for (let description = 0; description <= 14; description += 1) {
          const budget = budgetLines({ available, title, description });
          const shown = Math.min(title, budget.title) + Math.min(description, budget.description);

          expect(shown, `${available}/${title}/${description}`).toBeLessThanOrEqual(available);
        }
      }
    }
  });

  it("keeps a floor of two title lines when the card is barely tall enough", () => {
    expect(budgetLines({ available: 2, title: 6, description: 6 }).title).toBe(2);
  });
});
