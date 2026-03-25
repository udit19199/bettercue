import chalk from "chalk";
import inquirer from "inquirer";

import { DEFAULT_MODELS, DEFAULT_PROVIDER } from "./core/config.ts";
import { loadProviderKey, removeProviderKey, saveProviderKey } from "./core/keychain.ts";
import { optimizePrompt } from "./core/optimize.ts";
import { CORE_PROVIDER_IDS, CORE_PROVIDERS } from "../shared/providers/index.ts";
import type { CoreProviderId } from "../shared/providers/index.ts";

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
        console.log(chalk.yellow("macOS Keychain auth is currently supported on macOS only."));
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
            type: "input",
            name: "prompt",
            message: "Enter the prompt to optimize",
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

async function main() {
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

        console.log(chalk.gray(`\nOptimizing with ${provider}/${model}...`));
        const response = await optimizePrompt(prompt, { provider, model });

        console.log(chalk.green("\nOptimized prompt:\n"));
        console.log(response);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${message}`));
    }
}

main();
