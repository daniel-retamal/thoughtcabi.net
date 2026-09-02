import { useState } from "react";
import { repoLabel, repoTargetFrom } from "@/domain/sync/github";
import type { ProviderId } from "@/domain/sync/types";
import { useCopy } from "@/i18n/I18nContext";
import { format } from "@/i18n/format";
import type { ConnectProblem, ConnectResult } from "@/sync/types";
import { Button } from "@/components/primitives/Button";
import { FormActions } from "@/components/modals/FormModal";
import { Field } from "@/components/modals/fields/Field";
import { connectFieldsFor } from "./connectFields";

export interface ConnectFormProps {
  provider: ProviderId;
  onConnect: (fields: Record<string, string>) => Promise<ConnectResult>;
  onBack: () => void;
}

export function ConnectForm({ provider, onConnect, onBack }: ConnectFormProps) {
  const copy = useCopy();
  const [values, setValues] = useState<Record<string, string>>({});
  const [refused, setRefused] = useState<ConnectProblem | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const fields = connectFieldsFor(provider, copy);
  const target = repoTargetFrom(values);
  const repo = target?.repo ?? "";
  const guarded = refused === "public";
  const ready = guarded ? confirmation.trim() === repo : true;

  const set = (name: string, value: string): void => {
    setValues((current) => ({ ...current, [name]: value }));
    setRefused(null);
    setConfirmation("");
  };

  const submit = (): void => {
    if (busy || !ready) return;
    setBusy(true);

    void onConnect(guarded ? { ...values, confirm: confirmation.trim() } : values)
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

      {refused && !guarded ? (
        <p className="cab-problem" role="alert">
          {copy.sync.refused[refused === "cancelled" ? "failed" : refused]}
        </p>
      ) : null}

      {guarded ? (
        <>
          <p className="cab-problem" role="alert">
            {format(copy.sync.publicRepo.warning, { name: target ? repoLabel(target) : repo })}
          </p>
          <Field label={format(copy.sync.publicRepo.typeName, { name: repo })}>
            <input
              type="text"
              className="f-input"
              aria-label={format(copy.sync.publicRepo.typeName, { name: repo })}
              autoComplete="off"
              spellCheck={false}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </Field>
        </>
      ) : null}

      <FormActions>
        <Button
          variant={guarded ? "danger" : "primary"}
          icon={guarded ? undefined : "check"}
          disabled={busy || !ready}
          onClick={submit}
        >
          {busy
            ? copy.sync.fields.connecting
            : guarded
              ? copy.sync.publicRepo.confirm
              : copy.sync.fields.connect}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          {copy.actions.back}
        </Button>
      </FormActions>
    </>
  );
}
