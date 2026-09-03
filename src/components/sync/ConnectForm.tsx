import { useState } from "react";
import type { ProviderId } from "@/domain/sync/types";
import { useCopy } from "@/i18n/I18nContext";
import type { ConnectProblem, ConnectResult } from "@/sync/types";
import { Button } from "@/components/primitives/Button";
import { FormActions } from "@/components/modals/FormModal";
import { Field } from "@/components/modals/fields/Field";
import { connectFieldsFor } from "./connectFields";
import { refusalFor } from "./refusals";

export interface ConnectFormProps {
  provider: ProviderId;
  onConnect: (fields: Record<string, string>) => Promise<ConnectResult>;
  onBack: () => void;
}

export function ConnectForm({ provider, onConnect, onBack }: ConnectFormProps) {
  const copy = useCopy();
  const [values, setValues] = useState<Record<string, string>>({});
  const [refused, setRefused] = useState<ConnectProblem | null>(null);
  const [busy, setBusy] = useState(false);

  const fields = connectFieldsFor(provider, copy);
  const refusal = refused === null ? null : refusalFor(provider, refused, copy);

  const set = (name: string, value: string): void => {
    setValues((current) => ({ ...current, [name]: value }));
    setRefused(null);
  };

  const submit = (): void => {
    if (busy) return;
    setBusy(true);

    void onConnect(values)
      .then((result) => {
        if (!result.ok) setRefused(result.reason);
      })
      .finally(() => setBusy(false));
  };

  return (
    <>
      {fields.map((field) => (
        <Field key={field.name} label={field.label} hint={field.hint}>
          <input
            type={field.secret ? "password" : "text"}
            className="f-input"
            aria-label={field.label}
            autoComplete="off"
            spellCheck={false}
            placeholder={field.placeholder}
            value={values[field.name] ?? ""}
            onChange={(event) => set(field.name, event.target.value)}
          />
          {field.link ? (
            <a className="field-link" href={field.link} target="_blank" rel="noreferrer">
              {field.linkLabel}
            </a>
          ) : null}
        </Field>
      ))}

      {refusal ? (
        <p className="cab-problem" role="alert">
          {refusal}
        </p>
      ) : null}

      <FormActions>
        <Button variant="primary" icon="check" disabled={busy} onClick={submit}>
          {busy ? copy.sync.fields.connecting : copy.sync.fields.connect}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          {copy.actions.back}
        </Button>
      </FormActions>
    </>
  );
}
