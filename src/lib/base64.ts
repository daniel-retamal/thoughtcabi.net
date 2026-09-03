const CHUNK = 0x8000;

export function base64FromText(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  for (let at = 0; at < bytes.length; at += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(at, at + CHUNK));
  }

  return btoa(binary);
}

export function textFromBase64(encoded: string): string {
  const binary = atob(encoded.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
