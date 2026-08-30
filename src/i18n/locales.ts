import type { Locale } from "@/domain/model";
import { en } from "./en";
import { es } from "./es";
import type { Copy } from "./copy";

export const DICTIONARIES: Readonly<Record<Locale, Copy>> = { en, es };

export const LOCALE_ENDONYMS: Readonly<Record<Locale, string>> = {
  en: "English",
  es: "Español",
};

export function dictionaryFor(locale: Locale): Copy {
  return DICTIONARIES[locale];
}
