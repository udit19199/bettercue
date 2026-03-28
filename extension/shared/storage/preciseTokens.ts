import { loadPreciseTokensSetting } from "./keys";

let cachedPreciseTokens: boolean | null = null;

export async function getPreciseTokensSetting(): Promise<boolean> {
  if (cachedPreciseTokens !== null) {
    return cachedPreciseTokens;
  }

  cachedPreciseTokens = await loadPreciseTokensSetting();
  return cachedPreciseTokens;
}

export function clearPreciseTokensCache(): void {
  cachedPreciseTokens = null;
}
