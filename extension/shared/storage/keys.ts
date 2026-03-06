// Typed helpers for reading and writing provider API keys.
// Keys are stored in chrome.storage.local (never synced to the cloud).
// The storage schema lives entirely under the "providers" key so it is
// easy to wipe in one call via clearAllKeys().

export type ProviderId = "openai" | "anthropic" | "google" | "mock";

export type ProviderStorageEntry = {
  apiKey: string | null;
  lastUsedModel: string | null;
};

type StorageRoot = {
  providers: Record<string, ProviderStorageEntry>;
  preciseTokens: boolean;
};

// ─── Low-level chrome.storage helpers ────────────────────────────────────────

function storageGet<T>(keys: string[]): Promise<Partial<T>> {
  return new Promise((resolve) =>
    chrome.storage.local.get(keys, (result) => resolve(result as Partial<T>))
  );
}

function storageSet(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set(items, resolve));
}

function storageRemove(keys: string[]): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Persist a provider API key to chrome.storage.local. */
export async function saveKey(
  provider: ProviderId,
  apiKey: string,
  lastUsedModel?: string
): Promise<void> {
  const { providers = {} } = await storageGet<StorageRoot>(["providers"]);
  const current = (providers as Record<string, ProviderStorageEntry>)[provider] ?? {
    apiKey: null,
    lastUsedModel: null,
  };
  const updated: ProviderStorageEntry = {
    ...current,
    apiKey,
    lastUsedModel: lastUsedModel ?? current.lastUsedModel,
  };
  await storageSet({ providers: { ...providers, [provider]: updated } });
}

/** Load a provider API key from chrome.storage.local. Returns null if not set. */
export async function loadKey(provider: ProviderId): Promise<string | null> {
  const { providers = {} } = await storageGet<StorageRoot>(["providers"]);
  return (providers as Record<string, ProviderStorageEntry>)[provider]?.apiKey ?? null;
}

/** Load the last-used model for a provider. */
export async function loadLastUsedModel(provider: ProviderId): Promise<string | null> {
  const { providers = {} } = await storageGet<StorageRoot>(["providers"]);
  return (providers as Record<string, ProviderStorageEntry>)[provider]?.lastUsedModel ?? null;
}

/** Persist the last-used model for a provider (called after a successful rewrite). */
export async function saveLastUsedModel(
  provider: ProviderId,
  model: string
): Promise<void> {
  const { providers = {} } = await storageGet<StorageRoot>(["providers"]);
  const current = (providers as Record<string, ProviderStorageEntry>)[provider] ?? {
    apiKey: null,
    lastUsedModel: null,
  };
  await storageSet({
    providers: { ...providers, [provider]: { ...current, lastUsedModel: model } },
  });
}

/** Remove ALL stored provider keys and settings. */
export async function clearAllKeys(): Promise<void> {
  await storageRemove(["providers"]);
}

/** Read the preciseTokens user preference. */
export async function loadPreciseTokensSetting(): Promise<boolean> {
  const result = await storageGet<StorageRoot>(["preciseTokens"]);
  return result.preciseTokens ?? false;
}

/** Persist the preciseTokens user preference. */
export async function savePreciseTokensSetting(value: boolean): Promise<void> {
  await storageSet({ preciseTokens: value });
}
