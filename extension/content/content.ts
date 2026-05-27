/**
 * Content script — injected into every page by the manifest.
 *
 * Responsibilities:
 *  Listen for the `bettercue-selection` custom event dispatched by the
 *  background service worker (via chrome.scripting.executeScript) when the
 *  user right-clicks selected text and chooses "Optimize prompt".
 *  Forwards the selected text to the extension popup via a runtime message.
 *
 * This script is intentionally minimal — no DOM mutation on load, no polling.
 */

// ── 1. Receive selected text from background and forward to popup ─────────────

window.addEventListener("bettercue-selection", (event: Event) => {
  const text = (event as CustomEvent<string>).detail;
  if (!text) return;
  // The popup listens for this message type to pre-fill the prompt textarea.
  chrome.runtime.sendMessage({ type: "fill-selection", text });
});

