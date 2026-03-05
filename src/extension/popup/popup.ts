import { loadKey, loadLastUsedModel, saveLastUsedModel, loadPreciseTokensSetting, type ProviderId } from "../shared/storage/keys";

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const promptEl      = document.getElementById("prompt")   as HTMLTextAreaElement;
const providerEl    = document.getElementById("provider") as HTMLSelectElement;
const modelEl       = document.getElementById("model")    as HTMLInputElement;
const presetEl      = document.getElementById("preset")   as HTMLSelectElement;
const optimizeBtn   = document.getElementById("optimize") as HTMLButtonElement;
const previewEl     = document.getElementById("preview")  as HTMLDivElement;
const tokenEstEl    = document.getElementById("token-est") as HTMLSpanElement;
const copyBtn       = document.getElementById("copy")     as HTMLButtonElement;
const replaceBtn    = document.getElementById("replace")  as HTMLButtonElement;
const settingsBtn   = document.getElementById("settings") as HTMLButtonElement;
const noKeyWarning  = document.getElementById("no-key-warning") as HTMLDivElement;

// ─── Defaults per provider ────────────────────────────────────────────────────

const DEFAULT_MODELS: Record<string, string> = {
  openai:    "gpt-4o",
  anthropic: "claude-3-5-sonnet-20241022",
  google:    "gemini-2.0-flash",
  mock:      "mock-model",
};

// ─── Init: restore last-used model and check key ─────────────────────────────

async function init() {
  const provider = providerEl.value as ProviderId;
  const lastModel = await loadLastUsedModel(provider);
  modelEl.value = lastModel ?? DEFAULT_MODELS[provider] ?? "";
  await checkKey(provider);

  // populate token estimate for current input
  updateTokenEstimate();
}

async function checkKey(provider: ProviderId) {
  if (provider === "mock") {
    noKeyWarning.hidden = true;
    return;
  }
  const key = await loadKey(provider);
  noKeyWarning.hidden = !!key;
}

// ─── Provider change ──────────────────────────────────────────────────────────

providerEl.addEventListener("change", async () => {
  const provider = providerEl.value as ProviderId;
  const lastModel = await loadLastUsedModel(provider);
  modelEl.value = lastModel ?? DEFAULT_MODELS[provider] ?? "";
  await checkKey(provider);
});

// ─── Token estimate (heuristic; updates on input change) ─────────────────────

function heuristicTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

function updateTokenEstimate() {
  const count = heuristicTokens(promptEl.value);
  tokenEstEl.textContent = `~${count} tokens`;
}

promptEl.addEventListener("input", updateTokenEstimate);

// ─── Optimize ─────────────────────────────────────────────────────────────────

optimizeBtn.addEventListener("click", async () => {
  const original = promptEl.value.trim();
  if (!original) return;

  const provider = providerEl.value as ProviderId;
  const model    = modelEl.value || DEFAULT_MODELS[provider];
  const preset   = presetEl.value;

  // Load the stored API key (null for mock)
  const apiKey = provider === "mock" ? null : await loadKey(provider);

  if (provider !== "mock" && !apiKey) {
    previewEl.textContent = "No API key found. Open Settings to add one.";
    previewEl.classList.add("error");
    return;
  }

  previewEl.classList.remove("error");
  previewEl.textContent = "Optimizing…";
  optimizeBtn.disabled = true;

  // Load precise-tokens preference (for future use by background)
  const preciseTokens = await loadPreciseTokensSetting();

  chrome.runtime.sendMessage(
    {
      type: "rewrite",
      payload: {
        adapterId: provider,
        model,
        apiKey,
        original,
        options: { preset, preciseTokens },
      },
    },
    (resp) => {
      optimizeBtn.disabled = false;
      if (!resp) {
        previewEl.textContent = "Error: no response from background.";
        previewEl.classList.add("error");
        return;
      }
      if (resp.ok) {
        previewEl.textContent = resp.result.optimizedPrompt;
        previewEl.classList.remove("error");
        const est = resp.result.tokenEstimate;
        if (est) tokenEstEl.textContent = `~${est} tokens (optimized)`;
        // persist last-used model
        saveLastUsedModel(provider, model);
      } else {
        previewEl.textContent = `Error: ${resp.error}`;
        previewEl.classList.add("error");
      }
    }
  );
});

// ─── Copy ─────────────────────────────────────────────────────────────────────

copyBtn.addEventListener("click", async () => {
  const text = previewEl.textContent || "";
  if (!text || previewEl.classList.contains("error")) return;
  await navigator.clipboard.writeText(text);
  copyBtn.textContent = "Copied!";
  setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
});

// ─── Replace selection in active tab ─────────────────────────────────────────

replaceBtn.addEventListener("click", () => {
  const text = previewEl.textContent || "";
  if (!text || previewEl.classList.contains("error")) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0];
    if (!tab?.id) return;
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (replacement: string) => {
        const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
        if (
          active &&
          (active.tagName === "TEXTAREA" ||
            (active.tagName === "INPUT" && (active as HTMLInputElement).type === "text"))
        ) {
          active.value = replacement;
          active.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            sel.deleteFromDocument();
            sel.getRangeAt(0).insertNode(document.createTextNode(replacement));
          }
        }
      },
      args: [text],
    });
  });
});

// ─── Settings shortcut ────────────────────────────────────────────────────────

settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// ─── Receive selection from content script ────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "fill-selection" && message.text) {
    promptEl.value = message.text;
    updateTokenEstimate();
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();
