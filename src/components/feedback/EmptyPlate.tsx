import { Icon } from "@/components/primitives/Icon";
import { ModKey } from "@/components/primitives/ModKey";
import { EmptyPrimer, type PrimerFact } from "./EmptyPrimer";

export interface EmptyPlateProps {
  title: string;
  text: string;
  primer: readonly PrimerFact[] | null;
  onSaveLink: () => void;
}

export function EmptyPlate({ title, text, primer, onSaveLink }: EmptyPlateProps) {
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
          <Icon name="plus" /> Save a link
        </button>
      </div>
      {primer ? <EmptyPrimer facts={primer} /> : null}
    </>
  );
}
