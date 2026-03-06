# better-cue (formerly better-gpt)

A monorepo containing two packages:

- **`cli/`** — Bun-based CLI tool that optimises prompts via a local Ollama model
- **`extension/`** — Browser extension (Chrome/Firefox) built with Vite

## Setup

Install all dependencies from the root (single `bun install` covers both packages):

```bash
bun install
```

## Usage

### CLI

```bash
bun run cli
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

### Typecheck all packages

```bash
bun run typecheck
```
