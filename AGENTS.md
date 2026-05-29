# AGENTS.md

Guidance for agentic coding agents operating in this repository.

---

## What is bettercue?

**bettercue** is a multi-provider prompt optimizer for the CLI. It takes a raw
prompt and rewrites it through an LLM (local or cloud) to be more effective,
clear, and structured.

---

## Features

### Multi-provider support
- **Ollama** (local), **OpenAI**, **Anthropic**, **Google Gemini**
- **Preset rewrite styles** — `concise`, `precision`, or `creative`
- **Token estimation** — Live heuristic estimate (≈length/4)
- **Clarifying questions** — Before optimizing, the system can generate 1–3
  intelligent questions to resolve ambiguity. Answers are appended as context
  into the final optimization request
- **Model pricing display** — Per-model input/output cost per 1M tokens
  fetched from embedded pricing tables. Ollama shows "Free (local)"
- **Model caching** — Fetched model lists cached for 1 hour in
  `~/.bettercue/models-cache.json`

### CLI
- Interactive terminal wizard via `inquirer` / `chalk`
- Searchable model picker via `@inquirer/search`
- macOS Keychain integration (`bun run cli auth`) — store/remove/check API
  keys via `security` CLI
- Environment variable fallback (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
  `GOOGLE_API_KEY`)
- Standalone macOS binary compilation (`bun run build:cli:macos` /
  `bun run package:cli:macos`) — no Bun required on end-user machines
- Custom Ollama base URL via `OLLAMA_BASE_URL` env var

---

## Repository layout

```
bettercue/
├── package.json                    ← Bun workspace root
├── bun.lock
│
├── shared/                         ← Shared types, provider clients, questions
│   ├── ollama/
│   │   ├── client.ts               ← Ollama /api/generate client (streaming NDJSON), /api/tags model lister
│   │   └── index.ts                ← re-exports
│   ├── providers/
│   │   ├── catalog.ts              ← Provider metadata (displayName, defaultModel, requiresApiKey)
│   │   ├── index.ts                ← optimizeWithProvider(), listProviderModels(), generateQuestionsWithProvider()
│   │   ├── types.ts                ← CoreProviderId, OptimizeRequest/Response, etc.
│   │   ├── prompts.ts              ← System prompts per preset + DEFAULT_SYSTEM_PROMPT
│   │   ├── pricing.ts              ← Per-model pricing tables for OpenAI, Anthropic, Google, Ollama
│   │   └── clients/
│   │       ├── ollama.ts           ← optimizeWithOllama(), listOllamaProviderModels()
│   │       ├── openai.ts           ← optimizeWithOpenAI(), listOpenAIModels()
│   │       ├── anthropic.ts        ← optimizeWithAnthropic(), listAnthropicModels()
│   │       └── google.ts           ← optimizeWithGoogle(), listGoogleModels()
│   ├── questions/
│   │   ├── index.ts                ← re-exports
│   │   ├── types.ts                ← Question, QuestionType
│   │   ├── parse.ts                ← parseQuestionsResponse()
│   │   ├── systemPrompt.ts         ← QUESTIONS_SYSTEM_PROMPT
│   │   └── enhance.ts             ← buildEnhancedPrompt()
│   └── tokens/
│       └── estimator.ts            ← heuristicTokens()
│
├── cli/                            ← @bettercue/cli (Bun runtime, no compile step)
│   ├── cli.ts                      ← entry point
│   ├── core/
│   │   ├── config.ts               ← CLI defaults, getOllamaBaseUrl
│   │   ├── modelCache.ts           ← JSON file cache at ~/.bettercue/models-cache.json
│   │   ├── modelCache.test.ts      ← bun:test suite
│   │   ├── optimise.ts             ← Full CLI wizard: resolveProvider, chooseModel, questions, optimize
│   │   ├── optimise.test.ts        ← bun:test suite (mocks providers, keychain, modelCache, @inquirer/search)
│   │   ├── keychain.ts             ← macOS Keychain read/write via `security` CLI
│   │   ├── persistence.ts          ← ~/.bettercue/cli-config.json persistence
│   │   └── ollama.test.ts          ← bun:test suite for Ollama streaming client
│   ├── package.json
│   └── tsconfig.json
│
└── AGENTS.md
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
| `bun run cli` | Run the CLI interactive wizard |
| `bun run build:cli:macos` | Compile standalone macOS binary → `dist/bettercue-macos-arm64` |
| `bun run package:cli:macos` | Build + tar.gz + SHA256 → `dist/` |
| `bun test` | Run all tests |
| `bun run typecheck` | `tsc --noEmit` across CLI workspace |

### Per-file tests

```bash
bun test cli/core/optimise.test.ts   # run a single CLI test file
bun test cli/core/ollama.test.ts     # Ollama streaming client tests
```

The CLI uses **Bun's built-in test runner** (`bun test`). All tests use
`bun:test` with `mock.module()`.

### Linting / formatting

No linter or formatter is configured. Keep code consistent with surrounding
style. When adding one, prefer **Biome** (handles both lint and format with a
single Bun-compatible tool).

---

## TypeScript rules

### CLI (`cli/tsconfig.json`)
- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`
- `noUnusedLocals` and `noUnusedParameters` are **off** — unused identifiers
  are allowed during development
- `allowImportingTsExtensions: true` — **imports must include the `.ts`
  extension** (Bun resolves them at runtime)
- `noEmit: true` — Bun runs TypeScript directly; do not add a compile step
- `rootDir: ".."` — allows importing from root `shared/`
- `include: ["**/*.ts", "../shared/**/*.ts"]`

### Root `shared/` (used by CLI)
- No standalone tsconfig — typechecked through CLI workspace tsconfig
- Files use `.ts` extension (CLI convention)
- `import type` for type-only imports

---

## Code style

### Formatting
- **CLI**: 4-space indentation
- **Root `shared/`**: 2-space indentation
- Semicolons throughout in shared files; CLI files are inconsistent — match
  the file you are editing
- Trailing commas in multi-line objects and arrays (shared)

### Naming conventions
| Kind | Convention | Examples |
|---|---|---|
| Constants | `SCREAMING_SNAKE_CASE` | `DEFAULT_SYSTEM_PROMPT`, `CORE_PROVIDERS` |
| Functions | `camelCase` | `generatePrompt`, `optimizeWithProvider`, `resolveApiKey` |
| Types / interfaces | `PascalCase` | `CoreProviderId`, `OptimizeRequest`, `CliConfig` |
| Variables / instances | `camelCase` | `cachedModels`, `enhancedPrompt` |
| Files | `camelCase` | `openai.ts`, `vite.config.ts` |
| Directories | lowercase | `clients/`, `questions/`, `tokens/` |

### Imports
- CLI uses named imports with explicit `.ts` extension:
  ```ts
  import { resolveApiKey } from "./core/optimise.ts";
  import { CORE_PROVIDERS } from "../../shared/providers/index.ts";
  ```
- Shared files import from peers without extension:
  ```ts
  import { parseQuestionsResponse } from "../questions/parse";
  ```
- `import type` for type-only imports:
  ```ts
  import type { CoreProviderId } from "./types";
  ```

### Functions
- Prefer `async/await` — no `.then()` chains
- Module-level functions use `function` declarations:
  ```ts
  export async function resolveApiKey(provider: CoreProviderId): Promise<string | null> { ... }
  ```
- Short callbacks use arrow functions:
  ```ts
  supportsModel: (model: string) => !!model,
  ```

### Error handling
- **Guard clauses** with early throws before async work:
  ```ts
  if (!apiKey) throw new Error("Missing API key.");
  ```
- **Provider API errors**: use `classifyHttpError` / `classifyOpenAIError`
  helpers that produce human-readable messages (auth, rate limiting, server
  errors, connection refused)
- Empty catch blocks are acceptable only for intentionally skippable errors
  (e.g., malformed JSON lines in a stream, failing to load a cache file)

### Comments
- File/module header: block comment explaining responsibilities
- Public functions: JSDoc with `@param` and description
- Section dividers using box-drawing characters:
  ```ts
  // ─── Clarifying questions flow ──────────────────────────────────────────
  ```
- Inline comments for non-obvious decisions only; avoid restating the code

---

## Architecture notes

### Root `shared/` — provider clients, catalog, questions
- `shared/providers/catalog.ts` defines `CoreProviderId` metadata (display name,
  default model, whether an API key is required)
- `shared/providers/types.ts` defines request/response types
- `shared/providers/index.ts` exports `optimizeWithProvider()` (dispatches via
  a provider implementation registry), `listProviderModels()`, and
  `generateQuestionsWithProvider()`
- A `PROVIDER_IMPLS` registry map in `index.ts` maps each `CoreProviderId` to
  its `{ optimize, listModels }` implementation — adding a new provider means
  adding one entry to the registry and one module in `clients/`
- Each `shared/providers/clients/*.ts` implements the actual API call for one
  provider. They export standalone async functions.
- `shared/providers/pricing.ts` has embedded pricing tables;
  `enrichModelsWithPricing()` merges pricing into model lists
- `shared/providers/prompts.ts` has the `DEFAULT_SYSTEM_PROMPT` and per-preset
  system prompts; `getSystemPrompt(preset)` selects one
- `shared/questions/` holds the clarifying-questions types, parsing, and
  enhancement logic, separate from providers
- `shared/ollama/client.ts` handles streaming NDJSON (`/api/generate`) with
  `readOllamaStream()` and model listing (`/api/tags`)

### CLI
- Bun runs `cli/cli.ts` directly — no build output (except for standalone binary)
- `cli/core/config.ts` maps CLI-specific defaults using the shared catalog
- `cli/core/optimise.ts` owns the full wizard:
  1. `resolveProviderAndModel()` — load persisted config or prompt user
  2. `chooseModel()` — searchable model picker with caching (loop, not recursion)
  3. `resolveApiKey()` — macOS Keychain → env var → null
  4. `runQuestionsFlow()` — optional clarifying questions
  5. `optimisePrompt()` — calls `optimizeWithProvider()` from shared
  6. `saveConfig()` — persist chosen provider/model
- `cli/core/keychain.ts` wraps `security` CLI for macOS Keychain (async)
- `cli/core/modelCache.ts` persists fetched model lists to
  `~/.bettercue/models-cache.json`
- `cli/core/persistence.ts` persists last-used provider/model to
  `~/.bettercue/cli-config.json`
- CLI tests use `mock.module()` from `bun:test` to stub shared provider imports
  and external dependencies

## Things that do not exist yet (stubs / planned work)
- Linter / formatter — no ESLint, Prettier, or Biome config
- Integration tests (end-to-end with real API keys)
- Pipeline/draft mode — iteratively refine a prompt through multiple rounds
- Prompt templates / saved prompts library
- Export/import of settings
