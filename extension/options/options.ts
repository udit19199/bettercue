import {
  saveKey,
  loadKey,
  clearAllKeys,
  loadPreciseTokensSetting,
  savePreciseTokensSetting,
  type ProviderId,
  type ProviderStorageEntry,
} from "../shared/storage/keys";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function setStatus(
  elId: string,
  msg: string,
  variant: "ok" | "err" | "neutral" = "neutral"
) {
  const node = el<HTMLParagraphElement>(elId);
  if (!node) return;
  node.textContent = msg;
  node.style.color =
    variant === "ok"
      ? "var(--accent)"
      : variant === "err"
      ? "var(--danger)"
      : "var(--text-muted)";
}

function setGlobal(msg: string, variant: "ok" | "err" | "neutral" = "neutral") {
  const bar = el("global-status");
  bar.textContent = msg;
  bar.className = `status-bar ${variant === "neutral" ? "" : variant}`;
}

// Mask all but last 4 chars of a key for display
function maskKey(key: string): string {
  if (key.length <= 4) return "****";
  return "•".repeat(Math.min(key.length - 4, 20)) + key.slice(-4);
}

// ─── Per-provider wiring ──────────────────────────────────────────────────────

const providers: ProviderId[] = ["openai", "anthropic", "google"];

async function loadAllKeys() {
  for (const provider of providers) {
    const key = await loadKey(provider);
    const input = el<HTMLInputElement>(`key-${provider}`);
    if (key) {
      // show masked hint so user knows a key is saved without revealing it
      input.placeholder = maskKey(key);
      setStatus(`status-${provider}`, "Key saved.", "ok");
    } else {
      input.placeholder =
        provider === "openai"
          ? "sk-…"
          : provider === "anthropic"
          ? "sk-ant-…"
          : "AIza…";
      setStatus(`status-${provider}`, "No key saved.", "neutral");
    }
  }
}

function wireProvider(provider: ProviderId) {
  const saveBtn = el(`save-${provider}`);
  const clearBtn = el(`clear-${provider}`);
  const input = el<HTMLInputElement>(`key-${provider}`);

  saveBtn.addEventListener("click", async () => {
    const val = input.value.trim();
    if (!val) {
      setStatus(`status-${provider}`, "Enter a key first.", "err");
      return;
    }
    await saveKey(provider, val);
    input.value = "";
    input.placeholder = maskKey(val);
    setStatus(`status-${provider}`, "Key saved.", "ok");
    setGlobal("Settings saved.", "ok");
    setTimeout(() => setGlobal("No unsaved changes."), 2500);
  });

  clearBtn.addEventListener("click", async () => {
    // Read current providers, null out just this provider's key
    await new Promise<void>((res) =>
      chrome.storage.local.get(["providers"], (result) => {
        const providers: Record<string, ProviderStorageEntry> = (result.providers as Record<string, ProviderStorageEntry>) ?? {};
        providers[provider] = { apiKey: null, lastUsedModel: providers[provider]?.lastUsedModel ?? null };
        chrome.storage.local.set({ providers }, res);
      })
    );
    input.value = "";
    input.placeholder =
      provider === "openai"
        ? "sk-…"
        : provider === "anthropic"
        ? "sk-ant-…"
        : "AIza…";
    setStatus(`status-${provider}`, "Key cleared.", "neutral");
    setGlobal("Key cleared.", "ok");
    setTimeout(() => setGlobal("No unsaved changes."), 2500);
  });
}

// ─── Precise tokens toggle ────────────────────────────────────────────────────

async function initPreciseToggle() {
  const toggle = el<HTMLInputElement>("precise-tokens");
  toggle.checked = await loadPreciseTokensSetting();
  toggle.addEventListener("change", async () => {
    await savePreciseTokensSetting(toggle.checked);
    setGlobal(
      toggle.checked
        ? "Precise token counting enabled."
        : "Precise token counting disabled.",
      "ok"
    );
    setTimeout(() => setGlobal("No unsaved changes."), 2500);
  });
}

// ─── Clear all ────────────────────────────────────────────────────────────────

function wireClearAll() {
  el("clear-all").addEventListener("click", async () => {
    if (
      !confirm(
        "This will permanently delete all stored API keys and preferences. Continue?"
      )
    )
      return;
    await clearAllKeys();
    await loadAllKeys();
    el<HTMLInputElement>("precise-tokens").checked = false;
    setGlobal("All keys and settings cleared.", "ok");
    setTimeout(() => setGlobal("No unsaved changes."), 3000);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  await loadAllKeys();
  for (const provider of providers) wireProvider(provider);
  await initPreciseToggle();
  wireClearAll();
}

init();
