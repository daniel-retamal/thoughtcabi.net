import { LOCALES, type Locale } from "@/domain/model";
import { useCopy } from "@/i18n/I18nContext";
import { LOCALE_ENDONYMS } from "@/i18n/locales";
import { Icon } from "@/components/primitives/Icon";
import { ModKey } from "@/components/primitives/ModKey";
import { EmptyPrimer, type PrimerFact } from "./EmptyPrimer";

export interface EmptyPlateProps {
  title: string;
  text: string;
  primer: readonly PrimerFact[] | null;
  language: Locale;
  onSaveLink: () => void;
  onLanguageChange: (locale: Locale) => void;
}

export function EmptyPlate({
  title,
  text,
  primer,
  language,
  onSaveLink,
  onLanguageChange,
}: EmptyPlateProps) {
  const copy = useCopy();

  return (
    <>
      <div className="es-plate">
        <span className="es-keys">
          <ModKey />
          <kbd>V</kbd>
        </span>
        <h3>{title}</h3>
        <p>{text}</p>
        <button type="button" className="btn-paste" onClick={onSaveLink}>
          <Icon name="plus" /> {copy.actions.saveALink}
        </button>
      </div>
      {primer ? (
        <>
          <EmptyPrimer facts={primer} />
          <div className="es-lang" role="group" aria-label={copy.display.language}>
            <span className="es-lang-label">{copy.display.language}</span>
            {LOCALES.map((locale) => (
              <button
                key={locale}
                type="button"
                className={locale === language ? "es-lang-opt on" : "es-lang-opt"}
                aria-pressed={locale === language}
                onClick={() => onLanguageChange(locale)}
              >
                {LOCALE_ENDONYMS[locale]}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
