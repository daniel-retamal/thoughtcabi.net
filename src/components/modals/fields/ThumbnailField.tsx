import { useRef, type ClipboardEvent, type DragEvent } from "react";
import { Icon } from "@/components/primitives/Icon";

function readImageFile(file: File | null | undefined, onLoaded: (dataUrl: string) => void): void {
  if (!file?.type.startsWith("image")) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") onLoaded(reader.result);
  };
  reader.readAsDataURL(file);
}

export interface ThumbnailFieldProps {
  value: string;
  onChange: (dataUrl: string) => void;
}

export function ThumbnailField({ value, onChange }: ThumbnailFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPaste = (event: ClipboardEvent): void => {
    const item = Array.from(event.clipboardData.items).find((entry) =>
      entry.type.startsWith("image"),
    );
    const file = item?.getAsFile();
    if (!file) return;
    event.preventDefault();
    readImageFile(file, onChange);
  };

  const onDrop = (event: DragEvent): void => {
    event.preventDefault();
    readImageFile(event.dataTransfer.files.item(0), onChange);
  };

  if (value) {
    return (
      <div
        className="img-drop has-img"
        tabIndex={0}
        style={{ backgroundImage: `url(${value})` }}
        onPaste={onPaste}
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
      onDragOver={(event) => event.preventDefault()}
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
