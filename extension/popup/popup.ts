import { loadKey, loadLastUsedModel, saveLastUsedModel, loadPreciseTokensSetting, type ProviderId } from "../shared/storage/keys";
import { CORE_PROVIDERS } from "@shared/providers";
import { enrichModelsWithPricing, type ModelInfo } from "@shared/providers/pricing";

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const promptEl = document.getElementById("prompt") as HTMLTextAreaElement;
const providerEl = document.getElementById("provider") as HTMLSelectElement;
const modelInputEl = document.getElementById("model") as HTMLInputElement;
const modelDropdownEl = document.getElementById("model-dropdown") as HTMLDivElement;
const modelLoadingEl = document.getElementById("model-loading") as HTMLDivElement;
const modelSelectorEl = document.getElementById("model-selector") as HTMLDivElement;
const presetEl = document.getElementById("preset") as HTMLSelectElement;
const optimizeBtn = document.getElementById("optimize") as HTMLButtonElement;
const previewEl = document.getElementById("preview") as HTMLDivElement;
const tokenEstEl = document.getElementById("token-est") as HTMLSpanElement;
const copyBtn = document.getElementById("copy") as HTMLButtonElement;
const replaceBtn = document.getElementById("replace") as HTMLButtonElement;
const settingsBtn = document.getElementById("settings") as HTMLButtonElement;
const noKeyWarning = document.getElementById("no-key-warning") as HTMLDivElement;

// Questions flow elements
const questionsSectionEl = document.getElementById("questions-section") as HTMLDivElement;
const questionsContainerEl = document.getElementById("questions-container") as HTMLDivElement;
const questionsLoadingEl = document.getElementById("questions-loading") as HTMLDivElement;
const questionsActionsEl = document.getElementById("questions-actions") as HTMLDivElement;
const questionsSkipEl = document.getElementById("questions-skip") as HTMLSpanElement;
const questionsSubmitEl = document.getElementById("questions-submit") as HTMLButtonElement;

// ─── State ────────────────────────────────────────────────────────────────────

type Question = {
  id: string;
  question: string;
  answer?: string;
};

let currentModels: ModelInfo[] = [];
let filteredModels: ModelInfo[] = [];
let selectedModel: string = "";
let isDropdownOpen = false;
let currentQuestions: Question[] = [];
let originalPromptForQuestions: string = "";

// ─── Defaults per provider ────────────────────────────────────────────────────

const DEFAULT_MODELS: Record<string, string> = {
  openai: CORE_PROVIDERS.openai.defaultModel,
  anthropic: CORE_PROVIDERS.anthropic.defaultModel,
  google: CORE_PROVIDERS.google.defaultModel,
  mock: "mock-model",
  ollama: CORE_PROVIDERS.ollama.defaultModel,
};

function needsApiKey(provider: ProviderId): boolean {
  return provider !== "mock" && provider !== "ollama";
}

// ─── Model Selector ───────────────────────────────────────────────────────────

function renderModelOptions(models: ModelInfo[]) {
  // Clear existing options (except loading indicator)
  const existingOptions = modelDropdownEl.querySelectorAll(".model-option");
  existingOptions.forEach((opt) => opt.remove());

  const emptyEl = modelDropdownEl.querySelector(".model-dropdown-empty");
  if (emptyEl) emptyEl.remove();

  modelLoadingEl.hidden = true;

  if (models.length === 0) {
    const empty = document.createElement("div");
    empty.className = "model-dropdown-empty";
    empty.textContent = "No models found";
    modelDropdownEl.appendChild(empty);
    return;
  }

  models.forEach((model) => {
    const option = document.createElement("div");
    option.className = "model-option";
    if (model.id === selectedModel) {
      option.classList.add("selected");
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "model-option-name";
    nameSpan.textContent = model.displayName;
    nameSpan.title = model.id;

    const priceSpan = document.createElement("span");
    priceSpan.className = "model-option-price";
    if (model.priceLabel) {
      priceSpan.textContent = model.priceLabel;
      if (model.priceLabel.includes("Free")) {
        priceSpan.classList.add("free");
      }
    }

    option.appendChild(nameSpan);
    if (model.priceLabel) {
      option.appendChild(priceSpan);
    }

    option.addEventListener("click", () => {
      selectModel(model.id);
      closeDropdown();
    });

    modelDropdownEl.appendChild(option);
  });
}

function filterModels(query: string) {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) {
    filteredModels = currentModels;
  } else {
    filteredModels = currentModels.filter(
      (m) =>
        m.id.toLowerCase().includes(lowerQuery) ||
        m.displayName.toLowerCase().includes(lowerQuery)
    );
  }
  renderModelOptions(filteredModels);
}

function selectModel(modelId: string) {
  selectedModel = modelId;
  const model = currentModels.find((m) => m.id === modelId);
  modelInputEl.value = model?.displayName ?? modelId;

  // Update selected state in dropdown
  const options = modelDropdownEl.querySelectorAll(".model-option");
  options.forEach((opt, idx) => {
    if (filteredModels[idx]?.id === modelId) {
      opt.classList.add("selected");
    } else {
      opt.classList.remove("selected");
    }
  });
}

function openDropdown() {
  isDropdownOpen = true;
  modelDropdownEl.classList.add("open");
  filterModels(modelInputEl.value);
}

function closeDropdown() {
  isDropdownOpen = false;
  modelDropdownEl.classList.remove("open");
  // Restore selected model name if input was cleared
  if (!modelInputEl.value.trim() && selectedModel) {
    const model = currentModels.find((m) => m.id === selectedModel);
    modelInputEl.value = model?.displayName ?? selectedModel;
  }
}

// Model input event handlers
modelInputEl.addEventListener("focus", () => {
  openDropdown();
  // Select all text for easy replacement
  modelInputEl.select();
});

modelInputEl.addEventListener("input", () => {
  filterModels(modelInputEl.value);
  if (!isDropdownOpen) {
    openDropdown();
  }
});

modelInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDropdown();
    modelInputEl.blur();
  } else if (e.key === "Enter") {
    // Select first filtered result or use typed value
    if (filteredModels.length > 0) {
      selectModel(filteredModels[0].id);
    } else if (modelInputEl.value.trim()) {
      selectedModel = modelInputEl.value.trim();
    }
    closeDropdown();
    modelInputEl.blur();
  } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!isDropdownOpen) {
      openDropdown();
      return;
    }
    // Navigate through options
    const currentIndex = filteredModels.findIndex((m) => m.id === selectedModel);
    let newIndex = currentIndex;
    if (e.key === "ArrowDown") {
      newIndex = Math.min(currentIndex + 1, filteredModels.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    if (filteredModels[newIndex]) {
      selectModel(filteredModels[newIndex].id);
    }
  }
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!modelSelectorEl.contains(e.target as Node)) {
    closeDropdown();
  }
});

// ─── Model list fetching ──────────────────────────────────────────────────────

async function fetchAndPopulateModels(provider: ProviderId, desiredModel: string) {
  modelLoadingEl.hidden = false;
  modelLoadingEl.textContent = "Loading models...";
  currentModels = [];
  filteredModels = [];

  // Try to read cached models
  const cacheKey = `models.${provider}`;
  const cached = await new Promise<{ items?: string[]; fetchedAt?: number } | null>((res) =>
    chrome.storage.local.get([cacheKey], (r) => res(r[cacheKey] ?? null))
  );
  const now = Date.now();

  let modelIds: string[] = [];
  if (cached?.items && cached.fetchedAt && now - cached.fetchedAt < 1000 * 60 * 60) {
    modelIds = cached.items;
  } else {
    // Ask background to list models
    modelIds = await new Promise<string[]>((res) => {
      chrome.runtime.sendMessage({ type: "list-models", payload: { provider } }, (resp) => {
        if (resp?.ok && Array.isArray(resp.models)) return res(resp.models);
        return res([]);
      });
    });
  }

  // Enrich with pricing information
  currentModels = enrichModelsWithPricing(provider, modelIds);
  filteredModels = currentModels;

  // Set default selected model
  const hasDesired = currentModels.some((m) => m.id === desiredModel);
  if (hasDesired) {
    selectedModel = desiredModel;
  } else if (currentModels.length > 0) {
    selectedModel = currentModels[0].id;
  } else {
    selectedModel = desiredModel || DEFAULT_MODELS[provider] || "";
  }

  // Update input value
  const model = currentModels.find((m) => m.id === selectedModel);
  modelInputEl.value = model?.displayName ?? selectedModel;

  renderModelOptions(currentModels);
}

// ─── Init: restore last-used model and check key ─────────────────────────────

async function init() {
  const provider = providerEl.value as ProviderId;
  const lastModel = await loadLastUsedModel(provider);
  await fetchAndPopulateModels(provider, lastModel ?? DEFAULT_MODELS[provider] ?? "");
  await checkKey(provider);
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
  await fetchAndPopulateModels(provider, lastModel ?? DEFAULT_MODELS[provider] ?? "");
  await checkKey(provider);
  // Hide questions section when provider changes
  hideQuestionsSection();
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

// ─── Questions Flow ───────────────────────────────────────────────────────────

function showQuestionsSection() {
  questionsSectionEl.hidden = false;
  questionsLoadingEl.hidden = false;
  questionsActionsEl.hidden = true;
}

function hideQuestionsSection() {
  questionsSectionEl.hidden = true;
  currentQuestions = [];
  originalPromptForQuestions = "";
}

function renderQuestions(questions: Question[]) {
  questionsLoadingEl.hidden = true;

  // Clear existing question items
  const existingItems = questionsContainerEl.querySelectorAll(".question-item");
  existingItems.forEach((item) => item.remove());

  if (questions.length === 0) {
    // No questions needed, proceed directly to optimization
    hideQuestionsSection();
    performOptimization();
    return;
  }

  questionsActionsEl.hidden = false;

  questions.forEach((q) => {
    const item = document.createElement("div");
    item.className = "question-item";

    const label = document.createElement("div");
    label.className = "question-label";
    label.textContent = q.question;

    const input = document.createElement("textarea");
    input.className = "question-input";
    input.placeholder = "Your answer...";
    input.rows = 2;
    input.dataset.questionId = q.id;

    item.appendChild(label);
    item.appendChild(input);
    questionsContainerEl.appendChild(item);
  });
}

async function fetchQuestions(prompt: string): Promise<Question[]> {
  const provider = providerEl.value as ProviderId;
  const model = selectedModel || DEFAULT_MODELS[provider];
  const apiKey = needsApiKey(provider) ? await loadKey(provider) : null;

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "generate-questions",
        payload: {
          adapterId: provider,
          model,
          apiKey,
          prompt,
        },
      },
      (resp) => {
        if (resp?.ok && Array.isArray(resp.questions)) {
          resolve(
            resp.questions.map((q: string, idx: number) => ({
              id: `q-${idx}`,
              question: q,
            }))
          );
        } else {
          // No questions or error - proceed without questions
          resolve([]);
        }
      }
    );
  });
}

function collectAnswers(): Record<string, string> {
  const answers: Record<string, string> = {};
  const inputs = questionsContainerEl.querySelectorAll(".question-input") as NodeListOf<HTMLTextAreaElement>;
  inputs.forEach((input) => {
    const qId = input.dataset.questionId;
    if (qId && input.value.trim()) {
      answers[qId] = input.value.trim();
    }
  });
  return answers;
}

function buildEnhancedPrompt(): string {
  const answers = collectAnswers();
  let enhanced = originalPromptForQuestions;

  // Append answered questions as context
  const answeredQuestions = currentQuestions.filter((q) => answers[q.id]);
  if (answeredQuestions.length > 0) {
    enhanced += "\n\n[Additional context from clarifying questions:]\n";
    answeredQuestions.forEach((q) => {
      enhanced += `Q: ${q.question}\nA: ${answers[q.id]}\n`;
    });
  }

  return enhanced;
}

// ─── Optimize ─────────────────────────────────────────────────────────────────

async function performOptimization(enhancedPrompt?: string) {
  const original = enhancedPrompt ?? promptEl.value.trim();
  if (!original) return;

  const provider = providerEl.value as ProviderId;
  const model = selectedModel || DEFAULT_MODELS[provider];
  const preset = presetEl.value;

  const apiKey = needsApiKey(provider) ? await loadKey(provider) : null;

  if (needsApiKey(provider) && !apiKey) {
    previewEl.textContent = "No API key found. Open Settings to add one.";
    previewEl.classList.add("error");
    return;
  }

  previewEl.classList.remove("error");
  previewEl.textContent = "Optimizing...";
  optimizeBtn.disabled = true;
  hideQuestionsSection();

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
        saveLastUsedModel(provider, model);
      } else {
        previewEl.textContent = `Error: ${resp.error}`;
        previewEl.classList.add("error");
      }
    }
  );
}

optimizeBtn.addEventListener("click", async () => {
  const original = promptEl.value.trim();
  if (!original) return;

  const provider = providerEl.value as ProviderId;
  const apiKey = needsApiKey(provider) ? await loadKey(provider) : null;

  if (needsApiKey(provider) && !apiKey) {
    previewEl.textContent = "No API key found. Open Settings to add one.";
    previewEl.classList.add("error");
    return;
  }

  // Store original prompt for questions flow
  originalPromptForQuestions = original;

  // Show questions section and fetch questions
  showQuestionsSection();
  questionsLoadingEl.textContent = "Analyzing your prompt...";

  try {
    currentQuestions = await fetchQuestions(original);
    renderQuestions(currentQuestions);
  } catch {
    // On error, proceed without questions
    hideQuestionsSection();
    performOptimization();
  }
});

// Questions flow event handlers
questionsSkipEl.addEventListener("click", () => {
  hideQuestionsSection();
  performOptimization(originalPromptForQuestions);
});

questionsSubmitEl.addEventListener("click", () => {
  const enhanced = buildEnhancedPrompt();
  performOptimization(enhanced);
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
