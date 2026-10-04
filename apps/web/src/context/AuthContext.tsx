import { createContext, useContext, useState, type ReactNode } from "react";
import { clearSession, getEmail, getRole, getToken, setSession } from "../lib/api";

interface AuthState {
  token: string | null;
  role: string | null;
  email: string | null;
  login: (token: string, role: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(getToken());
  const [role, setRole] = useState(getRole());
  const [email, setEmail] = useState(getEmail());

  function login(t: string, r: string, e: string) {
    setSession(t, r, e);
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

export const REVIEWER_ROLES = ["REGULATORY_REVIEWER", "ADMIN"];
