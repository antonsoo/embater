// Used by both the page modules and the generated worker. Fetch without SRI so
// that incoming chunks are visible; callers verify the complete bytes before use.
export const TRANSFER_POLICY = Object.freeze({
  connectionMs: 60_000,
  idleMs: 15_000,
  totalMs: 180_000,
  maxBytes: 32 * 1024 * 1024,
});
export const READING_DEADLINE_MS = 195_000;

export async function transferBytes(
  url: string | Response,
  parentSignal?: AbortSignal,
  refresh = false,
  expectedHash?: string,
): Promise<{ bytes: Uint8Array<ArrayBuffer>; response: Response }> {
  const controller = new AbortController();
  const cancel = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener("abort", cancel, { once: true });
  if (parentSignal?.aborted) cancel();
  let idle: ReturnType<typeof setTimeout> | undefined;
  const deadline = setTimeout(
    () =>
      controller.abort(
        new Error("The file exceeded the three-minute transfer limit. Reconnect and try again."),
      ),
    TRANSFER_POLICY.totalMs,
  );
  const arm = (milliseconds: number, message: string) => {
    clearTimeout(idle);
    idle = setTimeout(() => controller.abort(new Error(message)), milliseconds);
  };
  arm(TRANSFER_POLICY.connectionMs, "The file did not begin loading. Reconnect and try again.");
  let reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>> | undefined;
  try {
    controller.signal.throwIfAborted();
    const response =
      typeof url === "string"
        ? await fetch(url, {
            cache: refresh ? "reload" : "default",
            signal: controller.signal,
            ...(expectedHash ? { headers: { "X-Embater-Asset-Sha256": expectedHash } } : {}),
          })
        : url;
    if (!response.ok)
      throw new Error("A source page or font could not be loaded. Reconnect and try again.");
    reader = response.body?.getReader();
    controller.signal.addEventListener(
      "abort",
      () => {
        void reader?.cancel().catch(() => {});
      },
      { once: true },
    );
    if (!reader) throw new Error("The file has no readable body. Reconnect and try again.");
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    arm(TRANSFER_POLICY.idleMs, "The file stopped receiving data. Reconnect and try again.");
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value.byteLength) continue;
      size += value.byteLength;
      if (size > TRANSFER_POLICY.maxBytes)
        throw new Error(
          "The file exceeds the retained edition’s size limit. Reload and try again.",
        );
      chunks.push(value);
      arm(TRANSFER_POLICY.idleMs, "The file stopped receiving data. Reconnect and try again.");
    }
    controller.signal.throwIfAborted();
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { bytes, response };
  } catch (error) {
    controller.abort(error);
    // Do not wait for cancellation: a failed stream must return the controls even
    // if an underlying producer never acknowledges its consumer's cancellation.
    void reader?.cancel().catch(() => {});
    throw controller.signal.reason;
  } finally {
    reader?.releaseLock();
    clearTimeout(idle);
    clearTimeout(deadline);
    parentSignal?.removeEventListener("abort", cancel);
  }
}
