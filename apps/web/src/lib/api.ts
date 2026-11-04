/**
 * Thin fetch wrapper for the PermitGraph API.
 *
 * All requests go to relative `/api/...` paths. In dev, Vite's own server-side proxy
 * (see vite.config.ts) forwards those to the FastAPI backend on localhost:8000 -- the
 * browser itself never addresses localhost/127.0.0.1. In production this app would be
 * served behind the same reverse proxy as the API (see docker/ once written).
 */

const TOKEN_KEY = "permitgraph_token";
const ROLE_KEY = "permitgraph_role";
const EMAIL_KEY = "permitgraph_email";

function getStorage(type: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return type === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getStorage("local")?.getItem(TOKEN_KEY) ?? getStorage("session")?.getItem(TOKEN_KEY) ?? null;
}

export function getRole(): string | null {
  return getStorage("local")?.getItem(ROLE_KEY) ?? getStorage("session")?.getItem(ROLE_KEY) ?? null;
}

export function getEmail(): string | null {
  return getStorage("local")?.getItem(EMAIL_KEY) ?? getStorage("session")?.getItem(EMAIL_KEY) ?? null;
}

export function setSession(token: string, role: string, email: string, remember: boolean = true) {
  const primary = remember ? getStorage("local") : getStorage("session");
  const secondary = remember ? getStorage("session") : getStorage("local");

  primary?.setItem(TOKEN_KEY, token);
  primary?.setItem(ROLE_KEY, role);
  primary?.setItem(EMAIL_KEY, email);

  secondary?.removeItem(TOKEN_KEY);
  secondary?.removeItem(ROLE_KEY);
  secondary?.removeItem(EMAIL_KEY);
}

export function clearSession() {
  getStorage("local")?.removeItem(TOKEN_KEY);
  getStorage("local")?.removeItem(ROLE_KEY);
  getStorage("local")?.removeItem(EMAIL_KEY);
  getStorage("session")?.removeItem(TOKEN_KEY);
  getStorage("session")?.removeItem(ROLE_KEY);
  getStorage("session")?.removeItem(EMAIL_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData) && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ? (typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail)) : detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

