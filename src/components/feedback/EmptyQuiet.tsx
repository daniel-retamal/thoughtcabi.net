import type { ReactNode } from "react";
import { useCopy } from "@/i18n/I18nContext";

export interface EmptyQuietProps {
  title: string;
  text: ReactNode;
  onClearSearch?: () => void;
}

export function EmptyQuiet({ title, text, onClearSearch }: EmptyQuietProps) {
  const copy = useCopy();

  return (
    <div className="es-quiet">
      <h3>{title}</h3>
      <p>{text}</p>
      {onClearSearch ? (
        <button type="button" className="es-clear" onClick={onClearSearch}>
          {copy.actions.clearSearch}
        </button>
      ) : null}
    </div>
  );
}
