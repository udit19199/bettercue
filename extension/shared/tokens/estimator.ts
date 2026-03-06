/**
 * Token estimator with two modes:
 *
 *  1. Fast heuristic (always available, zero dependencies):
 *     ~1 token per 4 characters — good enough for UI feedback.
 *
 *  2. Precise (opt-in, lazy):
 *     Dynamically imports `tiktoken` (WASM, ~1.5 MB) only when
 *     `usePrecise = true`.  Falls back silently to the heuristic if
 *     the import fails (e.g. in contexts where WASM is blocked).
 *
 * Usage:
 *   const count = await estimateTokens(text);           // heuristic
 *   const count = await estimateTokens(text, true);     // precise (lazy load)
 */

// ─── Heuristic ────────────────────────────────────────────────────────────────

export function heuristicTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

// ─── Precise (lazy tiktoken) ──────────────────────────────────────────────────

// Cache the encoder once loaded so we don't re-import on every call.
type TiktokenEncoder = { encode: (text: string) => Uint32Array; free: () => void };
let cachedEncoder: TiktokenEncoder | null = null;
let loadAttempted = false;

async function loadEncoder(): Promise<TiktokenEncoder | null> {
  if (cachedEncoder) return cachedEncoder;
  if (loadAttempted) return null;
  loadAttempted = true;

  try {
    // Dynamic import — Vite/crxjs will bundle tiktoken as a separate chunk.
    // We use the `cl100k_base` encoding which covers gpt-3.5, gpt-4, gpt-4o.
    const tiktoken = await import("tiktoken");
    const encoder = tiktoken.get_encoding("cl100k_base");
    cachedEncoder = encoder as unknown as TiktokenEncoder;
    return cachedEncoder;
  } catch {
    // WASM unavailable or not bundled yet — fall back to heuristic silently.
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Estimate the number of tokens in `text`.
 *
 * @param text        The string to estimate.
 * @param usePrecise  When true, attempt to load tiktoken for exact counts.
 *                    Defaults to false (heuristic only).
 */
export async function estimateTokens(
  text: string,
  usePrecise = false
): Promise<number> {
  if (!usePrecise) return heuristicTokens(text);

  const encoder = await loadEncoder();
  if (!encoder) return heuristicTokens(text);

  try {
    const tokens = encoder.encode(text);
    return tokens.length;
  } catch {
    return heuristicTokens(text);
  }
}
