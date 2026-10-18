import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { RegulatoryAlert, RegulatorySource, RegulatorySubscription } from "../lib/types";
import { ErrorNotice, Loading } from "../components/Loading";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

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

  useEffect(() => {
    loadData();
  }, []);


  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [alertsRes, sourcesRes, subsRes] = await Promise.all([
        api.get<Page<RegulatoryAlert>>("/api/v1/alerts?limit=100"),
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

  async function markAsRead(alertId: string) {
    try {
      await api.patch(`/api/v1/alerts/${alertId}/read`, {});
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: true, read_at: new Date().toISOString() } : a))
      );
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
      loadData();
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

  const unreadAlerts = alerts.filter((a) => !a.is_read);

  const filteredAlerts = alerts.filter((a) => {
    if (priorityFilter !== "all" && a.priority !== priorityFilter) return false;
    if (unreadOnly && a.is_read) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Regulatory Alerts & Source Monitoring</h1>
            {unreadAlerts.length > 0 && (
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                {unreadAlerts.length} New
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Automated monitoring of official legislation gazettes, regulatory amendments, and graph-traced business impact.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerCheckSources}
            disabled={checkingSources}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {checkingSources ? "Checking Feeds..." : "⚡ Check Official Feeds Now"}
          </button>
          <button
            onClick={() => setShowSubModal(true)}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            + New Subscription
          </button>
        </div>
      </div>

      {checkResult && (
        <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
          ✓ {checkResult}
        </div>
      )}

      {error && <ErrorNotice message={error} />}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSearchParams({ tab: "alerts" })}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === "alerts"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Regulatory Alerts Stream</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
            {alerts.length}
          </span>
        </button>

        <button
          onClick={() => setSearchParams({ tab: "sources" })}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === "sources"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Official Sources & Registry</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
            {sources.length}
          </span>
        </button>

        <button
          onClick={() => setSearchParams({ tab: "subscriptions" })}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === "subscriptions"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Subscriptions</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
            {subscriptions.length}
          </span>
        </button>
      </div>

      {loading && <Loading label="Loading regulatory intelligence..." />}

      {/* Tab 1: Alerts Stream */}
      {activeTab === "alerts" && !loading && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Priority:</span>
              {["all", "urgent", "medium", "informational"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                    priorityFilter === p
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="rounded border-slate-300"
              />
              Show Unread Only
            </label>
          </div>

          {/* Alerts List */}
          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border bg-white p-5 shadow-sm transition ${
                  !alert.is_read
                    ? "border-l-4 border-l-brand-600 border-slate-200 bg-brand-50/10"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          alert.priority === "urgent"
                            ? "bg-rose-100 text-rose-800"
                            : alert.priority === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {alert.priority}
                      </span>
                      {alert.affected_business_name && (
                        <span className="text-xs font-semibold text-slate-700">
                          🏢 {alert.affected_business_name}
                        </span>
                      )}
                      {!alert.is_read && (
                        <span className="inline-block h-2 w-2 rounded-full bg-brand-600" />
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{alert.title}</h3>
                  </div>

                  <span className="text-xs text-slate-400">
                    {alert.created_at ? new Date(alert.created_at).toLocaleString() : ""}
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">{alert.message}</p>

                {/* Structured Impact Breakdown */}
                {alert.impact_summary && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <span className="font-semibold text-slate-700">Official Regulation:</span>{" "}
                        <span className="text-slate-900">{alert.impact_summary.regulation_title}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Effective Date:</span>{" "}
                        <span className="text-slate-900">{alert.impact_summary.effective_date}</span>
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-700">Detected Modification:</span>{" "}
                      <span className="text-slate-800">{alert.impact_summary.change_summary}</span>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-700">Recommended Action:</span>{" "}
                      <span className="text-brand-900 font-medium">
                        {alert.impact_summary.recommended_action}
                      </span>
                    </div>

                    {alert.impact_summary.official_source && (
                      <div className="pt-1">
                        <a
                          href={alert.impact_summary.official_source}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-brand-600 hover:underline"
                        >
                          🔗 View Official Publication Gazette →
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Bar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    {alert.affected_business_id && (
                      <Link
                        to={`/checklist?business_id=${alert.affected_business_id}`}
                        className="rounded-md bg-brand-50 px-3 py-1 font-semibold text-brand-700 border border-brand-200 hover:bg-brand-100"
                      >
                        Inspect Affected Checklist →
                      </Link>
                    )}

                    <Link
                      to={`/regulatory-changes/${alert.regulatory_change_id}`}
                      className="rounded-md border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50"
                    >
                      Compare Change Diff
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    {!alert.is_read && (
                      <button
                        onClick={() => markAsRead(alert.id)}
                        className="text-slate-500 hover:text-slate-800"
                      >
                        Mark as Read
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setResolveAlertId(alert.id);
                        setFalsePositiveNotes("");
                      }}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      Flag as False Positive
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredAlerts.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
                No alerts match the selected priority filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Sources Registry */}
      {activeTab === "sources" && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {sources.map((src) => (
              <div key={src.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{src.name}</h3>
                    <p className="text-xs text-slate-500">{src.authority} · {src.jurisdiction}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      src.last_check_status === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {src.last_check_status}
                  </span>
                </div>

                <p className="text-xs text-slate-600">{src.description}</p>

                <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-500 space-y-1 border border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-600">Feed URL:</span>{" "}
                    <a href={src.source_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                      {src.source_url}
                    </a>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Version Fingerprint:</span>{" "}
                    <span className="font-mono">{src.version_fingerprint ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Last Checked:</span>{" "}
                    {src.last_checked_at ? new Date(src.last_checked_at).toLocaleString() : "Never"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Subscriptions */}
      {activeTab === "subscriptions" && !loading && (
        <div className="space-y-4">
          <div className="space-y-2">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-bold uppercase text-slate-600">
                      {sub.subscription_type}
                    </span>
                    <span className="font-bold text-slate-900">{sub.target_label}</span>
                  </div>
                  <p className="mt-1 text-slate-400">Target ID: {sub.target_id}</p>
                </div>

                <button
                  onClick={() => unsubscribe(sub.id)}
                  className="rounded border border-rose-200 px-2.5 py-1 text-rose-600 hover:bg-rose-50"
                >
                  Unsubscribe
                </button>
              </div>
            ))}

            {subscriptions.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-400">No active subscriptions configured.</p>
            )}
          </div>
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Subscribe to Regulatory Updates</h3>
            <p className="mt-1 text-xs text-slate-500">
              Receive automatic alerts whenever relevant amendments, rules, or authority notices change.
            </p>
            <form onSubmit={submitSubscription} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Subscription Scope</label>
                <select
                  value={subType}
                  onChange={(e) => setSubType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
                >
                  <option value="act">Specific Act / Regulation</option>
                  <option value="rule">Rule or Statutory Guideline</option>
                  <option value="approval">Permit / Approval Type</option>
                  <option value="authority">Regulatory Authority</option>
                  <option value="business">Specific Business Profile</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Target Identifier</label>
                <input
                  required
                  type="text"
                  value={subTargetId}
                  onChange={(e) => setSubTargetId(e.target.value)}
                  placeholder="e.g. RULE-MAITRI-001 or maitri-act-2023"
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Descriptive Label</label>
                <input
                  type="text"
                  value={subTargetLabel}
                  onChange={(e) => setSubTargetLabel(e.target.value)}
                  placeholder="e.g. MAITRI Deemed Approvals & Timelines"
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Subscribe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve False Positive Modal */}
      {resolveAlertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Flag as False Positive</h3>
            <p className="mt-1 text-xs text-slate-500">
              Explain why this regulatory update does not legally or operationally affect your business.
              This will automatically unflag the linked compliance checklist item.
            </p>
            <form onSubmit={submitResolveFalsePositive} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Justification / Audit Note</label>
                <textarea
                  required
                  rows={3}
                  value={falsePositiveNotes}
                  onChange={(e) => setFalsePositiveNotes(e.target.value)}
                  placeholder="e.g. This amendment only applies to large thermal power stations, not our manufacturing facility."
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveAlertId(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
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
