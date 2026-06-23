// Minimal service worker — ready for future API integration.
chrome.runtime.onInstalled.addListener(() => {
  console.log("bettercue extension installed.");
});
