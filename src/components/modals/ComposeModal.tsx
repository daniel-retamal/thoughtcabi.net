import { useState, type KeyboardEvent } from "react";
import type { Library, LibraryLocation, Tag } from "@/domain/model";
import type { NoteDraft } from "@/domain/notes/buildNote";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import { Button } from "@/components/primitives/Button";
import { Icon } from "@/components/primitives/Icon";
import { FormActions, FormModal } from "./FormModal";
import { DestinationPicker } from "./fields/DestinationPicker";
import { Field } from "./fields/Field";
import { TagPicker } from "./fields/TagPicker";
import { ThumbnailField } from "./fields/ThumbnailField";

export type ComposeMode = "new" | "edit";

export interface ComposeModalProps {
  mode: ComposeMode;
  library: Library;
  tags: readonly Tag[];
  initial: NoteDraft;
  onSave: (draft: NoteDraft) => void;
  onCancel: () => void;
}

export function ComposeModal({
  mode,
  library,
  tags,
  initial,
  onSave,
  onCancel,
}: ComposeModalProps) {
  const isEditing = mode === "edit";
  const titleRef = useAutoFocus<HTMLInputElement>();

  const [url, setUrl] = useState(initial.url);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [tag, setTag] = useState(initial.tag);
  const [image, setImage] = useState(initial.image);
  const [destination, setDestination] = useState<LibraryLocation>(initial.destination);

  const canSave = title.trim().length > 0 || url.trim().length > 0 || image.length > 0;

  const submit = (): void => {
    if (!canSave) return;
    onSave({
      url: url.trim(),
      title: title.trim(),
      description: description.trim(),
      tag: tag.trim(),
      image,
      destination,
    });
  };

  const onSubmitShortcut = (event: KeyboardEvent): void => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
  };

  return (
    <FormModal
      size="md"
      kind={isEditing ? "Edit link" : "Save link"}
      heading={isEditing ? "Edit this entry" : "Add to your cabinet"}
      onClose={onCancel}
    >
      <Field label="Title">
        <input
          ref={titleRef}
          className="f-input f-title"
          value={title}
          placeholder="What is this?"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={onSubmitShortcut}
        />
      </Field>

      <Field label="Link" hint="— optional">
        <div className="f-url-wrap">
          <Icon name="link" />
          <input
            value={url}
            placeholder="https://…"
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={onSubmitShortcut}
          />
        </div>
      </Field>

      <Field label="Thumbnail" hint="— optional · paste or drop to override the site's">
        <ThumbnailField value={image} onChange={setImage} />
      </Field>

      <Field label="Tag" hint="— optional">
        <TagPicker tags={tags} value={tag} onChange={setTag} />
      </Field>

      <Field label="Description" hint="— optional">
        <textarea
          className="f-area"
          value={description}
          placeholder="A line about why you're keeping this…"
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <Field label="Destination">
        <DestinationPicker library={library} value={destination} onChange={setDestination} />
      </Field>

      <FormActions>
        <Button variant="primary" icon="check" disabled={!canSave} onClick={submit}>
          {isEditing ? "Save changes" : "Save"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </FormActions>
    </FormModal>
  );
}
