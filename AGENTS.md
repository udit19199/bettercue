# AGENTS.md

Guidance for agentic coding agents operating in this repository.

---

## Repository layout

```
bettercue/
├── package.json          ← Bun workspace root
├── bun.lock              ← single unified lockfile
├── cli/                  ← @bettercue/cli  (Bun runtime, no compile step)
│   ├── cli.ts
│   ├── core/
│   │   ├── config.ts
│   │   ├── ollama.ts
│   │   ├── optimise.ts   ← stub, not yet implemented
│   │   └── questions.ts  ← stub, not yet implemented
│   ├── package.json
│   └── tsconfig.json
└── extension/            ← @bettercue/extension  (Vite + Chrome MV3)
    ├── background/
    ├── content/
    ├── popup/
    ├── options/
    ├── shared/           ← imported via @shared/* alias
    ├── vite.config.ts
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
| `bun run cli` | Run the CLI against a local Ollama instance |
| `bun run extension:dev` | Vite watch build → `extension/dist/` (Chrome) |
| `bun run extension:build` | Vite production build → `extension/dist/` (Chrome/Edge) |
| `bun run extension:firefox` | Vite production build → `extension/dist-firefox/` |
| `bun run typecheck` | `tsc --noEmit` across both workspaces |

### Per-workspace commands (run from workspace directory)

```bash
# CLI
bun run --cwd cli tsc --noEmit      # typecheck CLI only

# Extension
bun run --cwd extension typecheck   # typecheck extension only
bun run --cwd extension build       # production build
bun run --cwd extension dev         # watch build
```

### Tests

No test framework is configured. There are no test files. When adding tests,
prefer **Bun's built-in test runner** (`bun test`) for the CLI and
**Vitest** for the extension (already using Vite).

To run a single test file once a test suite exists:
```bash
bun test cli/core/ollama.test.ts          # CLI — single file
bun run --cwd extension vitest run path/to/file.test.ts  # extension
```

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

### Extension (`extension/tsconfig.json`)
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`,
  `noImplicitReturns: true` — these will **fail `bun run typecheck`** if violated
- Imports must **omit file extensions** (Vite/bundler resolution)
- Use `import type` for any type-only import:
  ```ts
  import type { ProviderAdapter } from "./provider";
  ```
- The `@shared/*` alias resolves to `extension/shared/*` — use it for any
  cross-entry-point import:
  ```ts
  import { estimateTokens } from "@shared/tokens/estimator";
  ```

---

## Code style

### Formatting
- **CLI**: 4-space indentation
- **Extension**: 2-space indentation
- Semicolons throughout in extension files; CLI files are inconsistent — match
  the file you are editing
- Trailing commas in multi-line objects and arrays (extension)

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
- CLI: named imports with explicit `.ts` extension
  ```ts
  import { generatePrompt } from "./core/ollama.ts";
  ```
- Extension: named imports without extension; `import type` for types
  ```ts
  import { getAdapter } from "./providers";
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
- Guard clauses with early throws before async work:
  ```ts
  if (!apiKey) throw new Error("Missing OpenAI API key. Open Settings to add one.");
  ```
- Background worker returns structured responses — never rethrow to the caller:
  ```ts
  sendResponse({ ok: true, result });
  sendResponse({ ok: false, error: String(err?.message ?? err) });
  ```
- UI errors: set `element.textContent` and add an `"error"` CSS class; do not
  use `alert()`
- Empty catch blocks are acceptable only for intentionally skippable errors
  (e.g., skipping malformed JSON lines in a stream)

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

### CLI
- Bun runs `cli/cli.ts` directly — no build output
- `cli/core/config.ts` holds all tunable constants (`OLLAMA_URL`, `DEFAULT_MODEL`)
- Streaming is read via `for await (const chunk of response.body)` — keep this
  pattern for Ollama API calls
- `chalk` and `inquirer` are installed but not yet used — they are reserved for
  the interactive prompt UX in `optimise.ts` and `questions.ts`

### Extension
- Manifest V3. Service worker at `background/background.ts`
- Provider adapters implement `ProviderAdapter` from `shared/providers/provider.ts`
  and are registered in `background/providers.ts`
- All API keys are stored in `chrome.storage.local` only — never `sync` storage,
  never sent anywhere except the provider's own endpoint
- `shared/` is the only code shared across extension entry points; import it via
  `@shared/*` — never with relative paths that cross entry-point boundaries
- Host permissions are restricted to known AI provider domains; do not widen them

---

## Things that do not exist yet (stubs / planned work)
- `cli/core/optimise.ts` — prompt optimisation logic (empty)
- `cli/core/questions.ts` — clarifying question flow (empty)
- Tests — no test framework is set up in either workspace
- Linter / formatter — no ESLint, Prettier, or Biome config
