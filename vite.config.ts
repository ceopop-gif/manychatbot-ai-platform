import vinext from "vinext";
import { defineConfig } from "vite";
import { resolve as resolvePath } from "node:path";

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: resolvePath(".") }],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
  plugins: [vinext()],
});
