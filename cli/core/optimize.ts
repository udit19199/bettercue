import { PROVIDER_API_KEY_ENV, SYSTEM_PROMPT } from "./config.ts";
import { loadProviderKey } from "./keychain.ts";
import { optimizeWithProvider } from "../../shared/providers/index.ts";
import type { CoreProviderId } from "../../shared/providers/index.ts";

export type OptimizeOptions = {
    provider: CoreProviderId;
    model: string;
};

export function resolveApiKey(provider: CoreProviderId): string | null {
    const envName = PROVIDER_API_KEY_ENV[provider];
    if (!envName) {
        return null;
    }

    if (process.platform === "darwin") {
        const keychainKey = loadProviderKey(provider);
        if (keychainKey) {
            return keychainKey;
        }
    }

    const raw = process.env[envName];
    const value = typeof raw === "string" ? raw.trim() : "";

    if (!value) {
        if (process.platform === "darwin") {
            throw new Error(
                `Missing key for ${provider}. Set ${envName} or run \`bun run cli auth\` to save it in macOS Keychain.`
            );
        }

        throw new Error(`Missing ${envName}. Set it in your shell before running the CLI.`);
    }

    return value;
}

export async function optimizePrompt(prompt: string, options: OptimizeOptions): Promise<string> {
    const apiKey = resolveApiKey(options.provider);
    const response = await optimizeWithProvider({
        provider: options.provider,
        prompt,
        model: options.model,
        system: SYSTEM_PROMPT,
        apiKey: apiKey ?? undefined,
    });

    return response.text;
}
