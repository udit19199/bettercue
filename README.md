# bettercue

A monorepo containing two packages:

- **`cli/`** — Bun-based CLI tool that optimises prompts via a local Ollama model
- **`extension/`** — Browser extension (Chrome/Firefox) built with Vite

## Setup

Install all dependencies from the root (single `bun install` covers both packages):

```bash
bun install
```

## Requirements

- Bun
- Ollama running locally at `http://localhost:11434` for the CLI and the Ollama provider in the extension

## Usage

### CLI

```bash
bun run cli
```

The CLI opens a small terminal wizard:
- enter a prompt
- choose a provider and model
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

In the extension popup, choose a provider and model, then rewrite the prompt.
Ollama is available as a first-class provider and does not require an API key.

### Typecheck all packages

```bash
bun run typecheck
```
