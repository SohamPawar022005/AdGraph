import { createContext, useContext, useState, type ReactNode } from "react";
import { clearSession, getEmail, getRole, getToken, setSession } from "../lib/api";

interface AuthState {
  token: string | null;
  role: string | null;
  email: string | null;
  login: (token: string, role: string, email: string, remember?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Demo mode: default to active Admin role if not already set in storage
  const [token, setToken] = useState<string | null>(getToken() || "demo-admin-token");
  const [role, setRole] = useState<string | null>(getRole() || "ADMIN");
  const [email, setEmail] = useState<string | null>(getEmail() || "admin@permitgraph.dev");

  function login(t: string, r: string, e: string, remember: boolean = true) {
    setSession(t, r, e, remember);
    setToken(t);
    setRole(r);
    setEmail(e);
  }

  function logout() {
    clearSession();
    setToken(null);
    setRole(null);
    setEmail(null);
  }

  return <AuthContext.Provider value={{ token, role, email, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { REVIEWER_ROLES } from "../lib/types";

