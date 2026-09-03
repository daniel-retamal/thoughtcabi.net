function hex(digest: ArrayBuffer): string {
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function gitBlobSha(text: string): Promise<string> {
  const body = new TextEncoder().encode(text);
  const header = new TextEncoder().encode(`blob ${body.length}\0`);
  const blob = new Uint8Array(header.length + body.length);
  blob.set(header);
  blob.set(body, header.length);

  return hex(await crypto.subtle.digest("SHA-1", blob));
}
