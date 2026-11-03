import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Local `vite dev` only. In production / `vercel dev` the rewrites in
    // the root vercel.json route /api (and /uploads) to the server service
    // on the same domain, so no proxy or absolute API URL is needed there.
    proxy: { "/api": "http://localhost:5000", "/uploads": "http://localhost:5000" },
  },
});
