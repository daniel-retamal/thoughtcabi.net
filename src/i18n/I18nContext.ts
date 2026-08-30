import { createContext, useContext } from "react";
import { en } from "./en";
import type { Copy } from "./copy";

export const I18nContext = createContext<Copy>(en);

export function useCopy(): Copy {
  return useContext(I18nContext);
}
