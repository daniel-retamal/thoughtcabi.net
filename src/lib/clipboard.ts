export async function readClipboardText(): Promise<string | null> {
  try {
    const text = await navigator.clipboard?.readText();
    return text || null;
  } catch {
    return null;
  }
}

export async function readClipboardImage(): Promise<Blob | null> {
  try {
    const items = await navigator.clipboard?.read();
    for (const item of items ?? []) {
      const type = item.types.find((entry) => entry.startsWith("image"));
      if (type) return await item.getType(type);
    }
    return null;
  } catch {
    return null;
  }
}
