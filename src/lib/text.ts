export function leadingInitial(value: string | undefined, fallback = "•"): string {
  const stripped = (value ?? "?").replace(/^[^\p{L}\p{N}]*/u, "");
  return stripped.charAt(0).toUpperCase() || fallback;
}

export function leadingLetter(value: string, fallback = "•"): string {
  return (
    value
      .replace(/^[^\p{L}]*/u, "")
      .charAt(0)
      .toUpperCase() || fallback
  );
}

export function titleCaseWords(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function capitalizeFirstWord(value: string): string {
  return value.replace(/\b\w/, (character) => character.toUpperCase());
}
