import type { ReactNode } from "react";
import type { Copy } from "./copy";
import { I18nContext } from "./I18nContext";

export interface I18nProviderProps {
  copy: Copy;
  children: ReactNode;
}

export function I18nProvider({ copy, children }: I18nProviderProps) {
  return <I18nContext.Provider value={copy}>{children}</I18nContext.Provider>;
}
