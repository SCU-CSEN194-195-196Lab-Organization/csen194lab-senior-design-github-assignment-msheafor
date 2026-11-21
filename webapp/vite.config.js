import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catherinePublic = path.join(repoRoot, "game-prototypes", "catherine", "public");

const contentTypes = {
  ".png": "image/png",
  ".json": "application/json",
  ".css": "text/css",
};

function serveCatherinePublic() {
  return {
    name: "serve-catherine-public",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (!url || !(url.startsWith("/assets/") || url === "/suspects.json")) {
          next();
          return;
        }
        const relativeUrl = url.replace(/^\/+/, "");
        const filePath = path.resolve(catherinePublic, relativeUrl);
        const relative = path.relative(catherinePublic, filePath);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          next();
          return;
        }
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          next();
          return;
        }
        res.setHeader("Content-Type", contentTypes[path.extname(filePath)] ?? "application/octet-stream");
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveCatherinePublic()],
  server: {
    port: 5173,
    fs: {
      allow: [repoRoot],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/coach": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/dismiss": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/game/hint": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
