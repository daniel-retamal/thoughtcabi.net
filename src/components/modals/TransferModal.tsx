import { useState } from "react";
import type { Cabinet, Library, Tag } from "@/domain/model";
import { summarizeCabinet } from "@/domain/transfer/cabinetSummary";
import { readTextFile } from "@/lib/files";
import { relativeTime } from "@/lib/relativeTime";
import { useCopy } from "@/i18n/I18nContext";
import { format } from "@/i18n/format";
import { readCabinetFile, type CabinetFileRead } from "@/storage/cabinetFile";
import { cabinetNames } from "@/storage/names";
import { Button } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { CabinetCounts } from "./CabinetCounts";
import { FormActions, FormModal } from "./FormModal";
import { Field } from "./fields/Field";

export type ImportMode = "merge" | "replace";

interface StagedFile {
  name: string;
  read: CabinetFileRead;
}

export interface TransferModalProps {
  library: Library;
  tags: readonly Tag[];
  onExport: () => void;
  onImport: (cabinet: Cabinet, mode: ImportMode) => void;
  onCancel: () => void;
}

export function TransferModal({ library, tags, onExport, onImport, onCancel }: TransferModalProps) {
  const copy = useCopy();
  const [staged, setStaged] = useState<StagedFile | null>(null);

  const read = staged?.read ?? null;
  const incoming = read?.ok ? read.cabinet : null;
  const exportedAt = read?.ok ? read.exportedAt : null;
  const problem = read && !read.ok ? read.problem : null;

  const take = (file: File | null | undefined): void => {
    if (!file) return;
    readTextFile(file).then(
      (text) => setStaged({ name: file.name, read: readCabinetFile(text, cabinetNames(copy)) }),
      () => setStaged({ name: file.name, read: { ok: false, problem: "unreadable" } }),
    );
  };

  return (
    <FormModal size="md" heading={copy.transfer.heading} onClose={onCancel}>
      <Field label={copy.transfer.exportLabel}>
        <div className="cab-block">
          <CabinetCounts summary={summarizeCabinet(library, tags)} />
          <div className="modal-actions cab-actions">
            <Button variant="primary" icon="download" onClick={onExport}>
              {copy.actions.download}
            </Button>
          </div>
        </div>
      </Field>

      <Field label={copy.transfer.importLabel}>
        {staged ? (
          <div className="cab-block">
            <div className="cab-file">
              <Icon name="file-text" />
              <span className="cab-file-name">{staged.name}</span>
              {exportedAt ? (
                <span className="cab-file-when">
                  {format(copy.transfer.exported, {
                    when: relativeTime(exportedAt, copy.time),
                  })}
                </span>
              ) : null}
              <button
                type="button"
                className="cab-file-clear"
                title={copy.transfer.chooseAnother}
                aria-label={copy.transfer.chooseAnother}
                onClick={() => setStaged(null)}
              >
                <Icon name="x" />
              </button>
            </div>

            {incoming ? (
              <>
                <CabinetCounts summary={summarizeCabinet(incoming.library, incoming.tags)} />
                <p className="cab-hint">{copy.transfer.hint}</p>
                <div className="modal-actions cab-actions">
                  <Button
                    variant="primary"
                    icon="check"
                    onClick={() => onImport(incoming, "merge")}
                  >
                    {copy.actions.merge}
                  </Button>
                  <Button variant="danger" onClick={() => onImport(incoming, "replace")}>
                    {copy.actions.replace}
                  </Button>
                </div>
              </>
            ) : null}

            {problem ? (
              <p className="cab-problem" role="alert">
                <Icon name="triangle-alert" />
                {copy.transfer[problem]}
              </p>
            ) : null}
          </div>
        ) : (
          <label
            className="cab-drop"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              take(event.dataTransfer.files[0]);
            }}
          >
            <Icon name="upload" />
            <span>{copy.transfer.drop}</span>
            <input
              type="file"
              accept="application/json,.json"
              className="cab-file-input"
              onChange={(event) => {
                take(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </Field>

      <FormActions>
        <Button variant="ghost" onClick={onCancel}>
          {copy.actions.close}
        </Button>
      </FormActions>
    </FormModal>
  );
}
