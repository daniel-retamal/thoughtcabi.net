import { useState, type KeyboardEvent } from "react";
import type { IconName } from "@/icons/names";
import { useArmed } from "@/hooks/useArmed";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import { useCopy } from "@/i18n/I18nContext";
import { countedTemplate } from "@/i18n/format";
import { Button } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { FormActions, FormModal } from "./FormModal";
import { Field } from "./fields/Field";
import { IconPicker } from "./fields/IconPicker";

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
  const copy = useCopy();
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

  const armedLabel =
    saveCount > 0
      ? countedTemplate(copy.shelfEditor.deleteArmed, saveCount)
      : copy.shelfEditor.deleteEmpty;

  return (
    <FormModal
      size="sm"
      kind={isEditing ? copy.shelfEditor.kindEdit : copy.shelfEditor.kindNew}
      heading={isEditing ? copy.shelfEditor.headingEdit : copy.shelfEditor.headingNew}
      onClose={confirm.armed ? confirm.disarm : onCancel}
    >
      <Field label={copy.shelfEditor.name}>
        <div className="f-url-wrap">
          <Icon name={icon} />
          <input
            ref={nameRef}
            className="f-name"
            value={name}
            placeholder={copy.shelfEditor.namePlaceholder}
            onChange={(event) => {
              confirm.disarm();
              setName(event.target.value);
            }}
            onKeyDown={onKeyDown}
          />
        </div>
      </Field>

      <Field label={copy.shelfEditor.icon}>
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
          {isEditing ? copy.actions.save : copy.actions.create}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (confirm.armed) confirm.disarm();
            else onCancel();
          }}
        >
          {copy.actions.cancel}
        </Button>
        {isEditing ? (
          <Button
            variant="danger"
            className={confirm.armed ? "armed" : undefined}
            icon="trash-2"
            disabled={!canDelete}
            onClick={() => (confirm.armed ? onDelete() : confirm.arm())}
          >
            {confirm.armed ? armedLabel : copy.actions.delete}
          </Button>
        ) : null}
      </FormActions>

      {isEditing && !canDelete ? <p className="action-note">{copy.shelfEditor.lastShelf}</p> : null}
    </FormModal>
  );
}
