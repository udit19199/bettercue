import { getAdapter } from "./providers";

// Simple message handler for rewrite requests
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "rewrite") {
        const { adapterId, model, apiKey, original, options } = message.payload;
        const adapter = getAdapter(adapterId);
        if (!adapter) throw new Error(`Adapter not found: ${adapterId}`);
        const result = await adapter.rewritePrompt(original, model, apiKey, options);
        sendResponse({ ok: true, result });
      }

      // List models for a provider (background handles API key & CORS)
      if (message?.type === "list-models") {
        const { provider } = message.payload || {};
        const adapter = getAdapter(provider);
        if (!adapter) return sendResponse({ ok: false, error: `Adapter not found: ${provider}` });
        try {
          // read api key from storage
          const { providers = {} } = await (new Promise<Record<string, any>>((res) =>
            chrome.storage.local.get(["providers"], (r) => res(r || {}))
          ));
          const apiKey = providers?.[provider]?.apiKey ?? null;
          if (!adapter.listModels) return sendResponse({ ok: false, error: "Listing not supported for this provider" });
          const models = await adapter.listModels(apiKey);
          // cache briefly
          chrome.storage.local.set({ [`models.${provider}`]: { items: models, fetchedAt: Date.now() } });
          return sendResponse({ ok: true, models });
        } catch (err: any) {
          return sendResponse({ ok: false, error: String(err?.message ?? err) });
        }
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
        window.dispatchEvent(new CustomEvent('bettercue-selection', { detail: selected }));
      },
      args: [info.selectionText]
    });
  }
});
