declare const __OFFLINE_EDITION__: string;

import { transferBytes } from "./transfer";

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
  const check = async (source: string | Response, force = false) => {
    const { bytes } = await transferBytes(source, signal, force, force ? hash : undefined);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    if (Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("") !== hash)
      throw new Error(
        "A source page or font differs from the reviewed edition. Reconnect and reload the source page.",
      );
    signal?.throwIfAborted();
    return bytes;
  };
  try {
    let bytes: Uint8Array<ArrayBuffer>;
    let replacement = false;
    try {
      bytes = await check(url, refresh);
      replacement = refresh;
    } catch (networkError) {
      if (
        !refresh ||
        signal?.aborted ||
        !import.meta.env.PROD ||
        !("serviceWorker" in navigator) ||
        !navigator.serviceWorker.controller
      )
        throw networkError;
      // A failed explicit reload can still use this page's complete saved copy.
      // Read it directly, so a missing copy never starts a second network wait.
      const cacheName = `embater-${__OFFLINE_EDITION__}`;
      let saved: Response | undefined;
      try {
        if (await caches.has(cacheName))
          saved = await (await caches.open(cacheName)).match(new URL(url, location.href).pathname);
      } catch {
        throw networkError;
      }
      if (!saved) throw networkError;
      bytes = await check(saved);
    }
    if (replacement) await storeVerifiedAsset(url, bytes, signal);
    signal?.throwIfAborted();
    if (refresh) report(true);
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

/** The worker independently rechecks bytes before changing its own edition cache. */
async function storeVerifiedAsset(
  url: string,
  bytes: Uint8Array<ArrayBuffer>,
  signal?: AbortSignal,
): Promise<void> {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const worker = navigator.serviceWorker.controller;
  if (!worker || signal?.aborted) return;
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      channel.port1.close();
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, 12000);
    signal?.addEventListener("abort", finish, { once: true });
    channel.port1.onmessage = finish;
    const copy = bytes.slice().buffer;
    try {
      worker.postMessage(
        {
          type: "VERIFIED_ASSET",
          edition: __OFFLINE_EDITION__,
          url: new URL(url, location.href).href,
          bytes: copy,
        },
        [channel.port2, copy],
      );
    } catch {
      finish();
    }
  });
}

export function dataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${mime};base64,${btoa(binary)}`;
}
