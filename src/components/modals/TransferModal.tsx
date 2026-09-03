import { useState } from "react";
import type { Cabinet, Library, Tag } from "@/domain/model";
import { summarizeCabinet } from "@/domain/transfer/cabinetSummary";
import { readTextFile } from "@/lib/files";
import { relativeTime } from "@/lib/relativeTime";
import { useCopy } from "@/i18n/I18nContext";
import { format } from "@/i18n/format";
import { readCabinetFile } from "@/storage/cabinetFile";
import { cabinetNames } from "@/storage/names";
import { Button } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { DestinationRow } from "@/components/sync/DestinationRow";
import { DownloadRow } from "@/components/sync/DownloadRow";
import type { StagedCabinet, SyncSurface } from "@/components/sync/surface";
import { CabinetCounts } from "./CabinetCounts";
import { FormActions, FormModal } from "./FormModal";
import { Field } from "./fields/Field";

export type ImportMode = "merge" | "replace";

export interface TransferModalProps {
  library: Library;
  tags: readonly Tag[];
  sync: SyncSurface;
  onExport: () => void;
  onImport: (cabinet: Cabinet, mode: ImportMode) => void;
  onCancel: () => void;
}

export function TransferModal({
  library,
  tags,
  sync,
  onExport,
  onImport,
  onCancel,
}: TransferModalProps) {
  const copy = useCopy();
  const [chosen, setChosen] = useState<StagedCabinet | null>(null);
  const staged = chosen ?? sync.staged;

  const read = staged?.read ?? null;
  const incoming = read?.ok ? read.cabinet : null;
  const exportedAt = read?.ok ? read.exportedAt : null;
  const problem = read && !read.ok ? read.problem : null;

  const take = (file: File | null | undefined): void => {
    if (!file) return;
    readTextFile(file).then(
      (text) => setChosen({ name: file.name, read: readCabinetFile(text, cabinetNames(copy)) }),
      () => setChosen({ name: file.name, read: { ok: false, problem: "unreadable" } }),
    );
  };

  return (
    <FormModal size="md" heading={copy.sync.heading} onClose={onCancel}>
      <div className="cab-block">
        <CabinetCounts summary={summarizeCabinet(library, tags)} />
      </div>

      <Field label={copy.sync.places}>
        <div className="places">
          {sync.destinations.map((view) => (
            <DestinationRow
              key={view.destination.id}
              view={view}
              onResume={() => sync.onResume(view.destination.id)}
              onRestore={() => sync.onRestore(view.destination.id)}
              onMakeHome={() => sync.onMakeHome(view.destination.id)}
              onCadence={(cadence) => sync.onCadence(view.destination.id, cadence)}
              onDisconnect={() => sync.onDisconnect(view.destination.id)}
            />
          ))}

          <DownloadRow onDownload={onExport} />

          <button type="button" className="place-add" onClick={sync.onAddPlace}>
            <Icon name="plus" />
            {copy.sync.addPlace}
          </button>
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
                onClick={() => setChosen(null)}
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
