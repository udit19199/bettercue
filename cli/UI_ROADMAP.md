# UI/UX Improvement Roadmap

Tracking ideas for improving the bettercue CLI experience.

---

## 1. Multi-line prompt input
**Status:** In progress

Replace the `inquirer` editor (opens `$EDITOR`) with an in-terminal multi-line input box.
- Enter to submit, Shift+Enter for new line
- Arrow key navigation, backspace across lines
- Bracketed paste support for pasting multi-line text

## 2. Spinner / progress feedback
**Status:** Planned

The "Optimising with ..." message is just static gray text. Replace with:
- A spinner (`ora` or `@topcli/spinner`) during API calls
- Show elapsed time if the call takes >2s

## 3. Streaming output
**Status:** Planned

Show tokens as they arrive instead of waiting for the full response.
- Ollama already supports streaming via `readOllamaStream()`
- OpenAI and Anthropic also support streaming
- Feels much faster even if total time is the same

## 4. Output display
**Status:** Planned

The optimized prompt is just `chalk.white(text)`. Improve with:
- Boxed or bordered output for visual separation from the rest of the terminal
- Before/after diff view (highlight what changed)
- Word count / reading level alongside token/cost info

## 5. Clarifying questions flow
**Status:** Planned

Works but feels disconnected. Improve with:
- Boxed section or bordered layout
- Progress indicator ("Question 1 of 3")
- Summary of collected answers before proceeding to optimization

## 6. Banner & branding
**Status:** Planned

Currently just `bettercue - multi-provider prompt optimizer`. Options:
- Compact ASCII art or stylized logo
- Show version number
- Show current provider/model from persisted config

## 7. Stdin / pipe mode
**Status:** Planned

Support `echo "my prompt" | bettercue` for scripting and composability.
- Detect non-TTY stdin and read from pipe
- Skip interactive prompts, use defaults or flags

## 8. Command-line flags
**Status:** Planned

Allow `--provider`, `--model`, `--preset` flags to skip interactive selection.
- Useful for scripting and repeat workflows
- Combine with stdin mode for full non-interactive usage
