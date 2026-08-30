import { useState, type KeyboardEvent } from "react";
import type { IconName } from "@/icons/names";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import { useCopy } from "@/i18n/I18nContext";
import { Button } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { FormActions, FormModal } from "./FormModal";

export interface NamePromptModalProps {
  kind: string;
  heading: string;
  placeholder: string;
  icon: IconName;
  initialValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function NamePromptModal({
  kind,
  heading,
  placeholder,
  icon,
  initialValue = "",
  confirmLabel,
  onConfirm,
  onCancel,
}: NamePromptModalProps) {
  const copy = useCopy();
  const inputRef = useAutoFocus<HTMLInputElement>();
  const [value, setValue] = useState(initialValue);

  const submit = (): void => {
    if (value.trim()) onConfirm(value.trim());
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter") submit();
  };

  return (
    <FormModal size="xs" kind={kind} heading={heading} onClose={onCancel}>
      <div className="search-box prompt-input">
        <Icon name={icon} />
        <input
          ref={inputRef}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      <FormActions>
        <Button variant="primary" icon="check" disabled={!value.trim()} onClick={submit}>
          {confirmLabel ?? copy.actions.create}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {copy.actions.cancel}
        </Button>
      </FormActions>
    </FormModal>
  );
}
