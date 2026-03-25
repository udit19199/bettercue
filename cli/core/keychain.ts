import type { CoreProviderId } from "../../shared/providers/index.ts";

const KEYCHAIN_SERVICE = "bettercue";

function ensureMacOS() {
    if (process.platform !== "darwin") {
        throw new Error("Keychain integration is currently supported on macOS only.");
    }
}

function runSecurity(args: string[]): { ok: boolean; stdout: string; stderr: string } {
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

export function saveProviderKey(provider: CoreProviderId, apiKey: string): void {
    ensureMacOS();

    const normalized = apiKey.trim();
    if (!normalized) {
        throw new Error("API key cannot be empty.");
    }

    const result = runSecurity([
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

export function loadProviderKey(provider: CoreProviderId): string | null {
    ensureMacOS();

    const result = runSecurity([
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

export function removeProviderKey(provider: CoreProviderId): boolean {
    ensureMacOS();

    const result = runSecurity([
        "delete-generic-password",
        "-a",
        provider,
        "-s",
        KEYCHAIN_SERVICE,
    ]);

    return result.ok;
}
