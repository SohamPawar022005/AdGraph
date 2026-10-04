import { NavLink, Outlet } from "react-router-dom";
import { useAuth, REVIEWER_ROLES } from "../context/AuthContext";

const NAV_GROUPS: { label: string; items: { to: string; label: string }[] }[] = [
  {
    label: "Discover",
    items: [{ to: "/discover", label: "Permission Discovery" }],
  },
  {
    label: "Regulatory Intelligence",
    items: [
      { to: "/regulations", label: "Regulations" },
      { to: "/rules", label: "Rules" },
      { to: "/approvals", label: "Approvals" },
      { to: "/approvals-graph", label: "Dependency Graph" },
      { to: "/regulatory-changes", label: "Regulatory Changes" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/businesses", label: "Businesses" },
      { to: "/applications", label: "Applications" },
      { to: "/documents", label: "Documents" },
    ],
  },
  {
    label: "Governance",
    items: [
      { to: "/audit", label: "Audit Log" },
      { to: "/review", label: "Review Queue" },
    ],
  },
];

function linkClass({ isActive }: { isActive: boolean }) {
  return `block rounded-md px-3 py-1.5 text-sm transition ${
    isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
  }`;
}

export default function Layout() {
  const { role, email, logout } = useAuth();
  const canReview = role && REVIEWER_ROLES.includes(role);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <NavLink to="/" className="block text-lg font-bold text-brand-700">
            PermitGraph
          </NavLink>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Regulatory intelligence infrastructure — not a government portal
          </p>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items
                  .filter((item) => item.to !== "/review" || canReview)
                  .map((item) => (
                    <NavLink key={item.to} to={item.to} className={linkClass}>
                      {item.label}
                    </NavLink>
                  ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-4 py-3 text-xs">
          {email ? (
            <div className="space-y-1">
              <p className="truncate font-medium text-slate-700">{email}</p>
              <p className="text-slate-400">{role}</p>
              <button onClick={logout} className="mt-1 text-brand-600 hover:underline">
                Sign out
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="text-brand-600 hover:underline">
              Sign in
            </NavLink>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
