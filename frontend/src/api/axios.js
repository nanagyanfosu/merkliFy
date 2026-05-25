import axios from "axios";

const TOKEN_KEY = "merkliFy_token";
const ROLE_KEY  = "merkliFy_role";

// ── Storage helpers ───────────────────────────────────────────────────────────

export const saveToken = (token, role) => {
  if (!token || typeof token !== "string" || !token.startsWith("eyJ")) {
    console.error(
      "[merkliFy] saveToken received an invalid token. Got:",
      token,
      "| type:", typeof token
    );
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(ROLE_KEY, role);
};

export const clearToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
};

export const getToken = () => {
  const t = sessionStorage.getItem(TOKEN_KEY);
  // Guard: reject null, "undefined", "null" — all falsy-equivalent values
  // that sessionStorage might hold if saveToken was called with bad data.
  if (!t || t === "undefined" || t === "null") return null;
  return t;
};

export const getRole = () => {
  const r = sessionStorage.getItem(ROLE_KEY);
  if (!r || r === "undefined" || r === "null") return null;
  return r;
};

// ── Axios instance ────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Request interceptor — single source of truth for auth header.
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — only redirect on 401 from protected routes,
// never from the login endpoint itself.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthEndpoint = url.includes("/auth/login") ||
                           url.includes("/auth/change-password");

    if (error.response?.status === 401 && !isAuthEndpoint) {
      clearToken();
      const path = window.location.pathname;
      window.location.href = path.startsWith("/issuer")
        ? "/issuer/login"
        : "/admin/login";
    }

    return Promise.reject(error);
  }
);

export default api;