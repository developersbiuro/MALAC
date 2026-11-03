import axios from "axios";

// API base URL — relative "/api" by default, on purpose:
// - Local dev: Vite's dev proxy (vite.config.js) forwards /api to the
//   Express server on localhost:5000.
// - Vercel (services mode, see vercel.json at the repo root): the browser
//   calls /api on the SAME domain as the storefront, and the top-level
//   rewrite { source: "/api/(.*)", destination: { service: "server" } }
//   routes it to the Express service. /uploads/* (payment screenshots)
//   is rewritten to the server service the same way.
// The client -> server service binding in vercel.json injects SERVER_URL
// into the client service's *runtime* environment. Browser code cannot use
// it (bindings resolve in functions only, never in a static browser
// bundle, and the internal service URL must not be baked into public JS),
// so the public /api path via the rewrite is the correct browser route.
// Set VITE_API_URL only to override this with an absolute API origin
// (it is read at build time by Vite).
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("malac_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired/invalid: clear it (route guards will handle redirect)
      localStorage.removeItem("malac_token");
    }
    return Promise.reject(err);
  }
);

export default api;
