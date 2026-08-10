import type { ReactNode } from "react";

export interface EmptyQuietProps {
  title: string;
  text: ReactNode;
  onClearSearch?: () => void;
}

export function EmptyQuiet({ title, text, onClearSearch }: EmptyQuietProps) {
  return (
    <div className="es-quiet">
      <h3>{title}</h3>
      <p>{text}</p>
      {onClearSearch ? (
        <button type="button" className="es-clear" onClick={onClearSearch}>
          Clear search
        </button>
      ) : null}
    </div>
  );
}
