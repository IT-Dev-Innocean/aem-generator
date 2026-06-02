import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { documentFetchProxy } from "./vite-plugin-document-proxy";

export default defineConfig({
  plugins: [react(), tailwindcss(), documentFetchProxy()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // pdfjs-dist ships a worker that should not be pre-bundled aggressively.
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
});
