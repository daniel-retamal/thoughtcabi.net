import { useState, type KeyboardEvent } from "react";
import type { IconName } from "@/icons/names";
import { useArmed } from "@/hooks/useArmed";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import { pluralize } from "@/lib/text";
import { Button } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { FormActions, FormModal } from "./FormModal";
import { Field } from "./fields/Field";
import { IconPicker } from "./fields/IconPicker";

const LAST_SHELF_REASON = "Your cabinet keeps at least one shelf. Rename this one instead.";

export interface ShelfEditorModalProps {
  mode: "new" | "edit";
  initialName: string;
  initialIcon: IconName;
  canDelete: boolean;
  saveCount: number;
  onConfirm: (name: string, icon: IconName) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function ShelfEditorModal({
  mode,
  initialName,
  initialIcon,
  canDelete,
  saveCount,
  onConfirm,
  onDelete,
  onCancel,
}: ShelfEditorModalProps) {
  const isEditing = mode === "edit";
  const nameRef = useAutoFocus<HTMLInputElement>();
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState<IconName>(initialIcon);
  const confirm = useArmed();

  const submit = (): void => {
    if (name.trim()) onConfirm(name.trim(), icon);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter") submit();
  };

  const armedLabel = saveCount > 0 ? `Delete ${pluralize(saveCount, "save")}?` : "Delete shelf?";

  return (
    <FormModal
      size="sm"
      kind={isEditing ? "Edit shelf" : "New shelf"}
      heading={isEditing ? "Rename & restyle" : "Name your shelf"}
      onClose={confirm.armed ? confirm.disarm : onCancel}
    >
      <Field label="Name">
        <div className="f-url-wrap">
          <Icon name={icon} />
          <input
            ref={nameRef}
            className="f-name"
            value={name}
            placeholder="e.g. Inspiration"
            onChange={(event) => {
              confirm.disarm();
              setName(event.target.value);
            }}
            onKeyDown={onKeyDown}
          />
        </div>
      </Field>

      <Field label="Icon">
        <IconPicker
          value={icon}
          onChange={(next) => {
            confirm.disarm();
            setIcon(next);
          }}
        />
      </Field>

      <FormActions>
        <Button variant="primary" icon="check" disabled={!name.trim()} onClick={submit}>
          {isEditing ? "Save" : "Create"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (confirm.armed) confirm.disarm();
            else onCancel();
          }}
        >
          Cancel
        </Button>
        {isEditing ? (
          <Button
            variant="danger"
            className={confirm.armed ? "armed" : undefined}
            icon="trash-2"
            disabled={!canDelete}
            onClick={() => (confirm.armed ? onDelete() : confirm.arm())}
          >
            {confirm.armed ? armedLabel : "Delete"}
          </Button>
        ) : null}
      </FormActions>

      {isEditing && !canDelete ? <p className="action-note">{LAST_SHELF_REASON}</p> : null}
    </FormModal>
  );
}
