import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import wasm from "vite-plugin-wasm";
import { resolve } from "path";
import manifest from "./manifest.json";

// ─── Vite config for the bettercue browser extension ───────────────────────
//
// Build outputs:
//   dist/           Chrome / Edge (MV3) — loadable via chrome://extensions
//   dist-firefox/   Firefox MV3         — loadable via about:debugging
//
// crxjs handles:
//   - Transpiling TypeScript entries (background, popup, options, content)
//   - Copying & rewriting manifest.json with correct output hashes
//   - Hot-module reload of the popup during `dev` (watch) mode
//   - Correct service-worker module bundling for MV3
//
// vite-plugin-wasm handles tiktoken's WASM binary correctly.
// (vite-plugin-top-level-await was removed — Vite 8 / rolldown handles TLA natively.)

export default defineConfig(({ mode }) => {
  const isFirefox = mode === "firefox";

  return {
    root: ".",
    plugins: [
      wasm(),
      crx({ manifest }),
    ],

    build: {
      outDir: isFirefox ? "dist-firefox" : "dist",
      emptyOutDir: true,
      // Emit WASM as a separate file rather than inlining it
      assetsInlineLimit: 0,
      rollupOptions: {
        input: {
          popup:   resolve(__dirname, "popup/popup.html"),
          options: resolve(__dirname, "options/options.html"),
        },
      },
    },

    resolve: {
      alias: {
        "@shared": resolve(__dirname, "../shared"),
      },
    },

    optimizeDeps: {
      exclude: ["tiktoken"],
    },
  };
});
