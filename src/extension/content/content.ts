/**
 * Content script — injected into every page by the manifest.
 *
 * Responsibilities:
 *  1. Listen for the `promptpilot-selection` custom event dispatched by the
 *     background service worker (via chrome.scripting.executeScript) when the
 *     user right-clicks selected text and chooses "Optimize prompt".
 *     Forwards the selected text to the extension popup via a runtime message.
 *
 *  2. Expose a `promptpilot-replace` listener so the popup can ask the content
 *     script to replace the currently focused input/textarea value without
 *     needing scripting permissions for every individual page action.
 *
 * This script is intentionally minimal — no DOM mutation on load, no polling.
 */

// ── 1. Receive selected text from background and forward to popup ─────────────

window.addEventListener("promptpilot-selection", (event: Event) => {
  const text = (event as CustomEvent<string>).detail;
  if (!text) return;
  // The popup listens for this message type to pre-fill the prompt textarea.
  chrome.runtime.sendMessage({ type: "fill-selection", text });
});

// ── 2. Receive replace-selection command from background/popup ────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== "replace-selection") return;
  const replacement: string = message.text ?? "";
  if (!replacement) return;

  const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;

  if (
    active &&
    (active.tagName === "TEXTAREA" ||
      (active.tagName === "INPUT" && (active as HTMLInputElement).type === "text"))
  ) {
    // Replace full value (matches popup "Replace Selection" behaviour)
    active.value = replacement;
    // Fire input event so React/Vue/framework listeners pick up the change
    active.dispatchEvent(new Event("input", { bubbles: true }));
    active.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  // Fallback: replace the current window text selection (works in contenteditable)
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    sel.deleteFromDocument();
    const range = sel.getRangeAt(0);
    range.insertNode(document.createTextNode(replacement));
    // Collapse cursor to end of inserted text
    range.collapse(false);
  }
});
