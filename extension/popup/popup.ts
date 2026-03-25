import { loadKey, loadLastUsedModel, saveLastUsedModel, loadPreciseTokensSetting, type ProviderId } from "../shared/storage/keys";
import { CORE_PROVIDERS } from "@shared/providers";

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const promptEl      = document.getElementById("prompt")   as HTMLTextAreaElement;
const providerEl    = document.getElementById("provider") as HTMLSelectElement;
// modelEl may be a text input or a select depending on UI state
const modelEl       = document.getElementById("model")    as HTMLInputElement | HTMLSelectElement;
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
  openai:    CORE_PROVIDERS.openai.defaultModel,
  anthropic: CORE_PROVIDERS.anthropic.defaultModel,
  google:    CORE_PROVIDERS.google.defaultModel,
  mock:      "mock-model",
  ollama:    CORE_PROVIDERS.ollama.defaultModel,
};

function needsApiKey(provider: ProviderId): boolean {
  return provider !== "mock" && provider !== "ollama";
}

// ─── Init: restore last-used model and check key ─────────────────────────────

async function init() {
  const provider = providerEl.value as ProviderId;
  const lastModel = await loadLastUsedModel(provider);
  // populate model control (may fetch list)
  await populateModelControl(provider, lastModel ?? DEFAULT_MODELS[provider] ?? "");
  await checkKey(provider);

  // populate token estimate for current input
  updateTokenEstimate();
}

async function checkKey(provider: ProviderId) {
  if (!needsApiKey(provider)) {
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
  await populateModelControl(provider, lastModel ?? DEFAULT_MODELS[provider] ?? "");
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
  const model    = (modelEl as HTMLInputElement).value || (modelEl as HTMLSelectElement).value || DEFAULT_MODELS[provider];
  const preset   = presetEl.value;

  // Load the stored API key (null for mock)
  const apiKey = needsApiKey(provider) ? await loadKey(provider) : null;

  if (needsApiKey(provider) && !apiKey) {
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

// Also wire the inline warning link that opens settings
document.getElementById("open-settings-link")?.addEventListener("click", () => {
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

// ─── Model list fetching & UI population ───────────────────────────────────────

async function populateModelControl(provider: ProviderId, desiredModel: string) {
  // Try to read cached models
  const cacheKey = `models.${provider}`;
  const cached = await new Promise<any>((res) => chrome.storage.local.get([cacheKey], (r) => res(r[cacheKey] ?? null)));
  const now = Date.now();

  let models: string[] | null = null;
  if (cached && cached.items && cached.fetchedAt && now - cached.fetchedAt < 1000 * 60 * 60) {
    models = cached.items;
  } else {
    // ask background to list models
    models = await new Promise<string[]>((res) => {
      chrome.runtime.sendMessage({ type: "list-models", payload: { provider } }, (resp) => {
        if (resp?.ok && Array.isArray(resp.models)) return res(resp.models);
        return res([]);
      });
    });
  }

  const container = modelEl.parentElement;
  if (!container) return;

  // If models found, replace text input with a select
  if (models && models.length > 0) {
    const select = document.createElement("select");
    select.id = "model";
    for (const m of models) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      select.appendChild(opt);
    }
    const customOpt = document.createElement("option");
    customOpt.value = "__custom__";
    customOpt.textContent = "Custom…";
    select.appendChild(customOpt);

    // preserve previous value if present
    if (desiredModel && models.includes(desiredModel)) select.value = desiredModel;

    // swap in DOM
    container.replaceChild(select, modelEl);
    // update ref
    (modelEl as any) = select;

    select.addEventListener("change", () => {
      if (select.value === "__custom__") {
        // swap back to input
        const input = document.createElement("input");
        input.type = "text";
        input.id = "model";
        input.spellcheck = false;
        container.replaceChild(input, select);
        (modelEl as any) = input;
        input.value = desiredModel;
      }
    });
  } else {
    // ensure it's an input
    if ((modelEl as HTMLInputElement).tagName !== "INPUT") {
      const input = document.createElement("input");
      input.type = "text";
      input.id = "model";
      input.spellcheck = false;
      container.replaceChild(input, modelEl);
      (modelEl as any) = input;
    }
    (modelEl as HTMLInputElement).value = desiredModel;
  }
}
