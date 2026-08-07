export function leadingInitial(value: string | undefined, fallback = "•"): string {
  const stripped = (value ?? "?").replace(/^[^A-Za-z0-9]*/, "");
  return stripped.charAt(0).toUpperCase() || fallback;
}

export function leadingLetter(value: string, fallback = "•"): string {
  return (
    value
      .replace(/^[^a-z]*/i, "")
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

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
