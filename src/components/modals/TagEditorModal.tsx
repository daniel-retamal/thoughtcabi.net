import { useState, type KeyboardEvent } from "react";
import type { Tag } from "@/domain/model";
import { MAX_TAGS, TAG_PALETTE } from "@/domain/tags/palette";
import { isPaletteFull } from "@/domain/tags/tagLibrary";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import { useCopy } from "@/i18n/I18nContext";
import { format } from "@/i18n/format";
import { Button } from "@/components/primitives/Button";
import { FormActions, FormModal } from "./FormModal";
import { Field } from "./fields/Field";

export interface TagEditorModalProps {
  mode: "new" | "edit";
  initialName: string;
  initialColor: string;
  tags: readonly Tag[];
  onConfirm: (name: string, color: string) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function TagEditorModal({
  mode,
  initialName,
  initialColor,
  tags,
  onConfirm,
  onDelete,
  onCancel,
}: TagEditorModalProps) {
  const copy = useCopy();
  const isEditing = mode === "edit";
  const nameRef = useAutoFocus<HTMLInputElement>();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  const paletteExhausted = !isEditing && isPaletteFull(tags);
  const takenColors = tags.map((tag) => tag.color).filter((taken) => taken !== initialColor);
  const canSubmit = Boolean(name.trim()) && Boolean(color) && !paletteExhausted;

  const submit = (): void => {
    if (canSubmit) onConfirm(name.trim(), color);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter") submit();
  };

  return (
    <FormModal
      size="xs"
      kind={isEditing ? copy.tagEditor.kindEdit : copy.tagEditor.kindNew}
      heading={isEditing ? copy.tagEditor.headingEdit : copy.tagEditor.headingNew}
      onClose={onCancel}
    >
      {paletteExhausted ? (
        <p className="tagmgr-note">{format(copy.tagEditor.paletteFull, { n: MAX_TAGS })}</p>
      ) : null}

      <Field label={copy.tagEditor.name}>
        <div className="f-url-wrap">
          <span className="tag-dot-pre" style={{ background: color || "var(--text-faint)" }} />
          <input
            ref={nameRef}
            className="f-name"
            value={name}
            placeholder={copy.tagEditor.namePlaceholder}
            disabled={paletteExhausted}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      </Field>

      <Field label={copy.tagEditor.color} hint={copy.tagEditor.colorHint}>
        <div className="palette-row">
          {TAG_PALETTE.map((swatch) => {
            const inUse = takenColors.includes(swatch);
            const classes = ["pchip", color === swatch ? "on" : "", inUse ? "used" : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <span
                key={swatch}
                className={classes}
                style={{ background: swatch }}
                title={inUse ? copy.tagEditor.inUse : copy.tagEditor.chooseColor}
                onClick={() => {
                  if (!inUse) setColor(swatch);
                }}
              />
            );
          })}
        </div>
      </Field>

      <FormActions>
        <Button variant="primary" icon="check" disabled={!canSubmit} onClick={submit}>
          {isEditing ? copy.actions.save : copy.actions.create}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {copy.actions.cancel}
        </Button>
        {isEditing ? (
          <Button variant="danger" icon="trash-2" onClick={onDelete}>
            {copy.actions.delete}
          </Button>
        ) : null}
      </FormActions>
    </FormModal>
  );
}
