import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 8081,
    open: true,

    proxy: {
      "/game": "http://localhost:8000",
    },
  },
});
