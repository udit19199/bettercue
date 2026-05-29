import type { CoreProviderId } from "../../shared/providers/index.ts";

const KEYCHAIN_SERVICE = "bettercue";

function ensureMacOS() {
    if (process.platform !== "darwin") {
        throw new Error("Keychain integration is currently supported on macOS only.");
    }
}

async function runSecurity(args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
    const result = Bun.spawnSync({
        cmd: ["security", ...args],
        stdout: "pipe",
        stderr: "pipe",
    });

    const stdout = new TextDecoder().decode(result.stdout).trim();
    const stderr = new TextDecoder().decode(result.stderr).trim();

    return {
        ok: result.exitCode === 0,
        stdout,
        stderr,
    };
}

export async function saveProviderKey(provider: CoreProviderId, apiKey: string): Promise<void> {
    ensureMacOS();

    const normalized = apiKey.trim();
    if (!normalized) {
        throw new Error("API key cannot be empty.");
    }

    const result = await runSecurity([
        "add-generic-password",
        "-a",
        provider,
        "-s",
        KEYCHAIN_SERVICE,
        "-w",
        normalized,
        "-U",
    ]);

    if (!result.ok) {
        throw new Error(result.stderr || "Failed to save key in Keychain.");
    }
}

export async function loadProviderKey(provider: CoreProviderId): Promise<string | null> {
    ensureMacOS();

    const result = await runSecurity([
        "find-generic-password",
        "-a",
        provider,
        "-s",
        KEYCHAIN_SERVICE,
        "-w",
    ]);

    if (!result.ok) {
        return null;
    }

    const key = result.stdout.trim();
    return key || null;
}

export async function removeProviderKey(provider: CoreProviderId): Promise<boolean> {
    ensureMacOS();

    const result = await runSecurity([
        "delete-generic-password",
        "-a",
        provider,
        "-s",
        KEYCHAIN_SERVICE,
    ]);

    return result.ok;
}
