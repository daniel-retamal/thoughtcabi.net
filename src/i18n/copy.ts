import type { en } from "./en";

export type Copy = typeof en;

export type CategoryLabels = Copy["categories"];
export type TimeCopy = Copy["time"];
export type CountForms = Copy["counts"];
export type FallbackNames = Pick<Copy["fallback"], "untitledFolder" | "untitledShelf">;
