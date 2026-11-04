import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import inertia from "@inertiajs/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
    plugins: [
        laravel({ input: ["resources/js/app.tsx"], refresh: true }),
        react(),
        tailwindcss(),
        inertia({ ssr: false }),
    ],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./resources/js", import.meta.url)),
        },
    },
    server: {
        host: "127.0.0.1",
        watch: { ignored: ["**/storage/framework/views/**"] },
    },
});
