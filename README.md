# bettercue

A monorepo containing two packages:

- **`cli/`** — Bun-based CLI tool that optimises prompts via a local Ollama model
- **`extension/`** — Browser extension (Chrome/Firefox) built with Vite

## Setup

Install all dependencies from the root (single `bun install` covers both packages):

```bash
bun install
```

A [`bunfig.toml`](./bunfig.toml) at the project root codifies defaults:
- **`isolated` linker** — strict dependency isolation (pnpm-like) prevents phantom dependencies
- All dependency types (`dev`, `optional`, `peer`) are installed
- Production mode is off by default

## Requirements

- Bun
- Ollama running locally at `http://localhost:11434` for the CLI and the Ollama provider in the extension

## Features

### Searchable Model Selector with Pricing

The extension popup includes a searchable model selector that:

- **Fetches available models** from each provider's API dynamically
- **Search as you type** to filter models by name
- **Displays pricing information** (input/output cost per 1M tokens) next to each model
- **Keyboard navigation** with arrow keys, Enter to select, Escape to close
- Shows "Free (local)" for Ollama models

Supported providers for model listing:
- **OpenAI** — Fetches from `/v1/models` API
- **Anthropic** — Fetches from `/v1/models` API
- **Google Gemini** — Fetches from Gemini API (filters to text generation models)
- **Ollama** — Fetches from local `/api/tags` endpoint

### Interactive Clarifying Questions

Before optimizing a prompt, the system can generate 1-3 clarifying questions to improve the output:

1. Click "Optimize Prompt" — the system analyzes your prompt
2. If clarification would help, relevant questions appear
3. Answer the questions (optional) or click "Skip & Optimize"
4. Click "Optimize with Answers" to include your responses in the enhanced prompt

The question generation is intelligent and only asks questions when there is genuine ambiguity. Clear, specific prompts proceed directly to optimization.

## Usage

### CLI

```bash
bun run cli
```

The CLI opens a small terminal wizard:
- enter a prompt
- choose a provider (providers without configured API keys are shown as disabled)
- fetch provider models on demand and pick from a searchable list
- optionally enter a model name manually if list fetching fails or no match is found
- review the rewritten prompt in the console
- the process exits once the optimized prompt is printed

#### macOS standalone binary (no Bun required on user machines)

Build and package:

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

### Extension

```bash
# Development (watch mode)
bun run extension:dev

# Production build (Chrome/Edge)
bun run extension:build

# Production build (Firefox)
bun run extension:firefox
```

#### Using the Extension

1. **Install the extension** — Load the `extension/dist` folder as an unpacked extension in Chrome/Edge
2. **Configure API keys** — Click the settings icon (⚙) to open the options page and add your API keys for OpenAI, Anthropic, or Google
3. **Select a provider** — Choose from OpenAI, Anthropic, Google, Ollama (local), or Mock (offline)
4. **Choose a model** — Use the searchable dropdown to find and select a model. Pricing is displayed for paid providers.
5. **Enter your prompt** — Type or paste your prompt in the text area
6. **Optimize** — Click "Optimize Prompt" to:
   - Answer optional clarifying questions (if any appear)
   - Or skip directly to optimization
7. **Use the result** — Copy the optimized prompt or replace the selected text in the active tab

#### Provider-Specific Notes

- **Ollama** — Requires Ollama running locally. No API key needed. Models are fetched from your local instance.
- **OpenAI/Anthropic/Google** — Requires API keys configured in the extension options. Model lists are fetched and cached for 1 hour.
- **Mock** — Offline testing mode with no API calls.

### Run tests

```bash
bun test           # all workspace tests
bun test cli/core/optimise.test.ts   # single file
```

### Frozen-lockfile install (CI)

```bash
bun ci             # fails if package.json doesn't match bun.lock
bun run ci         # same thing via package.json script
```

### Typecheck all packages

```bash
bun run typecheck
```

## CI

The repository includes a [GitHub Actions workflow](.github/workflows/ci.yml) that runs on every push and pull request to `main`:

1. **`bun ci`** — installs exact versions from `bun.lock` (reproducible builds)
2. **`bun run typecheck`** — TypeScript type-checking across both workspaces
3. **`bun test`** — all workspace tests
4. **Extension builds** — Chrome and Firefox production builds

## Model Pricing

The extension displays estimated costs for each model:

| Provider | Example Models | Approx. Input/Output per 1M tokens |
|----------|----------------|-------------------------------------|
| OpenAI | gpt-4o-mini | $0.15 / $0.60 |
| OpenAI | gpt-4o | $2.50 / $10.00 |
| Anthropic | claude-3-5-haiku | $0.80 / $4.00 |
| Anthropic | claude-3-5-sonnet | $3.00 / $15.00 |
| Google | gemini-2.0-flash | $0.10 / $0.40 |
| Ollama | (any) | Free (local) |

Pricing data is embedded in the extension and updated periodically. Actual costs may vary.
