// ─── DOM refs ─────────────────────────────────────────────────
const promptInput = document.getElementById("promptInput");
const tokenCount = document.getElementById("tokenCount");
const providerSelect = document.getElementById("providerSelect");
const presetSelect = document.getElementById("presetSelect");
const optimizeBtn = document.getElementById("optimizeBtn");
const outputSection = document.getElementById("outputSection");
const outputContent = document.getElementById("outputContent");
const copyBtn = document.getElementById("copyBtn");
const statusText = document.getElementById("statusText");
const statusDot = document.querySelector(".status-dot");

// ─── Token estimation ──────────────────────────────────────────
function estimateTokens(text) {
  return Math.max(0, Math.round(text.length / 4));
}

function updateTokenCount() {
  const count = estimateTokens(promptInput.value);
  tokenCount.textContent = `${count} token${count !== 1 ? "s" : ""}`;
}

promptInput.addEventListener("input", updateTokenCount);
updateTokenCount();

// ─── Status helpers ────────────────────────────────────────────
function setStatus(text, state) {
  statusText.textContent = text;
  statusDot.className = "status-dot";
  if (state === "busy") statusDot.classList.add("status-dot--busy");
  else if (state === "error") statusDot.classList.add("status-dot--error");
}

// ─── Optimize button ───────────────────────────────────────────
optimizeBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus("Enter a prompt first", "error");
    return;
  }

  setStatus("Optimizing…", "busy");
  optimizeBtn.disabled = true;

  const provider = providerSelect.value;
  const preset = presetSelect.value;

  try {
    // For now, simulate optimization — the real API integration comes later
    await simulateOptimization(prompt, provider, preset);
    setStatus("Ready", "idle");
  } catch (err) {
    setStatus("Optimization failed", "error");
    console.error(err);
  } finally {
    optimizeBtn.disabled = false;
  }
});

async function simulateOptimization(prompt, provider, preset) {
  const styleLabel = preset || "default";
  const providerLabel = providerSelect.options[providerSelect.selectedIndex].text;

  const lines = [
    `# Optimized (${styleLabel} · ${providerLabel})`,
    "",
    prompt
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l, i) => `${i + 1}. ${l}`)
      .join("\n"),
    "",
    "──",
    "Optimized with bettercue · multi-provider prompt optimization",
  ];

  // Stream-like reveal (purely aesthetic)
  outputContent.textContent = "";
  outputSection.style.display = "block";

  const full = lines.join("\n");
  const chars = full.split("");
  let idx = 0;

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const chunk = chars.slice(idx, idx + 3);
      if (!chunk.length) {
        clearInterval(interval);
        resolve();
        return;
      }
      outputContent.textContent += chunk.join("");
      idx += 3;
    }, 12);
  });
}

// ─── Copy to clipboard ──────────────────────────────────────────
copyBtn.addEventListener("click", async () => {
  const text = outputContent.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyBtn.classList.add("copy-btn--copied");
    copyBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7L5 10L12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    setTimeout(() => {
      copyBtn.classList.remove("copy-btn--copied");
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="4.5" y="4.5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
          <path d="M10 4.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1.5" stroke="currentColor" stroke-width="1.2"/>
        </svg>
      `;
    }, 2000);
  } catch {
    // Clipboard not available
  }
});
