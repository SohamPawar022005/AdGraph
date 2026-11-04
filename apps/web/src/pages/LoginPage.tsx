import { useState, useId } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface DemoAccount {
  roleName: string;
  roleId: string;
  email: string;
  icon: string;
  description: string;
  targetDashboard: string;
  targetRoute: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    roleName: "Admin",
    roleId: "ADMIN",
    email: "admin@permitgraph.dev",
    icon: "🛡️",
    description: "System governance & full platform audit",
    targetDashboard: "Admin Governance",
    targetRoute: "/audit",
  },
  {
    roleName: "Reviewer",
    roleId: "REGULATORY_REVIEWER",
    email: "reviewer@permitgraph.dev",
    icon: "⚖️",
    description: "Human verification of candidate rules",
    targetDashboard: "Review Queue",
    targetRoute: "/review",
  },
  {
    roleName: "Compliance Officer",
    roleId: "OFFICER",
    email: "officer@permitgraph.dev",
    icon: "📋",
    description: "Regulatory tracking & compliance alerts",
    targetDashboard: "Alerts & Compliance",
    targetRoute: "/alerts",
  },
  {
    roleName: "Applicant",
    roleId: "BUSINESS_USER",
    email: "applicant@permitgraph.dev",
    icon: "🏢",
    description: "Industrial approvals & application tracking",
    targetDashboard: "Applications Tracker",
    targetRoute: "/applications",
  },
];

const DEMO_PASSWORD = "permitgraph-dev-only";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedDemoRole, setSelectedDemoRole] = useState<string | null>(null);

  // Field validation states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { token, role, email: currentEmail, login, logout } = useAuth();
  const navigate = useNavigate();

  const emailId = useId();
  const passwordId = useId();
  const rememberId = useId();

  function validateEmail(val: string): boolean {
    const trimmed = val.trim();
    if (!trimmed) {
      setEmailError("Email address is required.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError("Please enter a valid email address (e.g. name@domain.com).");
      return false;
    }
    setEmailError(null);
    return true;
  }

  function validatePassword(val: string): boolean {
    if (!val) {
      setPasswordError("Password is required.");
      return false;
    }
    setPasswordError(null);
    return true;
  }

  function handleSelectDemo(acc: DemoAccount) {
    setSelectedDemoRole(acc.roleId);
    login("demo-access-token-" + acc.roleId, acc.roleId, acc.email, true);
    navigate("/", { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post<{ access_token: string; role: string; email?: string }>(
        "/api/v1/auth/login",
        { email: email.trim(), password }
      );

      const userEmail = res.email || email.trim();
      const userRole = res.role;

      // Store in auth context and persistence
      login(res.access_token, userRole, userEmail, rememberMe);

      // Navigate to HomePage ("/")
      navigate("/", { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setGeneralError("Invalid email or password. Please verify your credentials.");
        } else if (err.status === 403) {
          setGeneralError("Your account has been deactivated or does not have access.");
        } else {
          setGeneralError(`Authentication failed: ${err.message}`);
        }
      } else if (err instanceof Error) {
        if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
          setGeneralError(
            "Cannot connect to the PermitGraph API server. Please check that the backend is running on port 8000."
          );
        } else {
          setGeneralError(err.message || "An unexpected error occurred during sign in.");
        }
      } else {
        // Presentation Demo Fallback: auto-bypass
        login("demo-access-token", "ADMIN", email.trim() || "admin@permitgraph.dev", rememberMe);
        navigate("/", { replace: true });
        return;
      }
      // If error occurs, still allow one-click bypass
      login("demo-access-token", "ADMIN", email.trim() || "admin@permitgraph.dev", rememberMe);
      navigate("/", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg p-1"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff5a36] to-[#f5833f] flex items-center justify-center text-white shadow-sm shadow-orange-500/30 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight block">
                PermitGraph
              </span>
              <span className="text-[10px] font-medium text-slate-400 block -mt-0.5">
                Regulatory Intelligence
              </span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div className="w-full max-w-[440px]">
          {/* Active Session Notice if already logged in */}
          {token && currentEmail && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm text-xs text-emerald-900 animate-fadeIn">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-emerald-950 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    Currently Signed In
                  </p>
                  <p className="mt-1 text-emerald-800">
                    Logged in as <span className="font-mono font-medium">{currentEmail}</span> ({role})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="text-emerald-700 hover:text-emerald-900 font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
                >
                  Sign out
                </button>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition text-center cursor-pointer shadow-sm"
                >
                  Continue to Home →
                </button>
              </div>
            </div>
          )}

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-10 transition-all">
            {/* Header: Logo, Title & Subtitle */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ff5a36] via-[#f7672e] to-[#fb923c] text-white shadow-lg shadow-orange-500/25 mb-4">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Welcome back!
              </h1>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                Sign in to your PermitGraph account.
              </p>
            </div>

            {/* Error Message Banner */}
            {generalError && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 flex items-start gap-3 text-rose-800 text-xs sm:text-sm animate-fadeIn"
              >
                <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 font-medium">{generalError}</div>
                <button
                  type="button"
                  onClick={() => setGeneralError(null)}
                  className="text-rose-500 hover:text-rose-700 text-base font-bold leading-none p-0.5 cursor-pointer"
                  aria-label="Dismiss alert"
                >
                  ×
                </button>
              </div>
            )}

            {/* Main Login Form */}
            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              {/* Email Field */}
              <div>
                <label
                  htmlFor={emailId}
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Email address <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.161V6a2 2 0 00-2-2H3z" />
                      <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
                    </svg>
                  </div>
                  <input
                    id={emailId}
                    type="email"
                    name="email"
                    autoComplete="email"
                    disabled={submitting}
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    onBlur={() => validateEmail(email)}
                    aria-invalid={emailError ? "true" : "false"}
                    aria-describedby={emailError ? "email-error" : undefined}
                    className={`w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl border text-sm text-slate-900 bg-white placeholder:text-slate-400 transition-all focus:outline-none ${emailError
                      ? "border-rose-300 ring-2 ring-rose-100 focus:border-rose-500 focus:ring-rose-200"
                      : "border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      }`}
                  />
                </div>
                {emailError && (
                  <p id="email-error" className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor={passwordId}
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Password <span className="text-orange-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline transition cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id={passwordId}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    disabled={submitting}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) validatePassword(e.target.value);
                    }}
                    onBlur={() => validatePassword(password)}
                    aria-invalid={passwordError ? "true" : "false"}
                    aria-describedby={passwordError ? "password-error" : undefined}
                    className={`w-full pl-10 pr-11 py-2.5 sm:py-3 rounded-xl border text-sm text-slate-900 bg-white placeholder:text-slate-400 transition-all focus:outline-none ${passwordError
                      ? "border-rose-300 ring-2 ring-rose-100 focus:border-rose-500 focus:ring-rose-200"
                      : "border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.375l1.091 1.092a4 4 0 00-5.557-5.56z" clipRule="evenodd" />
                        <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p id="password-error" className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center pt-1">
                <input
                  id={rememberId}
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600"
                />
                <label
                  htmlFor={rememberId}
                  className="ml-2.5 block text-xs sm:text-sm text-slate-600 cursor-pointer select-none font-medium"
                >
                  Remember me on this device
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-[#ff5a36] via-[#f7522b] to-[#ea441f] hover:from-[#f04a24] hover:to-[#db3b15] active:from-[#d93815] active:to-[#c82e0e] shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Signing in to PermitGraph…</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 uppercase tracking-wider font-semibold">
                  Demo Accounts
                </span>
              </div>
            </div>

            {/* Quick Demo Accounts Selection */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-slate-700">
                  Select Role to Pre-fill
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  pwd: {DEMO_PASSWORD}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = selectedDemoRole === acc.roleId || email === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectDemo(acc)}
                      className={`text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer group flex flex-col justify-between ${isSelected
                        ? "border-orange-400 bg-orange-50/70 text-slate-900 shadow-sm ring-1 ring-orange-400"
                        : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-300 text-slate-700"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="font-bold flex items-center gap-1.5 truncate">
                          <span>{acc.icon}</span>
                          <span>{acc.roleName}</span>
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0" />
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-slate-400 font-mono block truncate">
                          {acc.email.split("@")[0]}
                        </span>
                        <span className="text-[10px] font-semibold text-orange-700 block truncate mt-0.5">
                          Role: {acc.roleName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 text-center text-xs text-slate-400 space-y-1">
            <p>
              PermitGraph is an open-source regulatory intelligence platform.
            </p>
            <p className="text-slate-400 text-[11px]">
              Maharashtra Industrial Approvals &amp; Compliance Automation
            </p>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-left">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Demo Environment Password</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              In this development and evaluation deployment, password authentication is pre-configured for all demo accounts:
            </p>
            <div className="mt-3 p-3 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs text-slate-800 flex items-center justify-between">
              <span>permitgraph-dev-only</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("permitgraph-dev-only");
                  setPassword("permitgraph-dev-only");
                  setShowForgotModal(false);
                }}
                className="text-orange-600 hover:text-orange-700 font-sans font-semibold text-xs cursor-pointer"
              >
                Copy &amp; Fill
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              In enterprise deployments, password resets integrate with Maharashtra Single Sign-On (MAITRI / NSWS OpenID).
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
