export async function verified(
  url: string,
  hash: string,
  signal?: AbortSignal,
  refresh = false,
): Promise<Uint8Array<ArrayBuffer>> {
  const report = (valid: boolean) =>
    window.dispatchEvent(
      new CustomEvent("embater-asset-check", {
        detail: { url: new URL(url, location.href).href, valid },
      }),
    );
  try {
    const response = await fetch(url, {
      ...(signal ? { signal } : {}),
      cache: refresh ? "reload" : "default",
    });
    if (!response.ok)
      throw new Error("A source page or font could not be loaded. Reconnect and try again.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    if (Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("") !== hash)
      throw new Error(
        "A source page or font differs from the reviewed edition. Reconnect and reload the source page.",
      );
    signal?.throwIfAborted();
    report(true);
    return bytes;
  } catch (error) {
    // Cancellation says nothing about the saved edition's integrity.
    if (!signal?.aborted) {
      report(false);
      if (error instanceof TypeError)
        throw new Error(
          "A source page or font could not be loaded. Reconnect and reload the source page.",
        );
    }
    throw error;
  }
}

export function dataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${mime};base64,${btoa(binary)}`;
}
