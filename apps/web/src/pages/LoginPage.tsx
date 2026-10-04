import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ErrorNotice } from "../components/Loading";

const DEMO_ACCOUNTS = [
  ["admin@permitgraph.dev", "ADMIN"],
  ["reviewer@permitgraph.dev", "REGULATORY_REVIEWER"],
  ["officer@permitgraph.dev", "OFFICER"],
  ["business@permitgraph.dev", "BUSINESS_USER"],
];

export default function LoginPage() {
  const [email, setEmail] = useState("reviewer@permitgraph.dev");
  const [password, setPassword] = useState("permitgraph-dev-only");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ access_token: string; role: string; email: string }>(
        "/api/v1/auth/login",
        { email, password }
      );
      login(res.access_token, res.role, res.email ?? email);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500">
        Role determines which actions you can take — e.g. only REGULATORY_REVIEWER /
        ADMIN can approve candidate rules in the Review Queue.
      </p>
      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Email</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <ErrorNotice message={error} />}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        <p className="mb-1 font-semibold text-slate-600">Dev-only demo accounts (password: permitgraph-dev-only)</p>
        <ul className="space-y-0.5">
          {DEMO_ACCOUNTS.map(([e, r]) => (
            <li key={e}>
              <button
                type="button"
                className="text-brand-600 hover:underline"
                onClick={() => setEmail(e)}
              >
                {e}
              </button>{" "}
              — {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
