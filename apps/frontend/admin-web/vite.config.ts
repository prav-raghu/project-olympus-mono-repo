import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    return {
        plugins: [],
        server: {
            port: Number(env.VITE_PORT) || 4004,
            proxy: {
                "/api": {
                    target: "http://localhost:4001",
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ""),
                },
            },
        },
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "src"),
                "@assets": path.resolve(__dirname, "assets"),
            },
        },
        base: "/",
        build: {
            outDir: "dist",
            emptyOutDir: true,
        },
    };
});
