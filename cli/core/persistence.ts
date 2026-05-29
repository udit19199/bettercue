import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import type { CoreProviderId } from "../../shared/providers/types.ts";

/**
 * Shape of the CLI configuration persisted to disk.
 */
export type CliConfig = {
  lastProvider?: CoreProviderId;
  lastModel?: string;
  lastPreset?: string;
};

const CONFIG_DIR = join(homedir(), ".bettercue");
const CONFIG_PATH = join(CONFIG_DIR, "cli-config.json");

/**
 * Load the persisted CLI configuration.
 * Returns an empty object if the file doesn't exist or can't be parsed.
 */
export async function loadConfig(): Promise<CliConfig> {
  try {
    if (!existsSync(CONFIG_PATH)) {
      return {};
    }
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as CliConfig;

    // Basic validation — ensure we have valid fields
    return {
      lastProvider: parsed.lastProvider ?? undefined,
      lastModel: parsed.lastModel ?? undefined,
      lastPreset: parsed.lastPreset ?? undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Persist the CLI configuration to disk.
 * Creates the ~/.bettercue directory if it doesn't exist.
 */
export async function saveConfig(config: CliConfig): Promise<void> {
  try {
    if (!existsSync(CONFIG_DIR)) {
      await mkdir(CONFIG_DIR, { recursive: true });
    }
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  } catch {
    // Silently ignore write errors — persistence is best-effort
  }
}
