/**
 * Fast heuristic token estimator (zero dependencies).
 *
 * Estimates tokens as ~1 token per 4 characters — the same heuristic used
 * by OpenAI's tokenizer documentation. Always available, no WASM needed.
 */

export function heuristicTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}
