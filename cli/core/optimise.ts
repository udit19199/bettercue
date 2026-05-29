import chalk from "chalk";
import inquirer from "inquirer";
import search from "@inquirer/search";

import { SYSTEM_PROMPT, getOllamaBaseUrl } from "./config.ts";
import { clearCachedModels, loadCachedModels, saveCachedModels } from "./modelCache.ts";
import { loadProviderKey, removeProviderKey, saveProviderKey } from "./keychain.ts";
import { loadConfig, saveConfig } from "./persistence.ts";
import { CORE_PROVIDER_IDS, CORE_PROVIDERS, DEFAULT_PROVIDER, listProviderModels, optimizeWithProvider, generateQuestionsWithProvider } from "../../shared/providers/index.ts";
import { buildEnhancedPrompt } from "../../shared/questions/index.ts";
import type { CoreProviderId, Question } from "../../shared/providers/index.ts";

export type OptimizeOptions = {
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
            type: "select",
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

async function chooseProvider(): Promise<CoreProviderId> {
    const { provider } = await inquirer.prompt<{ provider: CoreProviderId }>([
        {
            type: "select",
            name: "provider",
            message: "Choose a provider",
            choices: CORE_PROVIDER_IDS.map((id) => ({
                name: CORE_PROVIDERS[id].displayName,
                value: id,
            })),
            default: DEFAULT_PROVIDER,
        },
    ]);

    return provider;
}

async function fetchModels(provider: CoreProviderId): Promise<string[]> {
    const apiKey = await resolveApiKey(provider);
    const baseUrl = getOllamaBaseUrl();
    const models = await listProviderModels({ provider, apiKey, baseUrl });
    return models.sort((left, right) => left.localeCompare(right));
}

async function chooseModel(provider: CoreProviderId): Promise<string> {
    const baseUrl = getOllamaBaseUrl();

    // Before fetching models, check API key availability for paid providers
    const envName = CORE_PROVIDERS[provider].apiKeyEnvVar;
    if (envName && !(await resolveApiKey(provider))) {
        throw new Error(
            `No API key configured for ${CORE_PROVIDERS[provider].displayName}. ` +
            (process.platform === "darwin"
                ? `Run \`bun run cli auth\` or set ${envName}.`
                : `Set the ${envName} environment variable.`)
        );
    }

    let models = await loadCachedModels(provider, baseUrl)
        ?? await fetchAndCacheModels(provider);

    if (!models.length) {
        throw new Error(`No models found for ${CORE_PROVIDERS[provider].displayName}.`);
    }

    while (true) {
        const selected = await search<string | "__refresh__">({
            message: `Choose a ${CORE_PROVIDERS[provider].displayName} model`,
            source: async (input) => {
                const query = (input ?? "").trim().toLowerCase();
                const filtered = query
                    ? models.filter((model) => model.toLowerCase().includes(query))
                    : models;

                const choices: Array<{ name: string; value: string; short: string }> = filtered.slice(0, 20).map((model) => ({
                    name: model,
                    value: model,
                    short: model,
                }));

                if (!query) {
                    choices.unshift({ name: "Refresh model list", value: "__refresh__", short: "Refresh model list" });
                }

                if (!choices.length) {
                    return [{ name: "No matching models", value: "__none__", disabled: true }];
                }

                return choices;
            },
        });

        if (selected !== "__refresh__") {
            return selected;
        }

        await clearCachedModels(provider, baseUrl);
        models = await fetchAndCacheModels(provider);
        if (!models.length) {
            throw new Error(`No models found for ${CORE_PROVIDERS[provider].displayName}.`);
        }
    }
}

async function fetchAndCacheModels(provider: CoreProviderId): Promise<string[]> {
    const baseUrl = getOllamaBaseUrl();
    const models = await fetchModels(provider);
    await saveCachedModels(provider, models, baseUrl);
    return models;
}

async function runAuthCommand(): Promise<void> {
    printBanner();

    if (process.platform !== "darwin") {
        console.log(chalk.yellow("Keychain auth is currently supported on macOS only."));
        return;
    }

    const { action } = await inquirer.prompt<{ action: "save" | "remove" | "status" }>([
        {
            type: "select",
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
            const envName = CORE_PROVIDERS[provider].apiKeyEnvVar ?? "";
            const keychainKey = await loadProviderKey(provider);
            const envKey = process.env[envName];
            const hasKeychain = !!keychainKey;
            const hasEnv = !!envKey;
            const parts: string[] = [];
            if (hasKeychain) parts.push("keychain");
            if (hasEnv) parts.push("env var");
            const status = parts.length > 0 ? parts.join(" + ") : "missing";
            const label = `${CORE_PROVIDERS[provider].displayName}: ${status}`;
            console.log(hasKeychain || hasEnv ? chalk.green(label) : chalk.gray(label));
        }
        return;
    }

    const provider = await selectKeyProvider("Choose provider for Keychain");

    if (action === "remove") {
        const removed = await removeProviderKey(provider);
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

    await saveProviderKey(provider, apiKey);
    console.log(chalk.green(`Saved ${CORE_PROVIDERS[provider].displayName} key to macOS Keychain.`));
}

// ─── Persistence ──────────────────────────────────────────────────────────────

async function confirmPersistedChoice(
    provider: CoreProviderId,
    model: string,
): Promise<{ confirmed: true; provider: CoreProviderId; model: string } | { confirmed: false }> {
    const displayName = CORE_PROVIDERS[provider]?.displayName ?? provider;
    const { change } = await inquirer.prompt<{ change: boolean }>([
        {
            type: "confirm",
            name: "change",
            message: `Using ${displayName} / ${model}. Change?`,
            default: false,
        },
    ]);

    if (!change) {
        return { confirmed: true, provider, model };
    }

    return { confirmed: false };
}

async function resolveProviderAndModel(): Promise<{ provider: CoreProviderId; model: string }> {
    const config = await loadConfig();

    if (config.lastProvider && config.lastModel) {
        const result = await confirmPersistedChoice(config.lastProvider, config.lastModel);
        if (result.confirmed) {
            return { provider: result.provider, model: result.model };
        }
    }

    const provider = await chooseProvider();
    const model = await chooseModel(provider);
    return { provider, model };
}

// ─── Clarifying questions flow ────────────────────────────────────────────────

async function askQuestionCLI(question: Question): Promise<string | null> {
    const skipChoice = question.required ? [] : [{ name: "— Skip —", value: "__skip__" }];

    if (question.type === "text") {
        const { answer } = await inquirer.prompt<{ answer: string }>([
            {
                type: "input",
                name: "answer",
                message: question.question,
            },
        ]);
        return answer.trim() || null;
    }

    if (question.type === "select") {
        const choices = [
            ...skipChoice,
            ...(question.options?.map((opt) => ({ name: opt, value: opt })) ?? []),
        ];
        const { answer } = await inquirer.prompt<{ answer: string }>([
            {
                type: "select",
                name: "answer",
                message: question.question,
                choices,
            },
        ]);
        return answer === "__skip__" ? null : answer;
    }

    if (question.type === "multi") {
        const { answer } = await inquirer.prompt<{ answer: string[] }>([
            {
                type: "checkbox",
                name: "answer",
                message: question.question,
                choices: question.options?.map((opt) => ({ name: opt, value: opt })) ?? [],
            },
        ]);
        return answer.length > 0 ? answer.join(", ") : null;
    }

    return null;
}

async function runQuestionsFlow(provider: CoreProviderId, model: string, prompt: string): Promise<string> {
    const apiKey = await resolveApiKey(provider);

    console.log(chalk.gray("\nAnalyzing your prompt for clarifying questions..."));

    let questions: Question[];
    try {
        const response = await generateQuestionsWithProvider({
            provider,
            prompt,
            model,
            apiKey: apiKey ?? undefined,
        });
        questions = response.questions;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(chalk.yellow(`Could not generate clarifying questions: ${message}`));
        console.log(chalk.gray("Proceeding with the original prompt."));
        return prompt;
    }

    if (questions.length === 0) {
        console.log(chalk.gray("No clarifying questions needed. Proceeding to optimization."));
        return prompt;
    }

    console.log(chalk.cyan("\nClarifying Questions:\n"));

    const answers: Record<string, string> = {};

    for (const question of questions) {
        const answer = await askQuestionCLI(question);
        if (answer !== null) {
            answers[question.id] = answer;
        }
    }

    if (Object.keys(answers).length === 0) {
        console.log(chalk.gray("No answers provided. Proceeding with the original prompt."));
        return prompt;
    }

    return buildEnhancedPrompt(prompt, questions, answers);
}

function friendlyKeyMissingMessage(provider: CoreProviderId): string {
    if (provider === "ollama") {
        return "Ollama does not need an API key.";
    }

    const envName = CORE_PROVIDERS[provider].apiKeyEnvVar;
    if (process.platform === "darwin") {
        return `No key saved for ${CORE_PROVIDERS[provider].displayName}. Run \`bun run cli auth\` or set ${envName}.`;
    }

    return `No key saved for ${CORE_PROVIDERS[provider].displayName}. Set ${envName} and try again.`;
}

export async function resolveApiKey(provider: CoreProviderId): Promise<string | null> {
    const envName = CORE_PROVIDERS[provider].apiKeyEnvVar;
    if (!envName) {
        return null;
    }

    if (process.platform === "darwin") {
        const keychainKey = await loadProviderKey(provider);
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
    const apiKey = await resolveApiKey(options.provider);
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

        // Step 1: Resolve provider and model (with persistence)
        const { provider, model } = await resolveProviderAndModel();

        // Step 2: Check API key early for paid providers
        if (provider !== "ollama") {
            const apiKey = await resolveApiKey(provider);
            if (!apiKey) {
                console.log(chalk.yellow(`\n${friendlyKeyMissingMessage(provider)}`));
                return;
            }
        }

        // Step 3: Collect the prompt
        const { prompt: rawPrompt } = await inquirer.prompt<{ prompt: string }>([
            {
                type: "editor",
                name: "prompt",
                message: "Enter the prompt to optimise",
            },
        ]);

        const trimmedPrompt = rawPrompt.trim();
        if (!trimmedPrompt) {
            console.log(chalk.yellow("No prompt provided. Exiting."));
            return;
        }

        // Step 4: Generate and answer clarifying questions
        const enhancedPrompt = await runQuestionsFlow(provider, model, trimmedPrompt);

        // Step 5: Optimize the (possibly enhanced) prompt
        console.log(chalk.gray(`\nOptimising with ${CORE_PROVIDERS[provider].displayName}/${model}...`));
        const response = await optimisePrompt(enhancedPrompt, { provider, model });

        console.log(chalk.green("\nOptimised prompt:\n"));
        console.log(response);

        // Step 6: Persist the chosen provider and model
        await saveConfig({ lastProvider: provider, lastModel: model });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\nError: ${message}`));
    }
}
