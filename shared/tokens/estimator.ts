/**
 * Fast heuristic token estimator (zero dependencies).
 *
 * Estimates tokens as ~1 token per 4 characters — the same heuristic used
 * by OpenAI's tokenizer documentation. Always available, no WASM needed.
 *
 * For precise token counting (via tiktoken WASM), see the extension's
 * `extension/shared/tokens/estimator.ts` which imports and wraps this
 * function with an optional tiktoken upgrade path.
 */

export function heuristicTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}
