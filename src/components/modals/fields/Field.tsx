import type { ReactNode } from "react";

export interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="field">
      <label>
        {label}
        {hint ? <span className="opt">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}
