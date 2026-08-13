import { useEffect, useState } from "react";

const LATE_MS = 4000;

export function PendingFrame() {
  const [late, setLate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLate(true), LATE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="cover holding">
      {late ? <span className="late">still fetching</span> : null}
    </div>
  );
}
