import { useEffect, useState } from "react";
import { useCopy } from "@/i18n/I18nContext";

const LATE_MS = 4000;

export function PendingFrame() {
  const copy = useCopy();
  const [late, setLate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLate(true), LATE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="cover holding">
      {late ? <span className="late">{copy.card.stillFetching}</span> : null}
    </div>
  );
}
