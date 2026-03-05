import { getAdapter } from "./providers";

// Simple message handler for rewrite requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "rewrite") {
        const { adapterId, model, apiKey, original, options } = message.payload;
        const adapter = getAdapter(adapterId);
        if (!adapter) throw new Error(`Adapter not found: ${adapterId}`);
        const result = await adapter.rewritePrompt(original, model, apiKey, options);
        sendResponse({ ok: true, result });
      }
    } catch (err: any) {
      sendResponse({ ok: false, error: String(err?.message ?? err) });
    }
  })();
  return true; // indicate async response
});

// Create context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "optimize-selection", title: "Optimize prompt", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "optimize-selection" && info.selectionText && tab?.id) {
    // open popup or send to active tab - for MVP just send a message
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (selected) => {
        // dispatch a custom event in the page with the selection
        window.dispatchEvent(new CustomEvent('promptpilot-selection', { detail: selected }));
      },
      args: [info.selectionText]
    });
  }
});
