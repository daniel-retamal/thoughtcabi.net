import { useEffect, useState, type KeyboardEvent } from "react";
import type { LinkPreview } from "@/domain/links/linkPreview";
import type { Library, LibraryLocation, Tag } from "@/domain/model";
import type { NoteDraft } from "@/domain/notes/buildNote";
import type { LinkReader } from "@/links/readLink";
import { useLinkPreview } from "@/state/useLinkPreview";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import { useCopy } from "@/i18n/I18nContext";
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
  initialPreview: LinkPreview | null;
  readLink: LinkReader;
  onSave: (draft: NoteDraft, preview: LinkPreview | null) => void;
  onCreateTag: (name: string, color: string) => void;
  onCancel: () => void;
}

export function ComposeModal({
  mode,
  library,
  tags,
  initial,
  initialPreview,
  readLink,
  onSave,
  onCreateTag,
  onCancel,
}: ComposeModalProps) {
  const copy = useCopy();
  const isEditing = mode === "edit";
  const titleRef = useAutoFocus<HTMLInputElement>();

  const [url, setUrl] = useState(initial.url);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [tag, setTag] = useState(initial.tag);
  const [image, setImage] = useState(initial.image);
  const [destination, setDestination] = useState<LibraryLocation>(initial.destination);

  const { preview, reading } = useLinkPreview(url, readLink, initialPreview);

  useEffect(() => {
    if (!preview) return;
    setTitle((current) => current || preview.title);
    setDescription((current) => current || preview.description);
  }, [preview]);

  const canSave = title.trim().length > 0 || url.trim().length > 0 || image.length > 0;

  const submit = (): void => {
    if (!canSave) return;
    onSave(
      {
        url: url.trim(),
        title: title.trim(),
        description: description.trim(),
        tag: tag.trim(),
        image,
        destination,
      },
      preview,
    );
  };

  const onSubmitShortcut = (event: KeyboardEvent): void => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
  };

  return (
    <FormModal
      size="md"
      kind={isEditing ? copy.compose.kindEdit : copy.compose.kindNew}
      heading={isEditing ? copy.compose.headingEdit : copy.compose.headingNew}
      onClose={onCancel}
      onImageDrop={setImage}
    >
      <Field label={copy.compose.title}>
        <input
          ref={titleRef}
          className="f-input f-title"
          value={title}
          placeholder={copy.compose.titlePlaceholder}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={onSubmitShortcut}
        />
      </Field>

      <Field
        label={copy.compose.link}
        hint={reading ? copy.compose.reading : copy.compose.optional}
      >
        <div className="f-url-wrap">
          <Icon name={reading ? "loader-circle" : "link"} className={reading ? "spinning" : ""} />
          <input
            value={url}
            placeholder={copy.compose.linkPlaceholder}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={onSubmitShortcut}
          />
        </div>
      </Field>

      <Field label={copy.compose.thumbnail} hint={copy.compose.thumbnailHint}>
        <ThumbnailField value={image} onChange={setImage} />
      </Field>

      <Field label={copy.compose.tag} hint={copy.compose.optional}>
        <TagPicker tags={tags} value={tag} onChange={setTag} onCreate={onCreateTag} />
      </Field>

      <Field label={copy.compose.description} hint={copy.compose.optional}>
        <textarea
          className="f-area"
          value={description}
          placeholder={copy.compose.descriptionPlaceholder}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <Field label={copy.compose.destination}>
        <DestinationPicker library={library} value={destination} onChange={setDestination} />
      </Field>

      <FormActions>
        <Button variant="primary" icon="check" disabled={!canSave} onClick={submit}>
          {isEditing ? copy.actions.saveChanges : copy.actions.save}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {copy.actions.cancel}
        </Button>
      </FormActions>
    </FormModal>
  );
}
