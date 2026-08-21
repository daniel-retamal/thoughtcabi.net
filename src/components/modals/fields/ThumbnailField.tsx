import { useRef, type ClipboardEvent, type DragEvent } from "react";
import { downscaleImage } from "@/lib/downscaleImage";
import { hasImagePayload, readDroppedImage } from "@/lib/imageDrop";
import { Icon } from "@/components/primitives/Icon";

function readImageFile(file: File | null | undefined, onLoaded: (dataUrl: string) => void): void {
  if (!file?.type.startsWith("image")) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== "string") return;
    void downscaleImage(reader.result)
      .then((stored) => onLoaded(stored.dataUrl))
      .catch(() => onLoaded(reader.result as string));
  };
  reader.readAsDataURL(file);
}

export interface ThumbnailFieldProps {
  value: string;
  onChange: (dataUrl: string) => void;
}

export function ThumbnailField({ value, onChange }: ThumbnailFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const take = (transfer: DataTransfer): boolean => {
    if (!hasImagePayload(transfer)) return false;
    void readDroppedImage(transfer).then((image) => {
      if (image) onChange(image);
    });
    return true;
  };

  const onPaste = (event: ClipboardEvent): void => {
    if (take(event.clipboardData)) event.preventDefault();
  };

  const onDrop = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    take(event.dataTransfer);
  };

  const allowDrop = (event: DragEvent): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  if (value) {
    return (
      <div
        className="img-drop has-img"
        tabIndex={0}
        style={{ backgroundImage: `url(${value})` }}
        onPaste={onPaste}
        onDragOver={allowDrop}
        onDrop={onDrop}
      >
        <button
          type="button"
          className="img-remove"
          title="Remove image"
          aria-label="Remove image"
          onClick={() => onChange("")}
        >
          <Icon name="x" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="img-drop"
      tabIndex={0}
      onPaste={onPaste}
      onDragOver={allowDrop}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <Icon name="image-plus" />
      <span>Paste, drop, or click to add a thumbnail</span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(event) => readImageFile(event.target.files?.item(0), onChange)}
      />
    </div>
  );
}
