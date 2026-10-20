import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth, REVIEWER_ROLES } from "../context/AuthContext";

const NAV_GROUPS: { label: string; items: { to: string; label: string }[] }[] = [
  {
    label: "Discover",
    items: [
      { to: "/discover", label: "Permission Discovery" },
      { to: "/search", label: "Search Regulations" },
    ],
  },
  {
    label: "Regulatory Intelligence",
    items: [
      { to: "/regulations", label: "Regulations" },
      { to: "/rules", label: "Rules" },
      { to: "/approvals", label: "Approvals" },
      { to: "/approvals-graph", label: "Dependency Graph" },
      { to: "/regulatory-changes", label: "Regulatory Changes" },
      { to: "/compare", label: "Text Comparison" },
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

export default function Layout() {
  const { role, email, logout } = useAuth();
  const canReview = role && REVIEWER_ROLES.includes(role);
  const location = useLocation();
  const isComparePage = location.pathname.startsWith("/compare");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  if (isComparePage) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-[#e5e7eb]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Collapsible App Navigation Sidebar */}
      <aside
        className={`flex flex-col border-r border-slate-200 bg-white transition-all duration-200 shrink-0 z-30 ${
          sidebarCollapsed ? "w-14" : "w-64"
        }`}
      >
        <div className="border-b border-slate-200 px-3 py-3 flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div>
              <NavLink to="/" className="block text-lg font-bold text-brand-700 tracking-tight">
                PermitGraph
              </NavLink>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Regulatory intelligence infrastructure
              </p>
            </div>
          ) : (
            <NavLink to="/" className="mx-auto text-base font-bold text-brand-700">
              PG
            </NavLink>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!sidebarCollapsed ? (
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
              ) : (
                <div className="h-2 w-full my-1 border-b border-slate-100" />
              )}
              <div className="space-y-0.5">
                {group.items
                  .filter((item) => item.to !== "/review" || canReview)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `block rounded-md px-2.5 py-1.5 text-xs transition truncate ${
                          isActive
                            ? "bg-brand-600 text-white font-semibold"
                            : "text-slate-600 hover:bg-slate-100"
                        } ${sidebarCollapsed ? "text-center text-[11px]" : ""}`
                      }
                    >
                      {sidebarCollapsed ? item.label.slice(0, 3) : item.label}
                    </NavLink>
                  ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-3 py-2 text-xs">
          {email ? (
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <>
                  <p className="truncate font-medium text-slate-700 text-[11px]">{email}</p>
                  <p className="text-[10px] text-slate-400">{role}</p>
                </>
              )}
              <button
                onClick={logout}
                className="text-brand-600 hover:underline text-[11px] block w-full text-left"
              >
                {sidebarCollapsed ? "Out" : "Sign out"}
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="text-brand-600 hover:underline text-xs">
              {sidebarCollapsed ? "In" : "Sign in"}
            </NavLink>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {isComparePage ? (
          <div className="flex-1 w-full h-full overflow-hidden">
            <Outlet />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl px-6 py-8">
              <Outlet />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
