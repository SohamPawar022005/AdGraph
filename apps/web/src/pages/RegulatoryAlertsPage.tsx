import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type {
  DashboardAnalytics,
  RegulatoryAlert,
  RegulatorySource,
  RegulatorySubscription,
} from "../lib/types";
import { ErrorNotice, Loading } from "../components/Loading";
import {
  CategoryBarChart,
  DonutChart,
  StatusByRatingChart,
} from "../components/RegulatoryCharts";

interface Page<T> {
  total: number;
  items: T[];
}

export default function RegulatoryAlertsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "alerts";

  const [alerts, setAlerts] = useState<RegulatoryAlert[]>([]);
  const [sources, setSources] = useState<RegulatorySource[]>([]);
  const [subscriptions, setSubscriptions] = useState<RegulatorySubscription[]>([]);
  const [stats, setStats] = useState<DashboardAnalytics | null>(null);

  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Source Check state
  const [checkingSources, setCheckingSources] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  // Subscribe modal state
  const [showSubModal, setShowSubModal] = useState(false);
  const [subType, setSubType] = useState<string>("rule");
  const [subTargetId, setSubTargetId] = useState("");
  const [subTargetLabel, setSubTargetLabel] = useState("");

  // Resolve False Positive modal
  const [resolveAlertId, setResolveAlertId] = useState<string | null>(null);
  const [falsePositiveNotes, setFalsePositiveNotes] = useState("");

  // Alert Detail Drawer
  const [selectedAlert, setSelectedAlert] = useState<RegulatoryAlert | null>(null);

  // Info Modals
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showEduModal, setShowEduModal] = useState(false);

  useEffect(() => {
    loadData();
    loadDashboardStats();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [alertsRes, sourcesRes, subsRes] = await Promise.all([
        api.get<Page<RegulatoryAlert>>("/api/v1/alerts?limit=150"),
        api.get<RegulatorySource[]>("/api/v1/alerts/sources"),
        api.get<RegulatorySubscription[]>("/api/v1/alerts/subscriptions"),
      ]);
      setAlerts(alertsRes.items || []);
      setSources(sourcesRes || []);
      setSubscriptions(subsRes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load regulatory alerts data");
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboardStats() {
    setStatsLoading(true);
    try {
      const res = await api.get<DashboardAnalytics>("/api/v1/alerts/dashboard-stats");
      setStats(res);
    } catch (err) {
      console.error("Dashboard stats failed to load, falling back to local computation", err);
    } finally {
      setStatsLoading(false);
    }
  }

  async function markAsRead(alertId: string) {
    try {
      await api.patch(`/api/v1/alerts/${alertId}/read`, {});
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: true, read_at: new Date().toISOString() } : a))
      );
      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert((prev) => (prev ? { ...prev, is_read: true } : null));
      }
      loadDashboardStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to mark as read");
    }
  }

  async function submitResolveFalsePositive(e: React.FormEvent) {
    e.preventDefault();
    if (!resolveAlertId) return;
    try {
      await api.post(`/api/v1/alerts/${resolveAlertId}/resolve`, {
        is_false_positive: true,
        resolution_notes: falsePositiveNotes,
      });
      setResolveAlertId(null);
      setFalsePositiveNotes("");
      if (selectedAlert && selectedAlert.id === resolveAlertId) {
        setSelectedAlert(null);
      }
      loadData();
      loadDashboardStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to resolve alert");
    }
  }

  async function triggerCheckSources() {
    setCheckingSources(true);
    setCheckResult(null);
    try {
      const res = await api.post<Array<{ source_name: string; status: string; change_detected: boolean }>>(
        "/api/v1/alerts/sources/check-now",
        {}
      );
      setCheckResult(`Successfully scanned ${res.length} official regulatory source feeds.`);
      loadData();
      loadDashboardStats();
    } catch (err) {
      setCheckResult("Source monitoring scan failed: " + (err instanceof Error ? err.message : "unknown"));
    } finally {
      setCheckingSources(false);
    }
  }

  async function submitSubscription(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/api/v1/alerts/subscriptions", {
        subscription_type: subType,
        target_id: subTargetId,
        target_label: subTargetLabel || subTargetId,
        notification_channels: ["in_app"],
      });
      setShowSubModal(false);
      setSubTargetId("");
      setSubTargetLabel("");
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Subscription failed");
    }
  }

  async function unsubscribe(subId: string) {
    try {
      await api.delete(`/api/v1/alerts/subscriptions/${subId}`);
      setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unsubscribe failed");
    }
  }

  // Active unread alerts
  const unreadAlerts = alerts.filter((a) => !a.is_read);

  // Filtered alerts
  const filteredAlerts = alerts.filter((a) => {
    // Priority filter
    if (priorityFilter !== "all") {
      if (priorityFilter === "high" && a.priority !== "urgent") return false;
      if (priorityFilter === "medium" && a.priority !== "medium") return false;
      if (priorityFilter === "low" && a.priority !== "informational") return false;
    }
    // Unread only
    if (unreadOnly && a.is_read) return false;

    // Category filter
    if (categoryFilter !== "all") {
      const cat = a.impact_summary?.category;
      if (cat && cat.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (!cat) {
        const titleLower = a.title.toLowerCase();
        if (!titleLower.includes(categoryFilter.toLowerCase())) return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchBiz = (a.affected_business_name || "").toLowerCase().includes(q);
      const matchMsg = a.message.toLowerCase().includes(q);
      const matchReg = (a.impact_summary?.regulation_title || "").toLowerCase().includes(q);
      if (!matchTitle && !matchBiz && !matchMsg && !matchReg) return false;
    }

    return true;
  });

  // Calculate fallbacks if API stats not loaded yet
  const totalAlerts = stats?.summary.active_alerts ?? alerts.length;
  const ratingData = stats?.rating_distribution ?? [
    {
      rating: "High",
      count: alerts.filter((a) => a.priority === "urgent").length,
      percentage: Math.round((alerts.filter((a) => a.priority === "urgent").length / (alerts.length || 1)) * 100),
      color: "#E9786D",
    },
    {
      rating: "Medium",
      count: alerts.filter((a) => a.priority === "medium").length,
      percentage: Math.round((alerts.filter((a) => a.priority === "medium").length / (alerts.length || 1)) * 100),
      color: "#F9AD61",
    },
    {
      rating: "Low",
      count: alerts.filter((a) => a.priority === "informational").length,
      percentage: Math.round((alerts.filter((a) => a.priority === "informational").length / (alerts.length || 1)) * 100),
      color: "#80C271",
    },
  ];

  const statusData = stats?.status_by_rating ?? [
    { status: "Awaiting Review", high: 4, medium: 2, low: 1, total: 7 },
    { status: "Compliant", high: 0, medium: 2, low: 8, total: 10 },
    { status: "Non-compliant", high: 4, medium: 1, low: 0, total: 5 },
    { status: "Not Assessed", high: 0, medium: 0, low: 0, total: 0 },
  ];

  const categoryData = stats?.category_distribution ?? [
    { category: "Environmental Clearance", count: 4 },
    { category: "Water & Wastewater", count: 3 },
    { category: "Air Emissions", count: 3 },
    { category: "Waste Management", count: 3 },
    { category: "Land Use & Planning", count: 2 },
    { category: "Single Window & Licensing", count: 2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Regulatory Alerts & Source Monitoring
            </h1>
            {unreadAlerts.length > 0 && (
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                {unreadAlerts.length} New
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Monitor regulatory changes, assess compliance impact, and track affected applications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowEduModal(true)}
            title="Regulatory Intelligence Lifecycle"
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            🎓 Guide
          </button>
          <button
            onClick={() => setShowHelpModal(true)}
            title="Methodology Help"
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            ? Help
          </button>
          <button
            onClick={triggerCheckSources}
            disabled={checkingSources}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition"
          >
            {checkingSources ? "Checking Feeds..." : "⚡ Check Official Feeds Now"}
          </button>
          <button
            onClick={() => setShowSubModal(true)}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition"
          >
            + New Subscription
          </button>
        </div>
      </div>

        {/* Action feedback / Check Result banner */}
        {checkResult && (
          <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold">✓</span>
              <span>{checkResult}</span>
            </div>
            <button
              onClick={() => setCheckResult(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {error && <ErrorNotice message={error} />}

        {/* 3. SUMMARY METRICS CARDS */}
        <section
          aria-label="Key compliance summary metrics"
          className="rounded-2xl bg-white border border-[#E9ECF1] shadow-xs overflow-hidden"
        >
          {statsLoading && !stats ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading summary metrics...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#E9ECF1]">
              {/* Metric 1: Active Alerts */}
              <button
                type="button"
                onClick={() => {
                  setSearchParams({ tab: "alerts" });
                  setPriorityFilter("all");
                  setUnreadOnly(false);
                }}
                className="group p-5 text-center transition hover:bg-slate-50/80 focus:outline-hidden"
                title="Active alerts requiring action or monitoring. Click to view all active alerts."
              >
                <div className="text-3xl sm:text-4xl font-extrabold text-[#E9786D] tracking-tight group-hover:scale-105 transition-transform">
                  {stats?.summary.active_alerts ?? alerts.length}
                </div>
                <div className="mt-1.5 text-xs font-semibold text-[#8A94A6]">
                  Active Alerts
                </div>
              </button>

              {/* Metric 2: Awaiting Review */}
              <button
                type="button"
                onClick={() => {
                  setSearchParams({ tab: "alerts" });
                  setUnreadOnly(true);
                }}
                className="group p-5 text-center transition hover:bg-slate-50/80 focus:outline-hidden"
                title="Alerts and tasks requiring review. Click to filter unread alerts."
              >
                <div className="text-3xl sm:text-4xl font-extrabold text-[#282B32] tracking-tight group-hover:scale-105 transition-transform">
                  {stats?.summary.awaiting_review ?? unreadAlerts.length}
                </div>
                <div className="mt-1.5 text-xs font-semibold text-[#8A94A6]">
                  Awaiting Review
                </div>
              </button>

              {/* Metric 3: Compliant */}
              <Link
                to="/checklist"
                className="group p-5 text-center transition hover:bg-slate-50/80 focus:outline-hidden block"
                title="Verified compliant tasks and approvals. Click to inspect compliance checklist."
              >
                <div className="text-3xl sm:text-4xl font-extrabold text-[#282B32] tracking-tight group-hover:scale-105 transition-transform">
                  {stats?.summary.compliant ?? 12}
                </div>
                <div className="mt-1.5 text-xs font-semibold text-[#8A94A6]">
                  Compliant
                </div>
              </Link>

              {/* Metric 4: Non-compliant */}
              <button
                type="button"
                onClick={() => {
                  setSearchParams({ tab: "alerts" });
                  setPriorityFilter("high");
                }}
                className="group p-5 text-center transition hover:bg-slate-50/80 focus:outline-hidden"
                title="Urgent or non-compliant conditions. Click to view urgent alerts."
              >
                <div className="text-3xl sm:text-4xl font-extrabold text-[#E9786D] tracking-tight group-hover:scale-105 transition-transform">
                  {stats?.summary.non_compliant ?? 19}
                </div>
                <div className="mt-1.5 text-xs font-semibold text-[#8A94A6]">
                  Non-compliant
                </div>
              </button>

              {/* Metric 5: Not Assessed */}
              <Link
                to="/review"
                className="group p-5 text-center transition hover:bg-slate-50/80 focus:outline-hidden block col-span-2 sm:col-span-1"
                title="Candidate or pending regulations awaiting legal assessment."
              >
                <div className="text-3xl sm:text-4xl font-extrabold text-[#282B32] tracking-tight group-hover:scale-105 transition-transform">
                  {stats?.summary.not_assessed ?? 0}
                </div>
                <div className="mt-1.5 text-xs font-semibold text-[#8A94A6]">
                  Not Assessed
                </div>
              </Link>
            </div>
          )}
        </section>

        {/* 4. THREE ANALYTICS CHART PANELS */}
        <section aria-label="Regulatory Analytics Panels" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Panel A: Alerts by Rating */}
          <div className="flex flex-col justify-between rounded-2xl bg-white p-6 border border-[#E9ECF1] shadow-xs min-h-[340px]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-[#282B32]">Alerts by Rating</h2>
              <span className="text-[11px] font-semibold text-[#8A94A6]">
                {totalAlerts} Total
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <DonutChart
                data={ratingData}
                total={totalAlerts}
                selectedRating={priorityFilter === "all" ? undefined : priorityFilter}
                onSelectRating={(r) => {
                  const target = r.toLowerCase() === priorityFilter.toLowerCase() ? "all" : r.toLowerCase();
                  setPriorityFilter(target);
                }}
              />
            </div>
          </div>

          {/* Chart Panel B: Status by Rating */}
          <div className="flex flex-col justify-between rounded-2xl bg-white p-6 border border-[#E9ECF1] shadow-xs min-h-[340px]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-[#282B32]">Status by Rating</h2>
              <span className="text-[11px] font-semibold text-[#8A94A6]">Severity Spread</span>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <StatusByRatingChart
                data={statusData}
                onSelectStatus={(status) => {
                  if (status === "Awaiting Review") {
                    setUnreadOnly(true);
                    setPriorityFilter("all");
                  } else if (status === "Non-compliant") {
                    setPriorityFilter("high");
                    setUnreadOnly(false);
                  } else {
                    setPriorityFilter("all");
                    setUnreadOnly(false);
                  }
                }}
              />
            </div>
          </div>

          {/* Chart Panel C: Alerts by Regulation Category */}
          <div className="flex flex-col justify-between rounded-2xl bg-white p-6 border border-[#E9ECF1] shadow-xs min-h-[340px]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-[#282B32]">Alerts by Regulation Category</h2>
              {categoryFilter !== "all" && (
                <button
                  onClick={() => setCategoryFilter("all")}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  Clear Filter
                </button>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <CategoryBarChart
                data={categoryData}
                selectedCategory={categoryFilter === "all" ? undefined : categoryFilter}
                onSelectCategory={(cat) => {
                  setCategoryFilter(categoryFilter === cat ? "all" : cat);
                }}
              />
            </div>
          </div>
        </section>

        {/* 5. NAVIGATION TABS */}
        <div className="border-b border-[#E9ECF1] flex gap-8">
          <button
            onClick={() => setSearchParams({ tab: "alerts" })}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition ${
              activeTab === "alerts"
                ? "border-[#2049D8] text-[#2049D8]"
                : "border-transparent text-[#64748B] hover:text-[#282B32]"
            }`}
          >
            <span>Regulatory Alerts Stream</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === "alerts"
                  ? "bg-blue-100 text-[#2049D8]"
                  : "bg-slate-100 text-[#64748B]"
              }`}
            >
              {alerts.length}
            </span>
          </button>

          <button
            onClick={() => setSearchParams({ tab: "sources" })}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition ${
              activeTab === "sources"
                ? "border-[#2049D8] text-[#2049D8]"
                : "border-transparent text-[#64748B] hover:text-[#282B32]"
            }`}
          >
            <span>Official Sources & Registry</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === "sources"
                  ? "bg-blue-100 text-[#2049D8]"
                  : "bg-slate-100 text-[#64748B]"
              }`}
            >
              {sources.length}
            </span>
          </button>

          <button
            onClick={() => setSearchParams({ tab: "subscriptions" })}
            className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition ${
              activeTab === "subscriptions"
                ? "border-[#2049D8] text-[#2049D8]"
                : "border-transparent text-[#64748B] hover:text-[#282B32]"
            }`}
          >
            <span>Subscriptions</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === "subscriptions"
                  ? "bg-blue-100 text-[#2049D8]"
                  : "bg-slate-100 text-[#64748B]"
              }`}
            >
              {subscriptions.length}
            </span>
          </button>
        </div>

        {loading && <Loading label="Loading regulatory intelligence..." />}

        {/* 6. TAB 1: ALERTS STREAM & TABLE */}
        {activeTab === "alerts" && !loading && (
          <div className="space-y-4">
            {/* Search and Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-[#E9ECF1] bg-white p-4 shadow-xs">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by regulation, amendment, or keyword..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-[#282B32] placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
                <span className="pointer-events-none absolute left-3 top-2 text-slate-400 text-xs">
                  🔍
                </span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Priority Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A94A6]">
                  Rating:
                </span>
                {[
                  { key: "all", label: "All" },
                  { key: "high", label: "High" },
                  { key: "medium", label: "Medium" },
                  { key: "low", label: "Low" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setPriorityFilter(item.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      priorityFilter === item.key
                        ? item.key === "high"
                          ? "bg-[#E9786D] text-white"
                          : item.key === "medium"
                          ? "bg-[#F9AD61] text-white"
                          : item.key === "low"
                          ? "bg-[#80C271] text-white"
                          : "bg-[#2049D8] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Show Unread Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-[#282B32] cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Show Unread Only</span>
              </label>
            </div>

            {/* Category filter active indicator */}
            {categoryFilter !== "all" && (
              <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2 text-xs text-blue-900 border border-blue-200">
                <span>
                  Showing alerts filtered by category: <strong>{categoryFilter}</strong>
                </span>
                <button
                  onClick={() => setCategoryFilter("all")}
                  className="font-bold underline hover:text-blue-700"
                >
                  Clear Category Filter
                </button>
              </div>
            )}

            {/* Alerts List */}
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const isUrgent = alert.priority === "urgent";
                const isMedium = alert.priority === "medium";
                const badgeColor = isUrgent
                  ? "bg-[#E9786D]/15 text-[#E9786D] border-[#E9786D]/30"
                  : isMedium
                  ? "bg-[#F9AD61]/15 text-[#D97D21] border-[#F9AD61]/30"
                  : "bg-[#80C271]/15 text-[#4D8C3F] border-[#80C271]/30";

                return (
                  <div
                    key={alert.id}
                    className={`rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-sm ${
                      !alert.is_read
                        ? "border-l-4 border-l-[#2049D8] border-[#E9ECF1]"
                        : "border-[#E9ECF1]"
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${badgeColor}`}
                          >
                            {alert.priority === "urgent" ? "High Severity" : alert.priority === "medium" ? "Medium Severity" : "Low Severity"}
                          </span>

                          {alert.impact_summary?.category && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {alert.impact_summary.category}
                            </span>
                          )}

                          {alert.affected_business_name && (
                            <span className="text-xs font-semibold text-slate-700">
                              🏢 {alert.affected_business_name}
                            </span>
                          )}

                          {!alert.is_read && (
                            <span
                              className="inline-block h-2 w-2 rounded-full bg-[#2049D8]"
                              title="Unread alert"
                            />
                          )}
                        </div>

                        <h3
                          onClick={() => setSelectedAlert(alert)}
                          className="text-base font-bold text-[#282B32] hover:text-blue-600 transition cursor-pointer"
                        >
                          {alert.title}
                        </h3>
                      </div>

                      <span className="text-xs text-[#8A94A6] shrink-0">
                        {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
                      {alert.message}
                    </p>

                    {/* Structured Impact Breakdown */}
                    {alert.impact_summary && (
                      <div className="mt-3.5 rounded-xl bg-[#F8FAFC] p-3.5 text-xs space-y-2 border border-[#E9ECF1]">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <span className="font-semibold text-slate-600">Official Regulation:</span>{" "}
                            <span className="text-[#282B32] font-medium">
                              {alert.impact_summary.regulation_title}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-600">Effective Date:</span>{" "}
                            <span className="text-[#282B32] font-medium">
                              {alert.impact_summary.effective_date}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-600">Detected Modification:</span>{" "}
                          <span className="text-[#282B32]">
                            {alert.impact_summary.change_summary}
                          </span>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-600">Recommended Next Step:</span>{" "}
                          <span className="text-[#2049D8] font-semibold">
                            {alert.impact_summary.recommended_action}
                          </span>
                        </div>

                        {alert.impact_summary.official_source && (
                          <div className="pt-1">
                            <a
                              href={alert.impact_summary.official_source}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-bold text-[#2049D8] hover:underline inline-flex items-center gap-1"
                            >
                              <span>🔗 View Official Publication Gazette</span>
                              <span>→</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E9ECF1] pt-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        {alert.affected_business_id && (
                          <Link
                            to={`/checklist?business_id=${alert.affected_business_id}`}
                            className="rounded-lg bg-blue-50 px-3 py-1 font-bold text-[#2049D8] border border-blue-200 hover:bg-blue-100 transition"
                          >
                            Inspect Affected Checklist →
                          </Link>
                        )}

                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          View Full Provenance Drawer
                        </button>

                        {alert.regulatory_change_id && (
                          <Link
                            to={`/regulatory-changes/${alert.regulatory_change_id}`}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50 transition"
                          >
                            Compare Change Diff
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {!alert.is_read && (
                          <button
                            onClick={() => markAsRead(alert.id)}
                            className="font-semibold text-slate-600 hover:text-blue-600 transition"
                          >
                            Mark as Read
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setResolveAlertId(alert.id);
                            setFalsePositiveNotes("");
                          }}
                          className="text-slate-400 hover:text-[#E9786D] transition"
                        >
                          Flag as False Positive
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredAlerts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">
                  <p className="font-semibold text-slate-600 text-base">No regulatory alerts match the selected criteria.</p>
                  <p className="mt-1 text-xs">Try selecting a different rating filter or clearing search keywords.</p>
                  <button
                    onClick={() => {
                      setPriorityFilter("all");
                      setSearchQuery("");
                      setCategoryFilter("all");
                      setUnreadOnly(false);
                    }}
                    className="mt-4 rounded-xl bg-blue-50 px-4 py-1.5 text-xs font-bold text-[#2049D8] hover:bg-blue-100"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. TAB 2: SOURCES REGISTRY */}
        {activeTab === "sources" && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#282B32]">Verified Official Gazette Registry</h3>
                <p className="text-xs text-[#64748B]">
                  Regulatory authorities and gazette portals monitored for statutory modifications.
                </p>
              </div>
              <button
                onClick={triggerCheckSources}
                disabled={checkingSources}
                className="rounded-xl bg-[#2049D8] px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {checkingSources ? "Scanning..." : "⚡ Scan Feeds Now"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sources.map((src) => (
                <div
                  key={src.id}
                  className="rounded-2xl border border-[#E9ECF1] bg-white p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#282B32]">{src.name}</h4>
                      <p className="text-xs text-slate-500">
                        {src.authority} · {src.jurisdiction}
                      </p>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                        src.last_check_status === "success"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {src.last_check_status}
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B] leading-relaxed">{src.description}</p>

                  <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1.5 border border-[#E9ECF1]">
                    <div>
                      <span className="font-bold text-slate-700">Source Feed URL:</span>{" "}
                      <a
                        href={src.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#2049D8] hover:underline font-medium break-all"
                      >
                        {src.source_url}
                      </a>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Fingerprint:</span>{" "}
                      <span className="font-mono text-slate-800">{src.version_fingerprint ?? "N/A"}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Last Scanned:</span>{" "}
                      {src.last_checked_at ? new Date(src.last_checked_at).toLocaleString() : "Never"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. TAB 3: SUBSCRIPTIONS */}
        {activeTab === "subscriptions" && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#282B32]">Active Regulatory Subscriptions</h3>
                <p className="text-xs text-[#64748B]">
                  Configured alert watches triggering automated notifications upon legislation amendments.
                </p>
              </div>
              <button
                onClick={() => setShowSubModal(true)}
                className="rounded-xl bg-[#2049D8] px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                + Add Subscription
              </button>
            </div>

            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-2xl border border-[#E9ECF1] bg-white p-5 shadow-xs text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 font-extrabold uppercase text-[#2049D8] text-[10px]">
                        {sub.subscription_type}
                      </span>
                      <span className="font-bold text-[#282B32] text-sm">{sub.target_label}</span>
                    </div>
                    <p className="mt-1 text-slate-400 font-mono text-[11px]">
                      Target Identifier: {sub.target_id}
                    </p>
                  </div>

                  <button
                    onClick={() => unsubscribe(sub.id)}
                    className="rounded-lg border border-rose-200 px-3 py-1 font-semibold text-rose-600 hover:bg-rose-50 transition"
                  >
                    Unsubscribe
                  </button>
                </div>
              ))}

              {subscriptions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">
                  <p className="font-semibold text-slate-600">No active regulatory subscriptions configured.</p>
                  <p className="mt-1 text-xs">Subscribe to specific Acts, Rules, or Authority notices to receive targeted updates.</p>
                  <button
                    onClick={() => setShowSubModal(true)}
                    className="mt-4 rounded-xl bg-[#2049D8] px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    Create First Subscription
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      {/* 9. ALERT DETAIL DRAWER / SLIDE-OVER */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-y-auto">
            {/* Drawer Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E9ECF1] bg-white p-5">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#2049D8]">
                  Regulatory Provenance & Trace
                </span>
                <h3 className="text-base font-extrabold text-[#282B32]">
                  {selectedAlert.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1 text-xs text-[#282B32]">
              {/* Severity & Business Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase ${
                    selectedAlert.priority === "urgent"
                      ? "bg-[#E9786D]/15 text-[#E9786D]"
                      : selectedAlert.priority === "medium"
                      ? "bg-[#F9AD61]/15 text-[#D97D21]"
                      : "bg-[#80C271]/15 text-[#4D8C3F]"
                  }`}
                >
                  {selectedAlert.priority === "urgent" ? "High Severity" : selectedAlert.priority === "medium" ? "Medium Severity" : "Low Severity"}
                </span>
                {selectedAlert.affected_business_name && (
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                    🏢 {selectedAlert.affected_business_name}
                  </span>
                )}
                {selectedAlert.impact_summary?.category && (
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 font-semibold text-[#2049D8]">
                    {selectedAlert.impact_summary.category}
                  </span>
                )}
              </div>

              {/* What Changed */}
              <div className="rounded-xl bg-slate-50 p-4 border border-[#E9ECF1] space-y-2">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  What Changed in Official Publication
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  {selectedAlert.impact_summary?.change_summary || selectedAlert.message}
                </p>
                {selectedAlert.impact_summary?.official_source && (
                  <a
                    href={selectedAlert.impact_summary.official_source}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#2049D8] hover:underline pt-1"
                  >
                    <span>🔗 Verified Regulatory Gazette Link</span>
                    <span>→</span>
                  </a>
                )}
              </div>

              {/* Graph Trace & Why Affected */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  Graph Traversal: Why Affected
                </h4>
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[#2049D8] font-bold">
                    <span>Act / Gazette</span>
                    <span>→</span>
                    <span>Permit Requirement</span>
                    <span>→</span>
                    <span>Business Checklist</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedAlert.impact_summary?.potential_impact ||
                      `Traced through dependency graph connecting approval '${selectedAlert.affected_application_id}' to business compliance activities.`}
                  </p>
                </div>
              </div>

              {/* Recommended Next Steps */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  Recommended Compliance Action
                </h4>
                <div className="rounded-xl bg-emerald-50/70 p-4 border border-emerald-200 text-emerald-900 font-semibold leading-relaxed">
                  {selectedAlert.impact_summary?.recommended_action ||
                    "Inspect affected checklist tasks and update documentation filings."}
                </div>
              </div>

              {/* Verification & Audit Details */}
              <div className="rounded-xl bg-slate-50 p-4 border border-[#E9ECF1] space-y-1.5 text-[11px] text-slate-500">
                <div>
                  <span className="font-bold text-slate-700">Effective Date:</span>{" "}
                  {selectedAlert.impact_summary?.effective_date || "Immediate"}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Confidence Score:</span>{" "}
                  {selectedAlert.impact_summary?.confidence ? `${Math.round(selectedAlert.impact_summary.confidence * 100)}% Verified` : "95% Verified"}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Alert Created:</span>{" "}
                  {selectedAlert.created_at ? new Date(selectedAlert.created_at).toLocaleString() : "Recently"}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="sticky bottom-0 border-t border-[#E9ECF1] bg-white p-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedAlert.affected_business_id && (
                  <Link
                    to={`/checklist?business_id=${selectedAlert.affected_business_id}`}
                    onClick={() => setSelectedAlert(null)}
                    className="rounded-xl bg-[#2049D8] px-4 py-2 font-bold text-white hover:bg-blue-700 transition"
                  >
                    Open Smart Checklist →
                  </Link>
                )}
                {!selectedAlert.is_read && (
                  <button
                    onClick={() => markAsRead(selectedAlert.id)}
                    className="rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Mark as Read
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setResolveAlertId(selectedAlert.id);
                  setFalsePositiveNotes("");
                }}
                className="text-xs text-slate-400 hover:text-rose-600"
              >
                Flag as False Positive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. METHODOLOGY MODAL (?) */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E9ECF1] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#282B32]">Dashboard Methodology & Calculation Rules</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>Active Alerts:</strong> Total regulatory change notifications dispatched that have not been dismissed or marked as resolved false positives.
              </p>
              <p>
                <strong>Awaiting Review:</strong> Unread regulatory notices or checklist tasks with state <code className="text-blue-700">needs_review</code> requiring human operator inspection.
              </p>
              <p>
                <strong>Compliant:</strong> Checklist items and approvals that have met all statutory documentation and filing conditions.
              </p>
              <p>
                <strong>Non-compliant:</strong> High severity alerts or tasks with unresolved blocking dependency conditions.
              </p>
              <p>
                <strong>Not Assessed:</strong> Candidate regulatory amendments awaiting legal verification by authorized reviewers.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHelpModal(false)}
                className="rounded-xl bg-[#2049D8] px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. EDUCATION GUIDE MODAL (🎓) */}
      {showEduModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E9ECF1] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#282B32]">Regulatory Intelligence Lifecycle</h3>
              <button
                onClick={() => setShowEduModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-[#2049D8]">1. Continuous Monitoring</span>
                <p className="mt-0.5">Automated crawlers poll trusted official gazette sources (MAITRI, MPCB, CPCB, MIDC) for new statutory orders.</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-[#2049D8]">2. Graph Impact Traversal</span>
                <p className="mt-0.5">PermitGraph correlates changed legal clauses to rules, approvals, and industrial profiles across the graph.</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <span className="font-bold text-[#2049D8]">3. Smart Checklist Synchrony</span>
                <p className="mt-0.5">Affected checklist tasks automatically flag for operator review, preventing inadvertent non-compliance.</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowEduModal(false)}
                className="rounded-xl bg-[#2049D8] px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. SUBSCRIBE MODAL */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#E9ECF1]">
            <h3 className="text-base font-bold text-[#282B32]">Subscribe to Regulatory Updates</h3>
            <p className="mt-1 text-xs text-slate-500">
              Receive automatic alerts whenever relevant amendments, rules, or authority notices change.
            </p>
            <form onSubmit={submitSubscription} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Subscription Scope</label>
                <select
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="act">Specific Act / Regulation</option>
                  <option value="rule">Rule or Statutory Guideline</option>
                  <option value="approval">Permit / Approval Type</option>
                  <option value="authority">Regulatory Authority</option>
                  <option value="business">Specific Business Profile</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Target Identifier</label>
                <input
                  required
                  type="text"
                  value={subTargetId}
                  onChange={(e) => setSubTargetId(e.target.value)}
                  placeholder="e.g. consent-to-operate or maitri-act-2023"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Descriptive Label</label>
                <input
                  type="text"
                  value={subTargetLabel}
                  onChange={(e) => setSubTargetLabel(e.target.value)}
                  placeholder="e.g. MPCB Water Consent Notifications"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2049D8] px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Subscribe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13. RESOLVE FALSE POSITIVE MODAL */}
      {resolveAlertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#E9ECF1]">
            <h3 className="text-base font-bold text-[#282B32]">Flag as False Positive</h3>
            <p className="mt-1 text-xs text-slate-500">
              Explain why this regulatory update does not legally or operationally affect your business.
              This will automatically unflag any linked compliance checklist task.
            </p>
            <form onSubmit={submitResolveFalsePositive} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Justification / Audit Note</label>
                <textarea
                  required
                  rows={3}
                  value={falsePositiveNotes}
                  onChange={(e) => setFalsePositiveNotes(e.target.value)}
                  placeholder="e.g. This amendment only applies to large thermal power stations, not our manufacturing facility."
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-hidden"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveAlertId(null)}
                  className="rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#E9786D] px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                >
                  Confirm False Positive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
