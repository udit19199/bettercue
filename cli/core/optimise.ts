import chalk from "chalk";
import inquirer from "inquirer";

import { DEFAULT_MODELS, DEFAULT_PROVIDER, PROVIDER_API_KEY_ENV, SYSTEM_PROMPT } from "./config.ts";
import { loadProviderKey, removeProviderKey, saveProviderKey } from "./keychain.ts";
import { CORE_PROVIDER_IDS, CORE_PROVIDERS, optimizeWithProvider } from "../../shared/providers/index.ts";
import type { CoreProviderId } from "../../shared/providers/index.ts";

export type OptimizeOptions = {
    provider: CoreProviderId;
    model: string;
};

type RunOptions = {
    prompt: string;
    provider: CoreProviderId;
    model: string;
};

function printBanner() {
    console.log(chalk.bold.cyan("bettercue"), chalk.gray("- multi-provider prompt optimizer\n"));
}

function listKeyProviders(): CoreProviderId[] {
    return CORE_PROVIDER_IDS.filter((providerId) => CORE_PROVIDERS[providerId].requiresApiKey);
}

async function selectKeyProvider(message = "Choose a provider"): Promise<CoreProviderId> {
    const providers = listKeyProviders();
    const { provider } = await inquirer.prompt<{ provider: CoreProviderId }>([
        {
            type: "list",
            name: "provider",
            message,
            choices: providers.map((providerId) => ({
                name: CORE_PROVIDERS[providerId].displayName,
                value: providerId,
            })),
            default: providers[0],
        },
    ]);

    return provider;
}

async function runAuthCommand(): Promise<void> {
    printBanner();

    if (process.platform !== "darwin") {
        console.log(chalk.yellow("Keychain auth is currently supported on macOS only."));
        return;
    }

    const { action } = await inquirer.prompt<{ action: "save" | "remove" | "status" }>([
        {
            type: "list",
            name: "action",
            message: "Keychain action",
            choices: [
                { name: "Save API key", value: "save" },
                { name: "Remove API key", value: "remove" },
                { name: "Show key status", value: "status" },
            ],
            default: "save",
        },
    ]);

    if (action === "status") {
        for (const provider of listKeyProviders()) {
            const hasKey = !!loadProviderKey(provider);
            const label = `${CORE_PROVIDERS[provider].displayName}: ${hasKey ? "saved" : "missing"}`;
            console.log(hasKey ? chalk.green(label) : chalk.gray(label));
        }
        return;
    }

    const provider = await selectKeyProvider("Choose provider for Keychain");

    if (action === "remove") {
        const removed = removeProviderKey(provider);
        if (!removed) {
            console.log(chalk.yellow(`No saved key found for ${CORE_PROVIDERS[provider].displayName}.`));
            return;
        }

        console.log(chalk.green(`Removed ${CORE_PROVIDERS[provider].displayName} key from Keychain.`));
        return;
    }

    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
        {
            type: "password",
            name: "apiKey",
            message: `Enter ${CORE_PROVIDERS[provider].displayName} API key`,
            mask: "*",
        },
    ]);

    saveProviderKey(provider, apiKey);
    console.log(chalk.green(`Saved ${CORE_PROVIDERS[provider].displayName} key to macOS Keychain.`));
}

async function chooseModel(defaultModel: string): Promise<string> {
    const { model } = await inquirer.prompt<{ model: string }>([
        {
            type: "input",
            name: "model",
            message: "Model name",
            default: defaultModel,
        },
    ]);

    return model.trim() || defaultModel;
}

async function chooseProvider(defaultProvider: CoreProviderId): Promise<CoreProviderId> {
    const { provider } = await inquirer.prompt<{ provider: CoreProviderId }>([
        {
            type: "list",
            name: "provider",
            message: "Choose a provider",
            choices: CORE_PROVIDER_IDS.map((id) => ({
                name: CORE_PROVIDERS[id].displayName,
                value: id,
            })),
            default: defaultProvider,
        },
    ]);

    return provider;
}

async function collectInput(): Promise<RunOptions> {
    const { prompt } = await inquirer.prompt<{ prompt: string }>([
        {
            type: "editor",
            name: "prompt",
            message: "Enter the prompt to optimise",
        },
    ]);

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
        return { prompt: "", provider: DEFAULT_PROVIDER, model: DEFAULT_MODELS[DEFAULT_PROVIDER] };
    }

    const provider = await chooseProvider(DEFAULT_PROVIDER);
    const model = await chooseModel(DEFAULT_MODELS[provider]);
    return { prompt: trimmedPrompt, provider, model };
}

function friendlyKeyMissingMessage(provider: CoreProviderId): string {
    if (provider === "ollama") {
        return "Ollama does not need an API key.";
    }

    const envName = provider === "openai" ? "OPENAI_API_KEY" : provider === "anthropic" ? "ANTHROPIC_API_KEY" : "GOOGLE_API_KEY";
    if (process.platform === "darwin") {
        return `No key saved for ${CORE_PROVIDERS[provider].displayName}. Run \`bun run cli auth\` or set ${envName}.`;
    }

    return `No key saved for ${CORE_PROVIDERS[provider].displayName}. Set ${envName} and try again.`;
}

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
        return null;
    }

    return value;
}

export async function optimisePrompt(prompt: string, options: OptimizeOptions): Promise<string> {
    const apiKey = resolveApiKey(options.provider);
    if (!apiKey && options.provider !== "ollama") {
        throw new Error(`No API key configured for ${options.provider}.`);
    }

    const response = await optimizeWithProvider({
        provider: options.provider,
        prompt,
        model: options.model,
        system: SYSTEM_PROMPT,
        apiKey: apiKey ?? undefined,
    });

    return response.text;
}

export async function runCli(): Promise<void> {
    try {
        const command = process.argv[2];
        if (command === "auth") {
            await runAuthCommand();
            return;
        }

        printBanner();

        const { prompt, provider, model } = await collectInput();
        if (!prompt) {
            console.log(chalk.yellow("No prompt provided. Exiting."));
            return;
        }

        if (provider !== "ollama") {
            const keyPresent = !!loadProviderKey(provider);
            if (!keyPresent && !process.env[
                provider === "openai" ? "OPENAI_API_KEY" : provider === "anthropic" ? "ANTHROPIC_API_KEY" : "GOOGLE_API_KEY"
            ]) {
                console.log(chalk.yellow(`\n${friendlyKeyMissingMessage(provider)}`));
                if (process.platform === "darwin") {
                    console.log(chalk.gray(`Run \`./bettercue auth\` to save it securely in macOS Keychain.`));
                }
                return;
            }
        }

        console.log(chalk.gray(`\nOptimising with ${provider}/${model}...`));
        const response = await optimisePrompt(prompt, { provider, model });

        console.log(chalk.green("\nOptimised prompt:\n"));
        console.log(response);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${message}`));
    }
}
