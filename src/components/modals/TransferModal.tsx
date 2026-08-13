import { useState } from "react";
import type { Cabinet, Library, Tag } from "@/domain/model";
import { summarizeCabinet } from "@/domain/transfer/cabinetSummary";
import { readTextFile } from "@/lib/files";
import { relativeTime } from "@/lib/relativeTime";
import {
  readCabinetFile,
  type CabinetFileProblem,
  type CabinetFileRead,
} from "@/storage/cabinetFile";
import { Button } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { CabinetCounts } from "./CabinetCounts";
import { FormActions, FormModal } from "./FormModal";
import { Field } from "./fields/Field";

export type ImportMode = "merge" | "replace";

const PROBLEMS: Readonly<Record<CabinetFileProblem, string>> = {
  unreadable: "This file is not JSON, so there is nothing to read.",
  newer: "This file comes from a newer version of thoughtcabinet.",
  empty: "This file has no shelves in it.",
};

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
  const [staged, setStaged] = useState<StagedFile | null>(null);

  const read = staged?.read ?? null;
  const incoming = read?.ok ? read.cabinet : null;
  const exportedAt = read?.ok ? read.exportedAt : null;
  const problem = read && !read.ok ? read.problem : null;

  const take = (file: File | null | undefined): void => {
    if (!file) return;
    readTextFile(file).then(
      (text) => setStaged({ name: file.name, read: readCabinetFile(text) }),
      () => setStaged({ name: file.name, read: { ok: false, problem: "unreadable" } }),
    );
  };

  return (
    <FormModal size="md" heading="Export & import" onClose={onCancel}>
      <Field label="Export">
        <div className="cab-block">
          <CabinetCounts summary={summarizeCabinet(library, tags)} />
          <div className="modal-actions cab-actions">
            <Button variant="primary" icon="download" onClick={onExport}>
              Download
            </Button>
          </div>
        </div>
      </Field>

      <Field label="Import">
        {staged ? (
          <div className="cab-block">
            <div className="cab-file">
              <Icon name="file-text" />
              <span className="cab-file-name">{staged.name}</span>
              {exportedAt ? (
                <span className="cab-file-when">exported {relativeTime(exportedAt)}</span>
              ) : null}
              <button
                type="button"
                className="cab-file-clear"
                title="Choose another file"
                aria-label="Choose another file"
                onClick={() => setStaged(null)}
              >
                <Icon name="x" />
              </button>
            </div>

            {incoming ? (
              <>
                <CabinetCounts summary={summarizeCabinet(incoming.library, incoming.tags)} />
                <p className="cab-hint">
                  Merging keeps what you have, a shelf whose name you already use pours its cards
                  into yours. Replacing discards this cabinet for that one.
                </p>
                <div className="modal-actions cab-actions">
                  <Button
                    variant="primary"
                    icon="check"
                    onClick={() => onImport(incoming, "merge")}
                  >
                    Merge
                  </Button>
                  <Button variant="danger" onClick={() => onImport(incoming, "replace")}>
                    Replace
                  </Button>
                </div>
              </>
            ) : null}

            {problem ? (
              <p className="cab-problem" role="alert">
                <Icon name="triangle-alert" />
                {PROBLEMS[problem]}
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
            <span>Drop a cabinet file, or click to choose</span>
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
          Close
        </Button>
      </FormActions>
    </FormModal>
  );
}
