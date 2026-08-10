export interface PrimerFact {
  term: string;
  text: string;
}

export interface EmptyPrimerProps {
  facts: readonly PrimerFact[];
}

export function EmptyPrimer({ facts }: EmptyPrimerProps) {
  return (
    <div className="es-primer">
      {facts.map((fact) => (
        <div key={fact.term}>
          <b>{fact.term}</b>
          {fact.text}
        </div>
      ))}
    </div>
  );
}
