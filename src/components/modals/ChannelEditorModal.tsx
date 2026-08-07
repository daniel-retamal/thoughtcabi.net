import { useState, type KeyboardEvent } from "react";
import type { IconName } from "@/icons/names";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import { Button } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { FormActions, FormModal } from "./FormModal";
import { Field } from "./fields/Field";
import { IconPicker } from "./fields/IconPicker";

export interface ChannelEditorModalProps {
  mode: "new" | "edit";
  initialName: string;
  initialIcon: IconName;
  onConfirm: (name: string, icon: IconName) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function ChannelEditorModal({
  mode,
  initialName,
  initialIcon,
  onConfirm,
  onDelete,
  onCancel,
}: ChannelEditorModalProps) {
  const isEditing = mode === "edit";
  const nameRef = useAutoFocus<HTMLInputElement>();
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState<IconName>(initialIcon);

  const submit = (): void => {
    if (name.trim()) onConfirm(name.trim(), icon);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter") submit();
  };

  return (
    <FormModal
      size="sm"
      kind={isEditing ? "Edit channel" : "New channel"}
      heading={isEditing ? "Rename & restyle" : "Name your channel"}
      onClose={onCancel}
    >
      <Field label="Name">
        <div className="f-url-wrap">
          <Icon name={icon} />
          <input
            ref={nameRef}
            className="f-name"
            value={name}
            placeholder="e.g. Inspiration"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      </Field>

      <Field label="Icon">
        <IconPicker value={icon} onChange={setIcon} />
      </Field>

      <FormActions>
        <Button variant="primary" icon="check" disabled={!name.trim()} onClick={submit}>
          {isEditing ? "Save" : "Create"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {isEditing ? (
          <Button variant="danger" icon="trash-2" onClick={onDelete}>
            Delete
          </Button>
        ) : null}
      </FormActions>
    </FormModal>
  );
}
