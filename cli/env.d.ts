/**
 * Type augmentation for known environment variables used by the bettercue CLI.
 *
 * This enables autocompletion and non-optional typing when accessing
 * known env vars via `Bun.env.VAR_NAME` or `process.env.VAR_NAME`.
 *
 * See https://bun.com/docs/runtime/env#typescript
 */
declare module "bun" {
  interface Env {
    /** Base URL for Ollama API. Defaults to http://127.0.0.1:11434. */
    OLLAMA_BASE_URL?: string;

    /** OpenAI API key. Required to use OpenAI models. */
    OPENAI_API_KEY?: string;

    /** Anthropic API key. Required to use Anthropic models. */
    ANTHROPIC_API_KEY?: string;

    /** Google Gemini API key. Required to use Google models. */
    GOOGLE_API_KEY?: string;
  }
}
