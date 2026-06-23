/**
 * Bumps the semantic version across all package.json files and creates a git tag.
 *
 * Usage:
 *   bun run scripts/bump-version.ts patch   # 0.1.0 → 0.1.1
 *   bun run scripts/bump-version.ts minor   # 0.1.0 → 0.2.0
 *   bun run scripts/bump-version.ts major   # 0.1.0 → 1.0.0
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "..");

type BumpType = "patch" | "minor" | "major";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseVersion(version: string): [number, number, number] {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) throw new Error(`Invalid version: ${version}`);
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function bump(version: string, type: BumpType): string {
    const [major, minor, patch] = parseVersion(version);
    switch (type) {
        case "major": return `${major + 1}.0.0`;
        case "minor": return `${major}.${minor + 1}.0`;
        case "patch": return `${major}.${minor}.${patch + 1}`;
    }
}

function readJson(path: string): Record<string, unknown> {
    return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path: string, data: Record<string, unknown>): void {
    writeFileSync(path, JSON.stringify(data, null, 4) + "\n");
}

// ─── Package paths ───────────────────────────────────────────────────────────

const PACKAGES = [
    resolve(ROOT, "package.json"),
    resolve(ROOT, "cli/package.json"),
];

// ─── Main ────────────────────────────────────────────────────────────────────

const bumpType = process.argv[2] as BumpType | undefined;

if (!bumpType || !["patch", "minor", "major"].includes(bumpType)) {
    console.error("Usage: bun run scripts/bump-version.ts <patch|minor|major>");
    process.exit(1);
}

// Read current version from root package.json
const rootPkg = readJson(PACKAGES[0]!);
const currentVersion = rootPkg.version as string | undefined;

if (!currentVersion) {
    console.error("No version field found in root package.json");
    process.exit(1);
}

const newVersion = bump(currentVersion, bumpType);

console.log(`Bumping version: ${currentVersion} → ${newVersion}`);

// Update all package.json files
for (const pkgPath of PACKAGES) {
    const pkg = readJson(pkgPath);
    pkg.version = newVersion;
    writeJson(pkgPath, pkg);
    console.log(`  Updated ${pkgPath.replace(ROOT + "/", "")}`);
}

// Create git commit and tag
const proc = Bun.spawnSync([
    "git", "commit", "-am", `chore: release v${newVersion}`,
], { cwd: ROOT, stdout: "inherit", stderr: "inherit" });

if (proc.exitCode !== 0) {
    console.error("\nFailed to create git commit. Are there changes to commit?");
    process.exit(1);
}

const tagProc = Bun.spawnSync([
    "git", "tag", `-a`, `v${newVersion}`, "-m", `v${newVersion}`,
], { cwd: ROOT, stdout: "inherit", stderr: "inherit" });

if (tagProc.exitCode !== 0) {
    console.error("\nFailed to create git tag.");
    process.exit(1);
}

console.log(`\nDone! Created tag v${newVersion}`);
console.log(`Run: git push && git push --tags`);
