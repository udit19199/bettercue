const promptEl = document.getElementById("prompt") as HTMLTextAreaElement;
const providerEl = document.getElementById("provider") as HTMLSelectElement;
const modelEl = document.getElementById("model") as HTMLInputElement;
const optimizeBtn = document.getElementById("optimize") as HTMLButtonElement;
const previewEl = document.getElementById("preview") as HTMLDivElement;
const copyBtn = document.getElementById("copy") as HTMLButtonElement;
const replaceBtn = document.getElementById("replace") as HTMLButtonElement;

optimizeBtn.addEventListener("click", async () => {
  const original = promptEl.value;
  const provider = providerEl.value;
  const model = modelEl.value || "gpt-4o";
  previewEl.textContent = "Optimizing...";

  chrome.runtime.sendMessage(
    { type: "rewrite", payload: { adapterId: provider, model, apiKey: null, original, options: { preset: "concise" } } },
    (resp) => {
      if (!resp) return;
      if (resp.ok) {
        previewEl.textContent = resp.result.optimizedPrompt;
      } else {
        previewEl.textContent = `Error: ${resp.error}`;
      }
    }
  );
});

copyBtn.addEventListener("click", async () => {
  const text = previewEl.textContent || "";
  await navigator.clipboard.writeText(text);
});

replaceBtn.addEventListener("click", async () => {
  const text = previewEl.textContent || "";
  // send to active tab to replace selection
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0];
    if (!tab?.id) return;
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (replacement) => {
        const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
        if (active && (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && (active as any).type === 'text'))) {
          (active as any).value = replacement;
        } else {
          // fallback: try to replace window selection
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            sel.deleteFromDocument();
            sel.getRangeAt(0).insertNode(document.createTextNode(replacement));
          }
        }
      },
      args: [text]
    });
  });
});
