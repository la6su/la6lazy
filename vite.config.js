import { defineConfig } from "vite";

export default defineConfig({
    root: '.',
    build: {
        minify: "esbuild",
        target: "esnext",
        modulePreload: false,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("three")) return "three";
                    if (id.includes("ore-three")) return "ore";
                    if (id.includes("scenes")) return "scene-chunk";
                }
            }
        }
    }
});
