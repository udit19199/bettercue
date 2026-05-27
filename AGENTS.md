# AGENTS.md

Guidance for agentic coding agents operating in this repository.

---

## What is bettercue?

**bettercue** is a multi-provider prompt optimizer. It takes a raw prompt and
rewrites it through an LLM (local or cloud) to be more effective, clear, and
structured. It ships as both a **CLI** and a **browser extension** (Chrome MV3 /
Firefox), sharing provider client implementations between them.

---

## Features

### Shared (both CLI and extension)
- **Multi-provider support** — Ollama (local), OpenAI, Anthropic, Google Gemini
- **Preset rewrite styles** — Choose `concise`, `precision`, or `creative` to
  tune the output
- **Token estimation** — Live heuristic estimate (≈length/4); optional precise
  token counting via `tiktoken` (WASM, lazy-loaded)
- **Clarifying questions** — Before optimizing, the system can generate 1–3
  intelligent questions to resolve ambiguity in your prompt. Answers are
  appended as context into the final optimization request
- **Model pricing display** — Per-model input/output cost per 1M tokens fetched
  from embedded pricing tables (OpenAI, Anthropic, Google). Ollama shows
  "Free (local)"
- **Model caching** — Fetched model lists cached for 1 hour (extension uses
  `chrome.storage.local`; CLI uses `~/.bettercue/models-cache.json`)

### CLI (`@bettercue/cli`)
- Interactive terminal wizard via `inquirer` / `chalk`
- Searchable model picker via `@inquirer/search`
- macOS Keychain integration (`bun run cli auth`) — store/remove/check API keys
  via `security` CLI
- Environment variable fallback (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
  `GOOGLE_API_KEY`)
- Standalone macOS binary compilation (`bun run build:cli:macos` /
  `bun run package:cli:macos`) — no Bun required on end-user machines
- Custom Ollama base URL via `OLLAMA_BASE_URL` env var

### Extension (`@bettercue/extension`)
- Chrome MV3 / Firefox browser extension built with Vite + `@crxjs/vite-plugin`
- **Searchable model selector** with inline pricing — type to filter; arrow key
  navigation; shows input/output cost per 1M tokens
- **Interactive clarifying questions flow** — Click "Optimize Prompt" →
  questions appear → answer or "Skip & Optimize"
- **Copy result** — One-click copy of the optimized prompt to clipboard
- **Replace Selection** — Inserts the optimized prompt into the active input or
  text selection on the current page
- **Right-click context menu** — Select text → right-click → "Optimize prompt"
- **Persistent model selection** — Remembers last-used model per provider
- **No-key warning** — Prominently shows a warning when a required API key is
  missing, with a link to the Settings page
- **Options page** — Per-provider API key management (save/clear/masked
  display), precise tokens toggle, and clear-all button
- **Secure key storage** — All API keys stored in `chrome.storage.local` only,
  never synced
- **Mock provider** — Offline testing mode that prepends `[MOCK-OPTIMIZED]` with
  no API calls
- **tiktoken WASM support** — Precise token counting via `vite-plugin-wasm` +
  `vite-plugin-top-level-await`

---

## Repository layout

```
bettercue/
├── package.json                    ← Bun workspace root
├── bun.lock                        ← single unified lockfile
│
├── shared/                         ← Shared by CLI + extension (via relative imports or @shared alias)
│   ├── ollama/
│   │   ├── client.ts               ← Ollama /api/generate client (streaming NDJSON), /api/tags model lister
│   │   └── index.ts                ← re-exports
│   └── providers/
│       ├── catalog.ts              ← Provider metadata (displayName, defaultModel, requiresApiKey)
│       ├── index.ts                ← optimizeWithProvider(), listProviderModels(), generateQuestionsWithProvider()
│       ├── types.ts                ← CoreProviderId, OptimizeRequest/Response, etc.
│       ├── prompts.ts              ← System prompts per preset (concise/precision/creative)
│       ├── pricing.ts              ← Per-model pricing tables for OpenAI, Anthropic, Google, Ollama
│       └── clients/
│           ├── ollama.ts           ← optimizeWithOllama(), listOllamaProviderModels()
│           ├── openai.ts           ← optimizeWithOpenAI(), listOpenAIModels()
│           ├── anthropic.ts        ← optimizeWithAnthropic(), listAnthropicModels()
│           └── google.ts           ← optimizeWithGoogle(), listGoogleModels()
│
├── cli/                            ← @bettercue/cli  (Bun runtime, no compile step)
│   ├── cli.ts                      ← entry point
│   ├── core/
│   │   ├── config.ts               ← CLI defaults (provider, models, API key env var names)
│   │   ├── modelCache.ts           ← JSON file cache at ~/.bettercue/models-cache.json
│   │   ├── modelCache.test.ts      ← bun:test suite
│   │   ├── optimise.ts             ← Full CLI wizard: collectInput, chooseProvider, chooseModel, optimisePrompt
│   │   ├── optimise.test.ts        ← bun:test suite (mocks providers, keychain, modelCache, @inquirer/search)
│   │   ├── keychain.ts             ← macOS Keychain read/write via `security` CLI
│   │   └── ollama.test.ts          ← bun:test suite for Ollama streaming client
│   ├── package.json
│   └── tsconfig.json
│
└── extension/                      ← @bettercue/extension  (Vite + Chrome MV3)
    ├── manifest.json               ← MV3 manifest
    ├── vite.config.ts              ← Vite + crxjs + wasm + top-level-await
    ├── background/
    │   ├── background.ts           ← Service worker: message router, context menu
    │   ├── messageFlow.ts          ← Message dispatch (rewrite / list-models / generate-questions)
    │   ├── messageFlow.test.ts     ← bun:test suite
    │   ├── providers.ts            ← Adapter registry (getAdapter, listAdapters)
    │   └── modelsCache.ts          ← chrome.storage.local cache for model lists
    │   └── modelsCache.test.ts     ← bun:test suite
    ├── content/
    │   └── content.ts              ← Content script: forwards selection via CustomEvent
    ├── popup/
    │   ├── popup.html              ← Popup UI (searchable model selector, questions flow, preview, actions)
    │   └── popup.ts                ← Popup logic (init, fetch/populate models, optimize, copy, replace)
    ├── options/
    │   ├── options.html            ← Options page (key management, precise tokens toggle)
    │   └── options.ts              ← Options logic (save/load/clear keys, precise tokens toggle, clear all)
    ├── shared/                     ← Imported via relative imports within extension entry points
    │   ├── providers/
    │   │   ├── provider.ts         ← ProviderAdapter interface (rewritePrompt, listModels, estimateTokens, etc.)
    │   │   ├── rewriteAdapter.ts   ← createRewriteAdapter() — wraps shared optimizeWithProvider into ProviderAdapter
    │   │   ├── mockAdapter.ts      ← Mock provider for offline testing
    │   │   ├── ollamaAdapter.ts    ← Ollama adapter config
    │   │   ├── openaiAdapter.ts    ← OpenAI adapter config
    │   │   ├── anthropicAdapter.ts ← Anthropic adapter config
    │   │   └── googleAdapter.ts    ← Google Gemini adapter config
    │   ├── storage/
    │   │   ├── keys.ts             ← chrome.storage.local typed helpers (saveKey, loadKey, clearAllKeys, etc.)
    │   │   └── keys.test.ts        ← test file (needs framework setup)
    │   └── tokens/
    │       └── estimator.ts        ← heuristicTokens() + lazy tiktoken-based estimateTokens()
    ├── package.json
    └── tsconfig.json
```

---

## Package manager

**Always use Bun.** Never use npm, yarn, or pnpm.

```bash
bun install                  # install all workspace deps from root
```

---

## Build / run commands

All commands are run from the **repository root** unless noted.

| Command | What it does |
|---|---|
| `bun run cli` | Run the CLI interactive wizard (multi-provider) |
| `bun run build:cli:macos` | Compile standalone macOS binary → `dist/bettercue-macos-arm64` |
| `bun run package:cli:macos` | Build + tar.gz + SHA256 → `dist/` |
| `bun run extension:dev` | Vite watch build → `extension/dist/` (Chrome) |
| `bun run extension:build` | Vite production build → `extension/dist/` (Chrome/Edge) |
| `bun run extension:firefox` | Vite production build → `extension/dist-firefox/` |
| `bun run typecheck` | `tsc --noEmit` across both workspaces |

### Per-workspace commands

```bash
# CLI
bun run --cwd cli tsc --noEmit       # typecheck CLI only
bun test cli/core/optimise.test.ts   # run a single CLI test file

# Extension
bun run --cwd extension typecheck    # typecheck extension only
bun run --cwd extension build        # production build
bun run --cwd extension dev          # watch build
```

### Tests

The CLI uses **Bun's built-in test runner** (`bun test`). The extension also
uses `bun:test` with mocked `chrome.*` globals.

Existing test files:
- `cli/core/ollama.test.ts` — Ollama streaming client
- `cli/core/modelCache.test.ts` — Model list JSON cache
- `cli/core/optimise.test.ts` — Full CLI logic (mocks providers, keychain, model cache)
- `extension/background/messageFlow.test.ts` — Background message routing
- `extension/background/modelsCache.test.ts` — Extension model list cache
- `extension/shared/storage/keys.test.ts` — Storage key helpers

Run all tests:
```bash
bun test
```

Run a single test file:
```bash
bun test cli/core/optimise.test.ts
```

The extension does not have Vitest configured — tests use `bun:test` with
`globalThis.chrome` stubs. If adding Vitest later, prefer it since the
extension already uses Vite.

### Linting / formatting

No linter or formatter is configured. Keep code consistent with surrounding
style. When adding one, prefer **Biome** (handles both lint and format with a
single Bun-compatible tool).

---

## TypeScript rules

### CLI (`cli/tsconfig.json`)
- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`
- `noUnusedLocals` and `noUnusedParameters` are **off** — unused identifiers are
  allowed during development
- `allowImportingTsExtensions: true` — **imports must include the `.ts`
  extension** (Bun resolves them at runtime)
- `noEmit: true` — Bun runs TypeScript directly; do not add a compile step
- `rootDir: ".."` — allows importing from root `shared/`
- `include: ["**/*.ts", "../shared/**/*.ts"]`

### Extension (`extension/tsconfig.json`)
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`,
  `noImplicitReturns: true` — these will **fail `bun run typecheck`** if
  violated
- Imports must **omit file extensions** (Vite/bundler resolution)
- Use `import type` for any type-only import:
  ```ts
  import type { ProviderAdapter } from "./provider";
  ```
- The `@shared/*` alias resolves to root `shared/*` — use it for catalog,
  providers, types, prompts, pricing, and Ollama client:
  ```ts
  import { estimateTokens } from "@shared/tokens/estimator";      // NO: this is extension/shared/
  import { CORE_PROVIDERS } from "@shared/providers";              // YES: resolves to shared/providers/catalog.ts
  import { DEFAULT_OLLAMA_GENERATE_URL } from "@shared/ollama";    // YES: resolves to shared/ollama/index.ts
  ```
- For `extension/shared/` code, use **relative imports** (e.g.
  `../shared/providers/mockAdapter`)

### Root `shared/` (used by both packages)
- No standalone tsconfig — typechecked through each workspace's tsconfig
- Files use `.ts` extension (CLI convention) — the extension's Vite bundler
  strips them during resolution
- `import type` for type-only imports

---

## Code style

### Formatting
- **CLI**: 4-space indentation
- **Extension**: 2-space indentation
- **Root `shared/`**: 2-space indentation (matches extension style)
- Semicolons throughout in extension and shared files; CLI files are
  inconsistent — match the file you are editing
- Trailing commas in multi-line objects and arrays (extension and shared)

### Naming conventions
| Kind | Convention | Examples |
|---|---|---|
| Constants | `SCREAMING_SNAKE_CASE` | `OLLAMA_URL`, `DEFAULT_MODEL`, `SYSTEM_PROMPT` |
| Functions | `camelCase` | `generatePrompt`, `getAdapter`, `estimateTokens` |
| Types / interfaces | `PascalCase` | `ProviderAdapter`, `RewriteOptions`, `StorageRoot` |
| Variables / instances | `camelCase` | `openaiAdapter`, `cachedEncoder` |
| DOM refs | `camelCase` with `El`/`Btn` suffix | `promptEl`, `optimizeBtn`, `noKeyWarning` |
| Files | `camelCase` | `openaiAdapter.ts`, `vite.config.ts` |
| Directories | lowercase | `background/`, `shared/`, `tokens/` |

### Imports
- **CLI**: named imports with explicit `.ts` extension:
  ```ts
  import { generatePrompt } from "./core/ollama.ts";
  import { CORE_PROVIDERS } from "../../shared/providers/index.ts";
  ```
- **Extension (root shared via `@shared/`)**: named imports without extension:
  ```ts
  import { CORE_PROVIDERS } from "@shared/providers";
  import type { CoreProviderId } from "@shared/providers";
  ```
- **Extension (local/relative)**: named imports without extension:
  ```ts
  import { createRewriteAdapter } from "./rewriteAdapter";
  import type { ProviderAdapter } from "../shared/providers/provider";
  ```
- Default exports for adapter/singleton objects; named exports for everything
  else

### Functions
- Prefer `async/await` — no `.then()` chains
- Module-level functions use `function` declarations:
  ```ts
  export async function generatePrompt(prompt: string): Promise<string> { ... }
  ```
- Short adapter methods and callbacks use arrow functions:
  ```ts
  supportsModel: (model: string) => !!model,
  ```
- Async event listeners use the IIFE pattern (Chrome API limitation):
  ```ts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => { ... })();
    return true; // indicate async response
  });
  ```
- Entry-point modules define an `async function init()` called at the bottom:
  ```ts
  async function init() { ... }
  init();
  ```

### Error handling
- **Guard clauses** with early throws before async work:
  ```ts
  if (!apiKey) throw new Error("Missing OpenAI API key. Open Settings to add one.");
  ```
- **Background worker** returns structured responses — never rethrow to the
  caller:
  ```ts
  sendResponse({ ok: true, result });
  sendResponse({ ok: false, error: String(err?.message ?? err) });
  ```
- **UI errors**: set `element.textContent` and add an `"error"` CSS class; do
  not use `alert()`
- **Provider API errors**: use `classifyHttpError` / `classifyOpenAIError`
  helpers that produce human-readable messages (auth, rate limiting, server
  errors, connection refused)
- Empty catch blocks are acceptable only for intentionally skippable errors
  (e.g., skipping malformed JSON lines in a stream, failing to load tiktoken)

### Comments
- File/module header: block comment explaining responsibilities
- Public functions: JSDoc with `@param` and description
- Section dividers using box-drawing characters:
  ```ts
  // ─── DOM refs ─────────────────────────────────────────────────────────────────
  ```
- Inline comments for non-obvious decisions only; avoid restating the code

---

## Architecture notes

### Root `shared/` — provider clients and catalog
- `shared/providers/catalog.ts` defines `CoreProviderId` metadata (display name,
  default model, whether an API key is required)
- `shared/providers/types.ts` defines the request/response types shared by all
  providers
- `shared/providers/index.ts` exports `optimizeWithProvider()` (dispatches to
  the correct client) and `generateQuestionsWithProvider()` (generates clarifying
  questions using the same optimize infrastructure)
- Each `shared/providers/clients/*.ts` implements the actual API call for one
  provider. They are **not** classes — they export standalone async functions
- `shared/providers/pricing.ts` has embedded pricing tables; `enrichModelsWithPricing()`
  merges pricing into model lists for display
- `shared/providers/prompts.ts` has per-preset system prompts; `getSystemPrompt(preset)`
  selects one
- `shared/ollama/client.ts` handles streaming NDJSON (`/api/generate`) with
  `readOllamaStream()` and model listing (`/api/tags`)

### CLI
- Bun runs `cli/cli.ts` directly — no build output (except for standalone binary)
- `cli/core/config.ts` maps CLI-specific defaults (provider, model per provider,
  API key env var names) using the shared catalog
- `cli/core/optimise.ts` owns the full wizard:
  1. `printBanner()` / `collectInput()` — editor prompt input via inquirer
  2. `chooseProvider()` — list selection of providers
  3. `chooseModel()` — searchable model picker with caching
  4. `resolveApiKey()` — macOS Keychain → env var → null
  5. `optimisePrompt()` — calls `optimizeWithProvider()` from shared
- `cli/core/keychain.ts` wraps `security` CLI for macOS Keychain
- `cli/core/modelCache.ts` persists fetched model lists to
  `~/.bettercue/models-cache.json` (separated by provider and base URL)
- CLI tests use `mock.module()` from `bun:test` to stub shared provider imports
  and external dependencies

### Extension
- **Manifest V3** service worker at `extension/background/background.ts`
- `extension/background/messageFlow.ts` implements `createBackgroundMessageFlow()`
  which handles three message types:
  - `rewrite` — validates payload, loads API key, calls adapter's `rewritePrompt()`
  - `list-models` — checks cache (1-hour TTL), fetches fresh list if stale
  - `generate-questions` — calls `generateQuestionsWithProvider()` from shared
- Provider adapters in `extension/shared/providers/` implement the
  `ProviderAdapter` interface and are registered in
  `extension/background/providers.ts`
- `createRewriteAdapter()` in `rewriteAdapter.ts` is a factory that takes a
  provider config (id, displayName, defaultModel, `build()` function) and returns
  a full `ProviderAdapter` — it calls `optimizeWithProvider()` from shared
- The popup (`extension/popup/popup.ts`) uses vanilla DOM with a custom
  searchable model dropdown — no framework
- All API keys stored in `chrome.storage.local` under the `"providers"` key —
  never `sync` storage, never sent anywhere except the provider's own endpoint
- Options page (`extension/options/`) manages per-provider keys with masked
  display and a precise-tokens toggle
- Host permissions scope is restricted to known AI provider domains + localhost
  for Ollama
- Content script (`extension/content/content.ts`) relays right-click selections
  via `CustomEvent("bettercue-selection")`
- tiktoken WASM is bundled via `vite-plugin-wasm` + `vite-plugin-top-level-await`;
  `tiktoken` is excluded from `optimizeDeps` to ensure it's emitted as a
  separate WASM chunk

### Extension ↔ Shared import paths

| Import | Resolves to |
|---|---|
| `@shared/providers` | `shared/providers/index.ts` (catalog, clients, prompts, pricing) |
| `@shared/ollama` | `shared/ollama/index.ts` (Ollama client) |
| `../shared/providers/openaiAdapter` | `extension/shared/providers/openaiAdapter.ts` (adapter wrappers) |
| `../shared/storage/keys` | `extension/shared/storage/keys.ts` (chrome.storage helpers) |
| `../shared/tokens/estimator` | `extension/shared/tokens/estimator.ts` (token estimation) |

---

## Things that do not exist yet (stubs / planned work)
- `cli/core/optimise.ts` and `cli/core/questions.ts` are **no longer stubs** —
  they are fully implemented. The clarifying questions flow lives in
  `shared/providers/index.ts` (`generateQuestionsWithProvider()`)
- Global search/replace across multiple tabs
- A local-first mode that caches optimization results
- Integration tests (end-to-end with real API keys)
- Linter / formatter — no ESLint, Prettier, or Biome config
- Firefox-specific manifest adjustments (the build target exists but MV3
  differences are not handled yet)
- Pipeline/draft mode — iteratively refine a prompt through multiple rounds
- Prompt templates / saved prompts library
- Export/import of settings
