import { useState } from "react";
import type { Cabinet, Library, Tag } from "@/domain/model";
import { summarizeCabinet } from "@/domain/transfer/cabinetSummary";
import type { Copy } from "@/i18n/copy";
import { useCopy } from "@/i18n/I18nContext";
import { format } from "@/i18n/format";
import type { AnswerInput, SyncQuestion } from "@/sync/engine";
import { Button } from "@/components/primitives/Button";
import { CabinetCounts } from "./CabinetCounts";
import { FormActions, FormModal } from "./FormModal";
import { Field } from "./fields/Field";

export interface SyncAnswerModalProps {
  question: SyncQuestion;
  library: Library;
  tags: readonly Tag[];
  onAnswer: (input: AnswerInput) => void;
  onCancel: () => void;
}

function wordsFor(question: SyncQuestion, copy: Copy) {
  if (question.kind === "adopt") return copy.sync.adopt;
  return question.kind === "conflict" ? copy.sync.conflict : copy.sync.reconcile;
}

function countsOf(cabinet: Cabinet) {
  return summarizeCabinet(cabinet.library, cabinet.tags);
}

export function SyncAnswerModal({
  question,
  library,
  tags,
  onAnswer,
  onCancel,
}: SyncAnswerModalProps) {
  const copy = useCopy();
  const words = wordsFor(question, copy);
  const [label, setLabel] = useState("");

  const adopting = question.kind === "adopt";
  const keepBoth = (): void => onAnswer({ answer: "keep-both", label });

  return (
    <FormModal size="md" heading={words.heading} onClose={onCancel}>
      <p className="cab-hint">{format(words.question, { name: question.label })}</p>

      <Field label={copy.sync.thisBrowser}>
        <div className="cab-block">
          <CabinetCounts summary={summarizeCabinet(library, tags)} />
        </div>
      </Field>

      <Field label={question.label}>
        <div className="cab-block">
          <CabinetCounts summary={countsOf(question.remote)} />
        </div>
      </Field>

      {adopting ? (
        <Field label={copy.sync.adopt.labelPrompt}>
          <input
            type="text"
            aria-label={copy.sync.adopt.labelPrompt}
            value={label}
            placeholder={copy.sync.download.label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </Field>
      ) : null}

      <FormActions>
        <Button variant="primary" icon="check" onClick={keepBoth}>
          {words.keepBoth}
        </Button>
        <Button variant="ghost" onClick={() => onAnswer({ answer: "keep-mine", label })}>
          {words.keepMine}
        </Button>
        {adopting ? null : (
          <Button variant="danger" onClick={() => onAnswer({ answer: "keep-theirs", label })}>
            {copy.sync.reconcile.keepTheirs}
          </Button>
        )}
      </FormActions>
    </FormModal>
  );
}
