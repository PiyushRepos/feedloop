import axios from "axios";
import type { AxiosRequestConfig } from "axios";

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
  withCredentials: false,
});

// ─── Token helpers ────────────────────────────────────────────────────────────

export const token = {
  get access() {
    return localStorage.getItem("access_token");
  },
  get refresh() {
    return localStorage.getItem("refresh_token");
  },
  set(access: string, refresh: string) {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  },
  clear() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

// ─── Refresh queue ────────────────────────────────────────────────────────────
// Prevents concurrent requests from each triggering their own refresh.
// While a refresh is in-flight, new 401s queue up and resolve/reject together.

let isRefreshing = false;
let queue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown, newToken: string | null) {
  queue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(newToken!);
  });
  queue = [];
}

// ─── Request interceptor — attach access token ────────────────────────────────

client.interceptors.request.use((config) => {
  if (token.access) {
    config.headers.Authorization = `Bearer ${token.access}`;
  }
  return config;
});

// ─── Response interceptor — handle 401 + refresh ─────────────────────────────

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original: AxiosRequestConfig & { _retry?: boolean } = error.config;

    // Only attempt refresh on 401, when we have a refresh token,
    // and haven't already retried this request.
    if (
      error.response?.status !== 401 ||
      original._retry ||
      !token.refresh
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((newToken) => {
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return client(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${client.defaults.baseURL}/auth/refresh`,
        { refreshToken: token.refresh },
      );

      const { accessToken, refreshToken } = res.data;
      token.set(accessToken, refreshToken);

      client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      processQueue(null, accessToken);

      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${accessToken}`,
      };
      return client(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      token.clear();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
