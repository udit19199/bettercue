import chalk from "chalk";

/**
 * Multi-line terminal input component.
 *
 * Keybindings:
 * - Enter             Submit
 * - Shift+Enter       Insert a new line
 * - Backspace         Delete char before cursor (join with previous line at col 0)
 * - Delete            Delete char after cursor (join with next line at end)
 * - Left / Right      Move cursor horizontally (wraps across lines)
 * - Up / Down         Move cursor between lines
 * - Cmd+Left (Home)   Move to beginning of line
 * - Cmd+Right (End)   Move to end of line
 * - Option+Left       Move one word left
 * - Option+Right      Move one word right
 * - Cmd+Backspace     Delete from cursor to beginning of line
 * - Option+Backspace  Delete previous word
 * - Ctrl+C            Cancel
 * - Ctrl+D            Submit
 *
 * Supports bracketed paste mode — pasted multi-line text inserts new lines
 * instead of submitting.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

type InputState = {
    lines: string[];
    row: number;
    col: number;
};

const enum Action {
    Submit,
    Cancel,
    NewLine,
    Char,
    Backspace,
    Delete,
    Left,
    Right,
    Up,
    Down,
    Home,
    End,
    WordLeft,
    WordRight,
    DeleteToStart,
    DeleteWord,
    Unknown,
}

// ─── Key parsing ─────────────────────────────────────────────────────────────

function parseKey(
    data: string,
    inPaste: boolean,
): { action: Action; char?: string; consumed: number } {
    // ── Single-byte keys ────────────────────────────────────────────────

    if (data === "\r" || data === "\n") {
        return { action: inPaste ? Action.NewLine : Action.Submit, consumed: 1 };
    }
    if (data === "\x03") return { action: Action.Cancel, consumed: 1 };        // Ctrl+C
    if (data === "\x04") return { action: Action.Submit, consumed: 1 };         // Ctrl+D
    if (data === "\x15") return { action: Action.DeleteToStart, consumed: 1 };  // Ctrl+U / Cmd+Backspace
    if (data === "\x17") return { action: Action.DeleteWord, consumed: 1 };     // Ctrl+W / Option+Backspace
    if (data === "\x7f" || data === "\b") return { action: Action.Backspace, consumed: 1 };

    // ── Multi-byte escape sequences (longest first) ─────────────────────

    // Shift+Enter  (ESC [ 13 ; 2 ~)
    if (data.startsWith("\x1b[13;2~")) return { action: Action.NewLine, consumed: 7 };

    // Option+Left  (ESC [ 1 ; 3 D)
    if (data.startsWith("\x1b[1;3D")) return { action: Action.WordLeft, consumed: 6 };
    // Option+Right (ESC [ 1 ; 3 C)
    if (data.startsWith("\x1b[1;3C")) return { action: Action.WordRight, consumed: 6 };

    // Cmd+Left     (ESC [ 1 ; 9 D)
    if (data.startsWith("\x1b[1;9D")) return { action: Action.Home, consumed: 6 };
    // Cmd+Right    (ESC [ 1 ; 9 C)
    if (data.startsWith("\x1b[1;9C")) return { action: Action.End, consumed: 6 };

    // Bracketed paste boundaries
    if (data.startsWith("\x1b[200~")) return { action: Action.Unknown, consumed: 6 };
    if (data.startsWith("\x1b[201~")) return { action: Action.Unknown, consumed: 6 };

    // Delete       (ESC [ 3 ~)
    if (data.startsWith("\x1b[3~")) return { action: Action.Delete, consumed: 4 };

    // Home         (ESC [ H  or  ESC O H)
    if (data.startsWith("\x1b[H") || data.startsWith("\x1bOH")) return { action: Action.Home, consumed: 3 };
    // End          (ESC [ F  or  ESC O F)
    if (data.startsWith("\x1b[F") || data.startsWith("\x1bOF")) return { action: Action.End, consumed: 3 };

    // Arrow keys
    if (data.startsWith("\x1b[A")) return { action: Action.Up, consumed: 3 };
    if (data.startsWith("\x1b[B")) return { action: Action.Down, consumed: 3 };
    if (data.startsWith("\x1b[C")) return { action: Action.Right, consumed: 3 };
    if (data.startsWith("\x1b[D")) return { action: Action.Left, consumed: 3 };

    // Option+Left  (ESC b) — Terminal.app
    if (data.startsWith("\x1bb")) return { action: Action.WordLeft, consumed: 2 };
    // Option+Right (ESC f) — Terminal.app
    if (data.startsWith("\x1bf")) return { action: Action.WordRight, consumed: 2 };

    // Other ESC sequences — skip
    if (data[0] === "\x1b") {
        const match = data.match(/^\x1b\[[0-9;]*[A-Za-z~]/);
        if (match) return { action: Action.Unknown, consumed: match[0].length };
        return { action: Action.Unknown, consumed: 1 };
    }

    // Regular character
    return { action: Action.Char, char: data[0], consumed: 1 };
}

// ─── Word boundary helpers ───────────────────────────────────────────────────

function isWordChar(c: string): boolean {
    return /\w/.test(c);
}

function findWordStart(line: string, col: number): number {
    let i = col;
    while (i > 0 && !isWordChar(line[i - 1]!)) i--;
    while (i > 0 && isWordChar(line[i - 1]!)) i--;
    return i;
}

function findWordEnd(line: string, col: number): number {
    let i = col;
    while (i < line.length && isWordChar(line[i]!)) i++;
    while (i < line.length && !isWordChar(line[i]!)) i++;
    return i;
}

// ─── Rendering helpers ───────────────────────────────────────────────────────

function prefixWidth(totalLines: number): number {
    return String(totalLines).length + 5;
}

function renderPrefix(lineNum: number, totalLines: number): string {
    const w = String(totalLines).length;
    return chalk.gray(`  ${String(lineNum).padStart(w)} │ `);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type MultilineInputOptions = {
    message: string;
};

/**
 * Prompt the user for multi-line input directly in the terminal.
 *
 * @returns The entered text (may contain newlines)
 * @throws {Error} "Input cancelled" if the user presses Ctrl+C
 */
export async function multilineInput(
    options: MultilineInputOptions,
): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const stdin = process.stdin;
        const stdout = process.stdout;

        if (!stdin.isTTY || !stdout.isTTY) {
            reject(new Error("multilineInput requires a TTY"));
            return;
        }

        // ── State ────────────────────────────────────────────────────────
        const state: InputState = { lines: [""], row: 0, col: 0 };
        let renderedRows = 0;
        let previousRow = 0;
        let buffer = "";
        let inPaste = false;
        let done = false;

        // ── Header ───────────────────────────────────────────────────────
        stdout.write(
            chalk.cyan("? ") +
                chalk.bold(options.message) +
                chalk.dim("  (Enter to submit, Shift+Enter for new line)\n"),
        );

        // ── Enable raw mode + bracketed paste ────────────────────────────
        stdin.setRawMode!(true);
        stdin.resume();
        stdin.setEncoding("utf8");
        stdout.write("\x1b[?2004h");

        // Initial full render
        renderAll();
        positionCursor();

        // ── Render: full redraw ──────────────────────────────────────────
        function renderAll() {
            // Move to top of input area
            if (previousRow > 0) stdout.write(`\x1b[${previousRow}A`);

            // Draw each line
            for (let i = 0; i < state.lines.length; i++) {
                stdout.write("\r\x1b[2K");
                stdout.write(renderPrefix(i + 1, state.lines.length));
                stdout.write(state.lines[i] || "");
                if (i < state.lines.length - 1) stdout.write("\n");
            }

            // Clear leftover lines from a previous (longer) render
            for (let i = state.lines.length; i < renderedRows; i++) {
                stdout.write("\n\r\x1b[2K");
            }

            previousRow = Math.max(state.lines.length, renderedRows) - 1;
        }

        // ── Render: single-line redraw ───────────────────────────────────
        function renderLine(row: number) {
            // If prefix width changed (line count crossed 10/100/etc), full redraw
            if (prefixWidth(state.lines.length) !== prefixWidth(renderedRows)) {
                renderAll();
                return;
            }

            // Move from previousRow to target row
            if (previousRow !== row) {
                const diff = previousRow - row;
                if (diff > 0) stdout.write(`\x1b[${diff}A`);
                else stdout.write(`\x1b[${-diff}B`);
            }

            // Clear and redraw this one line
            stdout.write("\r\x1b[2K");
            stdout.write(renderPrefix(row + 1, state.lines.length));
            stdout.write(state.lines[row] || "");

            previousRow = row;
        }

        // ── Cursor positioning ───────────────────────────────────────────
        function positionCursor() {
            // Move to correct row
            if (previousRow !== state.row) {
                const diff = previousRow - state.row;
                if (diff > 0) stdout.write(`\x1b[${diff}A`);
                else stdout.write(`\x1b[${-diff}B`);
            }

            // Move to correct column
            stdout.write("\r");
            const targetCol = prefixWidth(state.lines.length) + state.col;
            if (targetCol > 0) stdout.write(`\x1b[${targetCol}C`);

            previousRow = state.row;
            renderedRows = state.lines.length;
        }

        // ── Cleanup ──────────────────────────────────────────────────────
        function cleanup(submit: boolean) {
            if (done) return;
            done = true;

            stdin.removeListener("data", onData);
            stdin.setRawMode!(false);
            stdin.pause();
            stdout.write("\x1b[?2004l");

            // Move cursor past the last rendered row
            const fromBottom = state.lines.length - 1 - state.row;
            if (fromBottom > 0) stdout.write(`\x1b[${fromBottom}B`);
            stdout.write("\n");

            if (submit) resolve(state.lines.join("\n"));
            else reject(new Error("Input cancelled"));
        }

        // ── Key handler ──────────────────────────────────────────────────
        function handleKey() {
            const parsed = parseKey(buffer, inPaste);
            buffer = buffer.slice(parsed.consumed);

            switch (parsed.action) {
                case Action.Submit:
                    cleanup(true);
                    return;

                case Action.Cancel:
                    cleanup(false);
                    return;

                case Action.NewLine: {
                    const line = state.lines[state.row]!;
                    const before = line.slice(0, state.col);
                    const after = line.slice(state.col);
                    state.lines[state.row] = before;
                    state.lines.splice(state.row + 1, 0, after);
                    state.row++;
                    state.col = 0;
                    renderAll();
                    positionCursor();
                    return;
                }

                case Action.Char: {
                    const line = state.lines[state.row]!;
                    state.lines[state.row] =
                        line.slice(0, state.col) + parsed.char! + line.slice(state.col);
                    state.col++;
                    renderLine(state.row);
                    positionCursor();
                    return;
                }

                case Action.Backspace: {
                    if (state.col > 0) {
                        const line = state.lines[state.row]!;
                        state.lines[state.row] =
                            line.slice(0, state.col - 1) + line.slice(state.col);
                        state.col--;
                        renderLine(state.row);
                    } else if (state.row > 0) {
                        const current = state.lines[state.row]!;
                        state.col = state.lines[state.row - 1]!.length;
                        state.lines[state.row - 1]! += current;
                        state.lines.splice(state.row, 1);
                        state.row--;
                        renderAll();
                    }
                    positionCursor();
                    return;
                }

                case Action.Delete: {
                    const line = state.lines[state.row]!;
                    if (state.col < line.length) {
                        state.lines[state.row] =
                            line.slice(0, state.col) + line.slice(state.col + 1);
                        renderLine(state.row);
                    } else if (state.row < state.lines.length - 1) {
                        state.lines[state.row]! += state.lines[state.row + 1]!;
                        state.lines.splice(state.row + 1, 1);
                        renderAll();
                    }
                    positionCursor();
                    return;
                }

                case Action.Up:
                    if (state.row > 0) {
                        state.row--;
                        state.col = Math.min(state.col, state.lines[state.row]!.length);
                    }
                    positionCursor();
                    return;

                case Action.Down:
                    if (state.row < state.lines.length - 1) {
                        state.row++;
                        state.col = Math.min(state.col, state.lines[state.row]!.length);
                    }
                    positionCursor();
                    return;

                case Action.Left:
                    if (state.col > 0) {
                        state.col--;
                    } else if (state.row > 0) {
                        state.row--;
                        state.col = state.lines[state.row]!.length;
                    }
                    positionCursor();
                    return;

                case Action.Right: {
                    const line = state.lines[state.row]!;
                    if (state.col < line.length) {
                        state.col++;
                    } else if (state.row < state.lines.length - 1) {
                        state.row++;
                        state.col = 0;
                    }
                    positionCursor();
                    return;
                }

                case Action.Home:
                    state.col = 0;
                    positionCursor();
                    return;

                case Action.End:
                    state.col = state.lines[state.row]!.length;
                    positionCursor();
                    return;

                case Action.WordLeft: {
                    if (state.col === 0 && state.row > 0) {
                        state.row--;
                        state.col = state.lines[state.row]!.length;
                    } else {
                        state.col = findWordStart(state.lines[state.row]!, state.col);
                    }
                    positionCursor();
                    return;
                }

                case Action.WordRight: {
                    const line = state.lines[state.row]!;
                    if (state.col === line.length && state.row < state.lines.length - 1) {
                        state.row++;
                        state.col = 0;
                    } else {
                        state.col = findWordEnd(line, state.col);
                    }
                    positionCursor();
                    return;
                }

                case Action.DeleteToStart: {
                    state.lines[state.row] = state.lines[state.row]!.slice(state.col);
                    state.col = 0;
                    renderLine(state.row);
                    positionCursor();
                    return;
                }

                case Action.DeleteWord: {
                    if (state.col === 0 && state.row > 0) {
                        const current = state.lines[state.row]!;
                        state.col = state.lines[state.row - 1]!.length;
                        state.lines[state.row - 1]! += current;
                        state.lines.splice(state.row, 1);
                        state.row--;
                        renderAll();
                    } else {
                        const line = state.lines[state.row]!;
                        const newCol = findWordStart(line, state.col);
                        state.lines[state.row] = line.slice(0, newCol) + line.slice(state.col);
                        state.col = newCol;
                        renderLine(state.row);
                    }
                    positionCursor();
                    return;
                }

                default:
                    return;
            }
        }

        // ── Data handler ─────────────────────────────────────────────────
        function onData(chunk: Buffer) {
            buffer += chunk.toString();

            while (buffer.length > 0) {
                if (buffer.startsWith("\x1b[200~")) {
                    inPaste = true;
                    buffer = buffer.slice(6);
                    continue;
                }
                if (buffer.startsWith("\x1b[201~")) {
                    inPaste = false;
                    buffer = buffer.slice(6);
                    continue;
                }

                const before = buffer.length;
                handleKey();
                if (done) return;

                if (buffer.length >= before) {
                    buffer = buffer.slice(1);
                }
            }
        }

        stdin.on("data", onData);
    });
}
