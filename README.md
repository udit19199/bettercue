# bettercue

A multi-provider prompt optimizer for the CLI. Takes a raw prompt and rewrites
it through an LLM (local or cloud) to be more effective, clear, and structured.
New positioning: It organises your thoughts into a structured prompt when you want to info dump.

## Setup

```bash
bun install
```

A [`bunfig.toml`](./bunfig.toml) at the project root codifies defaults:
- **`isolated` linker** — strict dependency isolation (pnpm-like) prevents phantom dependencies
- All dependency types (`dev`, `optional`, `peer`) are installed
- Production mode is off by default

## Requirements

- [Bun](https://bun.sh)
- Ollama running locally at `http://localhost:11434` (for the local provider)

## Features

### Multi-provider support
- **Ollama** (local) — no API key needed
- **OpenAI** — requires `OPENAI_API_KEY` env var or Keychain entry
- **Anthropic** — requires `ANTHROPIC_API_KEY` env var or Keychain entry
- **Google Gemini** — requires `GOOGLE_API_KEY` env var or Keychain entry

### Preset rewrite styles
Choose `concise`, `precision`, or `creative` to tune the output.

### Token estimation
Live heuristic estimate (~1 token per 4 characters) shown during optimization.

### Clarifying questions
Before optimizing, the system can generate 1–3 intelligent questions to
resolve ambiguity. Answers are appended as context into the final request.

### Multi-line input
The CLI includes a built-in multi-line text editor with full keyboard support:
- **Shift+Enter** to insert new lines
- **Arrow keys**, **Home/End**, **Option+Left/Right** for word navigation
- **Bracketed paste** — pasted multi-line text inserts correctly
- Line numbers and visual prefixes for clarity

### Model caching
Fetched model lists are cached for 1 hour in `~/.bettercue/models-cache.json`.

### Pricing display
Per-model input/output cost per 1M tokens fetched from embedded pricing
tables (OpenAI, Anthropic, Google). Ollama shows "Free (local)".

### macOS Keychain integration
Store and manage API keys securely in the system keychain:

```bash
bun run cli auth
```

Environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`)
are used as fallbacks.

### Standalone macOS binary (no Bun required)

```bash
bun run package:cli:macos
```

Artifacts are created in `dist/`:

- `dist/bettercue-macos-arm64`
- `dist/bettercue-macos-arm64.tar.gz`
- `dist/bettercue-macos-arm64.tar.gz.sha256`

On a macOS user machine:

```bash
tar -xzf bettercue-macos-arm64.tar.gz
chmod +x bettercue-macos-arm64
./bettercue-macos-arm64
```

API keys for hosted providers can be stored in macOS Keychain:

```bash
./bettercue-macos-arm64 auth
```

## Usage

```bash
bun run cli
```

The CLI opens a small terminal wizard:

1. Resolves the last-used provider and model (or prompts you to choose)
2. Checks API key availability for paid providers
3. Prompts you to enter (or paste) a prompt (supports multi-line via Shift+Enter)
4. Optionally generates and lets you answer clarifying questions
5. Rewrites the prompt through the selected LLM
6. Prints the optimized result with token usage and cost estimate
7. Persists your provider/model choice for next time

## Run tests

```bash
bun test           # all tests
bun test tests/cli/core/optimise.test.ts   # single file
```

### Frozen-lockfile install (CI)

```bash
bun ci             # fails if package.json doesn't match bun.lock
bun run ci         # same thing via package.json script
```

### Typecheck

```bash
bun run typecheck
```

## Model Pricing

| Provider | Example Models | Approx. Input/Output per 1M tokens |
|----------|----------------|-------------------------------------|
| OpenAI | gpt-5.4-mini | $0.20 / $0.80 |
| OpenAI | gpt-4.1 | $2.00 / $8.00 |
| OpenAI | gpt-4o | $2.50 / $10.00 |
| OpenAI | o1 | $15.00 / $60.00 |
| OpenAI | o3-mini | $1.10 / $4.40 |
| Anthropic | claude-sonnet-4 | $3.00 / $15.00 |
| Anthropic | claude-3-5-sonnet | $3.00 / $15.00 |
| Anthropic | claude-3-5-haiku | $0.80 / $4.00 |
| Anthropic | claude-3-opus | $15.00 / $75.00 |
| Google | gemini-2.5-flash | $0.15 / $0.60 |
| Google | gemini-2.5-pro | $1.25 / $10.00 |
| Google | gemini-2.0-flash | $0.10 / $0.40 |
| Ollama | deepseek-r1:latest | Free (local) |

Pricing data is embedded and updated periodically. Actual costs may vary.

## Project layout

```
bettercue/
├── package.json
├── bun.lock
├── bunfig.toml                    ← Bun config (isolated linker, deps policy)
├── cli/                           ← @bettercue/cli
│   ├── cli.ts                     ← entry point
│   ├── core/
│   │   ├── config.ts              ← defaults, constants, getOllamaBaseUrl
│   │   ├── keychain.ts            ← macOS Keychain via `security` CLI
│   │   ├── modelCache.ts          ← JSON file cache (~/.bettercue/models-cache.json)
│   │   ├── multilineInput.ts      ← multi-line terminal input component
│   │   ├── optimise.ts            ← wizard: input, choose, optimize, output
│   │   ├── persistence.ts         ← CLI state persistence (~/.bettercue/cli-config.json)
│   ├── env.d.ts
│   ├── package.json
│   └── tsconfig.json
├── shared/                        ← Shared by consumers (CLI, API)
│   ├── ollama/
│   │   ├── client.ts              ← Ollama /api/generate (streaming), /api/tags
│   │   └── index.ts
│   ├── providers/
│   │   ├── catalog.ts             ← Provider metadata (displayName, defaultModel, requiresApiKey)
│   │   ├── clients/               ← Provider-specific API implementations
│   │   │   ├── anthropic.ts
│   │   │   ├── google.ts
│   │   │   ├── ollama.ts
│   │   │   └── openai.ts
│   │   ├── index.ts               ← optimizeWithProvider, listProviderModels, registry
│   │   ├── pricing.ts             ← Per-model pricing tables
│   │   ├── prompts.ts             ← System prompts per preset
│   │   └── types.ts               ← CoreProviderId, OptimizeRequest/Response, etc.
│   ├── questions/
│   │   ├── enhance.ts             ← buildEnhancedPrompt
│   │   ├── index.ts
│   │   ├── parse.ts               ← parseQuestionsResponse
│   │   ├── systemPrompt.ts        ← QUESTIONS_SYSTEM_PROMPT
│   │   └── types.ts               ← Question type
│   └── tokens/
│       └── estimator.ts           ← heuristicTokens
└── tests/                         ← All test suites (bun:test)
    ├── cli/
    │   └── core/
    │       ├── modelCache.test.ts
    │       └── optimise.test.ts
    └── shared/
        ├── ollama/
        │   └── ollama.test.ts
        ├── providers/
        │   ├── index.test.ts
        │   ├── pricing.test.ts
        │   └── prompts.test.ts
        ├── questions/
        │   ├── enhance.test.ts
        │   └── parse.test.ts
        └── tokens/
            └── estimator.test.ts
```
