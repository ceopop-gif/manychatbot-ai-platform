export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
  timeoutMessage = "บริการภายนอกใช้เวลาตอบกลับนานเกินไป"
) {
  const controller = new AbortController();
  let timedOut = false;
  const forwardAbort = () => controller.abort(init.signal?.reason);

  if (init.signal?.aborted) forwardAbort();
  else init.signal?.addEventListener("abort", forwardAbort, { once: true });

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new Error(timeoutMessage, { cause: error });
    throw error;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", forwardAbort);
  }
}
