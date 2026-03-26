import { createBackgroundMessageFlow } from "./messageFlow";
import { getAdapter } from "./providers";
import { loadKey } from "../shared/storage/keys";

const flow = createBackgroundMessageFlow({
  getAdapter,
  loadApiKey: loadKey,
  readModelsCache: async (providerId) => {
    const cacheKey = `models.${providerId}`;
    const result = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get([cacheKey], (items) => resolve(items || {}));
    });

    const cached = result[cacheKey];
    if (
      cached &&
      typeof cached === "object" &&
      cached !== null &&
      Array.isArray((cached as { items?: unknown }).items) &&
      typeof (cached as { fetchedAt?: unknown }).fetchedAt === "number"
    ) {
      return cached as { items: string[]; fetchedAt: number };
    }

    return null;
  },
  writeModelsCache: async (providerId, models, fetchedAt) => {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ [`models.${providerId}`]: { items: models, fetchedAt } }, resolve);
    });
  },
  now: () => Date.now(),
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    const reply = await flow.handle(message);
    sendResponse(reply);
  })();

  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "optimize-selection", title: "Optimize prompt", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "optimize-selection" && info.selectionText && tab?.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (selected) => {
        window.dispatchEvent(new CustomEvent("bettercue-selection", { detail: selected }));
      },
      args: [info.selectionText],
    });
  }
});
