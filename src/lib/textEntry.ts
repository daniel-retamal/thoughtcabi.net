const TEXT_ENTRY_TAGS = new Set(["INPUT", "TEXTAREA"]);

export function isTypingInField(): boolean {
  const active = document.activeElement;
  return active !== null && TEXT_ENTRY_TAGS.has(active.tagName);
}
