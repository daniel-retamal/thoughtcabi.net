import { useState, type KeyboardEvent } from "react";
import type { Tag } from "@/domain/model";
import { MAX_TAGS, TAG_PALETTE } from "@/domain/tags/palette";
import { isPaletteFull } from "@/domain/tags/tagLibrary";
import { useAutoFocus } from "@/hooks/useAutoFocus";
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
      kind={isEditing ? "Edit tag" : "New tag"}
      heading={isEditing ? "Rename & recolour" : "Name your tag"}
      onClose={onCancel}
    >
      {paletteExhausted ? (
        <p className="tagmgr-note">
          All {MAX_TAGS} colours are in use — delete a tag to add another.
        </p>
      ) : null}

      <Field label="Name">
        <div className="f-url-wrap">
          <span className="tag-dot-pre" style={{ background: color || "var(--text-faint)" }} />
          <input
            ref={nameRef}
            className="f-name"
            value={name}
            placeholder="e.g. To read"
            disabled={paletteExhausted}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      </Field>

      <Field label="Colour" hint="— one name per colour">
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
                title={inUse ? "in use" : "choose colour"}
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
