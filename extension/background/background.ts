import { createBackgroundMessageFlow } from "./messageFlow";
import { readModelsCache, writeModelsCache } from "./modelsCache";
import { getAdapter } from "./providers";
import { loadKey } from "../shared/storage/keys";

const flow = createBackgroundMessageFlow({
  getAdapter,
  loadApiKey: loadKey,
  readModelsCache,
  writeModelsCache,
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
