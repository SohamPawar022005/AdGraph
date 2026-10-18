import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import type { BusinessProfile, ComplianceChecklist } from "../lib/types";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";


interface Page<T> {
  total: number;
  items: T[];
}

export default function ChecklistPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBizId = searchParams.get("business_id") || "";

  const { data: bizData } = useFetch<Page<BusinessProfile>>("/api/v1/businesses?limit=100");
  const [businessId, setBusinessId] = useState<string>(selectedBizId);
  const [checklist, setChecklist] = useState<ComplianceChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Manual Task modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualAuth, setManualAuth] = useState("");

  // Resolution modal state
  const [resolveTaskId, setResolveTaskId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    if (selectedBizId && selectedBizId !== businessId) {
      setBusinessId(selectedBizId);
    }
  }, [selectedBizId]);

  useEffect(() => {
    if (!businessId && bizData?.items?.length) {
      const firstId = bizData.items[0].id;
      setBusinessId(firstId);
      setSearchParams({ business_id: firstId });
    }
  }, [bizData, businessId]);

  useEffect(() => {
    if (businessId) {
      loadChecklist(businessId);
    }
  }, [businessId]);

  async function loadChecklist(bizId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Page<ComplianceChecklist>>(`/api/v1/checklists?business_profile_id=${bizId}&limit=1`);
      if (res.items && res.items.length > 0) {
        setChecklist(res.items[0]);
      } else {
        setChecklist(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compliance checklist");
    } finally {
      setLoading(false);
    }
  }

  async function generateChecklist() {
    if (!businessId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await api.post<ComplianceChecklist>("/api/v1/checklists/generate", {
        business_profile_id: businessId,
        project_name: "Primary Compliance Project",
      });
      setChecklist(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate checklist");
    } finally {
      setGenerating(false);
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    try {
      await api.patch(`/api/v1/checklists/tasks/${taskId}`, { status: newStatus });
      if (businessId) loadChecklist(businessId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function updateDocStatus(docId: string, newStatus: string) {
    try {
      await api.patch(`/api/v1/checklists/documents/${docId}`, { status: newStatus });
      if (businessId) loadChecklist(businessId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Document update failed");
    }
  }

  async function submitResolveReview(e: React.FormEvent) {
    e.preventDefault();
    if (!resolveTaskId) return;
    try {
      await api.post(`/api/v1/checklists/tasks/${resolveTaskId}/resolve-review`, {
        resolution_notes: resolutionNotes,
      });
      setResolveTaskId(null);
      setResolutionNotes("");
      if (businessId) loadChecklist(businessId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Resolution failed");
    }
  }

  async function submitManualTask(e: React.FormEvent) {
    e.preventDefault();
    if (!checklist) return;
    try {
      await api.post(`/api/v1/checklists/${checklist.id}/tasks`, {
        title: manualTitle,
        description: manualDesc,
        authority_name: manualAuth || "Internal Compliance",
        category: "Manual Requirement",
      });
      setShowManualModal(false);
      setManualTitle("");
      setManualDesc("");

      setManualAuth("");
      if (businessId) loadChecklist(businessId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add manual task");
    }
  }

  // Calculate statistics
  const tasks = checklist?.tasks || [];
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const blockedCount = tasks.filter((t) => t.status === "blocked").length;
  const needsReviewCount = tasks.filter((t) => t.status === "needs_review" || t.flagged_for_review).length;
  const progressPercent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const docs = checklist?.documents || [];
  const collectedDocsCount = docs.filter((d) => ["collected", "uploaded", "verified"].includes(d.status)).length;

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== "all") {
      if (statusFilter === "needs_review" && (t.status === "needs_review" || t.flagged_for_review)) return true;
      if (t.status !== statusFilter) return false;
    }
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  });

  const categories = Array.from(new Set(tasks.map((t) => t.category)));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Smart Compliance Checklist</h1>
          <p className="mt-1 text-sm text-slate-600">
            Automated, dependency-aware regulatory task list linked to your permit graph and source regulations.
          </p>
        </div>

        {/* Business Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Business:</label>
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none"
            value={businessId}
            onChange={(e) => {
              setBusinessId(e.target.value);
              setSearchParams({ business_id: e.target.value });
            }}
          >
            {bizData?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.industry})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorNotice message={error} />}

      {/* No checklist view */}
      {!loading && !checklist && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            📋
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-800">No Compliance Checklist Generated Yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Generate an automated checklist derived from PermitGraph&apos;s rule engine, including statutory SLA timelines, prerequisite dependencies, and mandatory document requirements.
          </p>
          <div className="mt-5">
            <button
              onClick={generateChecklist}
              disabled={generating || !businessId}
              className="inline-flex items-center rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {generating ? "Analyzing permissions & graph..." : "⚡ Generate Smart Checklist"}
            </button>
          </div>
        </div>
      )}

      {loading && <Loading label="Loading compliance checklist and graph dependencies..." />}

      {/* Checklist Content */}
      {checklist && (
        <div className="space-y-6">
          {/* Readiness Validation Engine Banner */}
          <div
            className={`rounded-xl border p-5 shadow-sm transition ${checklist.readiness_status === "ready_for_review"
              ? "border-emerald-300 bg-emerald-50/50"
              : checklist.readiness_status === "needs_verification"
                ? "border-amber-300 bg-amber-50/50"
                : "border-slate-200 bg-white"
              }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${checklist.readiness_status === "ready_for_review"
                    ? "bg-emerald-100 text-emerald-800"
                    : checklist.readiness_status === "needs_verification"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                    }`}
                >
                  {checklist.readiness_status === "ready_for_review" ? "✓" : "!"}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Application Readiness:</h2>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${checklist.readiness_status === "ready_for_review"
                        ? "bg-emerald-200/80 text-emerald-900"
                        : checklist.readiness_status === "needs_verification"
                          ? "bg-amber-200/80 text-amber-900"
                          : "bg-rose-200/80 text-rose-900"
                        }`}
                    >
                      {checklist.readiness_status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {checklist.readiness_status === "ready_for_review"
                      ? "All configured dependency sequences and mandatory documents are satisfied."
                      : checklist.readiness_status === "needs_verification"
                        ? "Recent regulatory modifications or uncertain requirements need user review."
                        : "One or more mandatory documents, prerequisites, or profile fields require completion."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={generateChecklist}
                  disabled={generating}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  {generating ? "Re-evaluating..." : "↻ Refresh Verification"}
                </button>
                <button
                  onClick={() => setShowManualModal(true)}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-brand-700"
                >
                  + Add Requirement
                </button>
              </div>
            </div>

            {/* Readiness Details Accordion / Highlights */}
            {checklist.readiness_summary && (
              <div className="mt-4 space-y-2 border-t border-slate-200/80 pt-3 text-xs">
                {checklist.readiness_summary.failed_checks?.map((fc, i) => (
                  <div key={i} className="rounded-md bg-rose-50/70 p-2.5 text-rose-900 border border-rose-200">
                    <p className="font-semibold text-rose-800">⚠️ {fc.title}:</p>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                      {fc.items?.map((it, j) => (
                        <li key={j}>{it.reason || JSON.stringify(it)}</li>
                      ))}
                    </ul>
                  </div>
                ))}

                {checklist.readiness_summary.verification_needed?.map((vn, i) => (
                  <div key={i} className="rounded-md bg-amber-50/70 p-2.5 text-amber-900 border border-amber-200">
                    <p className="font-semibold text-amber-800">🔍 {vn.title}:</p>
                    <p className="mt-0.5">{vn.reason}</p>
                    {vn.items && (
                      <ul className="mt-1 list-disc pl-4 space-y-0.5">
                        {vn.items.map((it, j) => (
                          <li key={j}>
                            {it.title}: {it.flag_reason || it.reason}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}

                <p className="text-[11px] text-slate-400 italic pt-1">
                  {checklist.readiness_summary.disclaimer}
                </p>
              </div>
            )}
          </div>

          {/* Metrics & Progress Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Overall Progress</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-900">{progressPercent}%</span>
                <span className="text-xs text-slate-500">
                  {completedCount}/{tasks.length} tasks
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-brand-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">In Progress / Blocked</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-blue-600">{inProgressCount}</span>
                <span className="text-xs text-slate-400">active</span>
                <span className="text-xl font-bold text-rose-600 ml-2">{blockedCount}</span>
                <span className="text-xs text-slate-400">blocked</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Regulatory Review Flags</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-amber-600">{needsReviewCount}</span>
                <span className="text-xs text-slate-400">flagged by alerts</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Mandatory Documents</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-emerald-600">
                  {collectedDocsCount}/{docs.length}
                </span>
                <span className="text-xs text-slate-400">collected</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filter Status:</span>
              {["all", "not_started", "in_progress", "blocked", "completed", "needs_review"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${statusFilter === s
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {categories.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Phase:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="all">All Phases</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Task List */}
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-xl border bg-white p-4 shadow-sm transition ${task.flagged_for_review
                  ? "border-amber-400 ring-1 ring-amber-300"
                  : task.status === "completed"
                    ? "border-emerald-200"
                    : task.status === "blocked"
                      ? "border-rose-200"
                      : "border-slate-200"
                  }`}
              >
                {/* Regulatory Change Alert Banner for this task */}
                {task.flagged_for_review && (
                  <div className="mb-3 flex flex-col gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-amber-800">
                        🔔 Regulatory Update Detected Affecting This Task:
                      </p>
                      <p className="mt-0.5">{task.flag_reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.flag_change_id && (
                        <Link
                          to={`/regulatory-changes/${task.flag_change_id}`}
                          className="rounded bg-white px-2.5 py-1 text-xs font-medium text-brand-700 border border-amber-300 hover:bg-amber-100"
                        >
                          View Change Diff →
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setResolveTaskId(task.id);
                          setResolutionNotes("");
                        }}
                        className="rounded bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
                      >
                        Resolve Review
                      </button>
                    </div>
                  </div>
                )}

                {/* Task Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {task.category}
                      </span>
                      {task.approval_id && (
                        <Link
                          to={`/approvals/${task.approval_id}`}
                          className="text-xs font-semibold text-brand-600 hover:underline"
                        >
                          {task.approval_id}
                        </Link>
                      )}
                      {task.is_manual && <Badge>Custom</Badge>}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{task.title}</h3>
                    <p className="text-xs text-slate-500">
                      Authority: <span className="font-medium text-slate-700">{task.authority_name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${task.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : task.status === "blocked"
                          ? "bg-rose-100 text-rose-800"
                          : task.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : task.status === "needs_review"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">{task.description}</p>

                {/* Blocking dependencies warning */}
                {task.status === "blocked" && task.blocking_reasons?.length > 0 && (
                  <div className="mt-3 rounded-md bg-rose-50 p-2.5 text-xs text-rose-800 border border-rose-200">
                    <p className="font-semibold">Blocked by Prerequisites in Dependency Graph:</p>
                    <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
                      {task.blocking_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Deadlines and SLA */}
                <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 sm:grid-cols-2">
                  <div>
                    <span className="font-semibold text-slate-700">Statutory SLA Deadline:</span>{" "}
                    {task.legal_deadline ? (
                      <span className="text-slate-900">
                        {new Date(task.legal_deadline).toLocaleDateString()}
                        {task.legal_deadline_note && ` (${task.legal_deadline_note})`}
                      </span>
                    ) : (
                      <span className="text-slate-400">No statutory fixed SLA configured</span>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Planned Due Date:</span>{" "}
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : "Not set"} (Reminder:{" "}
                    {task.reminder_days}d prior)
                  </div>
                </div>

                {/* Supporting Source & Rule Link */}
                {task.source_reference && (
                  <div className="mt-2 text-[11px] text-slate-500">
                    <span>Legal Source: </span>
                    <span className="font-medium text-slate-700">
                      {task.source_reference.document} {task.source_reference.section ?? ""}
                    </span>
                    {task.supporting_rule_id && (
                      <>
                        {" · "}
                        <Link to={`/rules/${task.supporting_rule_id}`} className="text-brand-600 hover:underline">
                          View Rule {task.supporting_rule_id} →
                        </Link>
                      </>
                    )}
                  </div>
                )}

                {/* Required Documents Section */}
                {task.documents && task.documents.length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Required Documents ({task.documents.length})
                    </h4>
                    <div className="space-y-1.5">
                      {task.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex flex-col gap-1 rounded border border-slate-200 bg-white p-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <span className="font-medium text-slate-800">{doc.name}</span>
                            <span
                              className={`ml-2 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${doc.is_mandatory ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"
                                }`}
                            >
                              {doc.is_mandatory ? "Mandatory" : "Optional"}
                            </span>
                            {doc.purpose && <p className="text-[11px] text-slate-400">{doc.purpose}</p>}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-medium capitalize ${["collected", "uploaded", "verified"].includes(doc.status)
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                                }`}
                            >
                              {doc.status}
                            </span>
                            {doc.status === "missing" ? (
                              <button
                                onClick={() => updateDocStatus(doc.id, "collected")}
                                className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
                              >
                                Mark Collected
                              </button>
                            ) : (
                              <button
                                onClick={() => updateDocStatus(doc.id, "missing")}
                                className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-200"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    {task.status !== "completed" ? (
                      <button
                        onClick={() => updateTaskStatus(task.id, "completed")}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                      >
                        ✓ Mark Completed
                      </button>
                    ) : (
                      <button
                        onClick={() => updateTaskStatus(task.id, "in_progress")}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Reopen Task
                      </button>
                    )}

                    {task.status === "not_started" && (
                      <button
                        onClick={() => updateTaskStatus(task.id, "in_progress")}
                        className="rounded-md border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Start Task
                      </button>
                    )}
                  </div>

                  {task.notes && (
                    <span className="text-[11px] text-slate-500 italic max-w-sm truncate">
                      Note: {task.notes}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                No compliance tasks match the selected filter.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Resolve Review Modal */}
      {resolveTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Resolve Regulatory Review Flag</h3>
            <p className="mt-1 text-xs text-slate-500">
              Document your review and explanation for how this compliance requirement aligns with the detected amendment.
            </p>
            <form onSubmit={submitResolveReview} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Resolution Explanation / Audit Note</label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Verified the amended filing format; plant configuration already adheres to the updated emission threshold."
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolveTaskId(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Save & Resolve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Task Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Add Custom Requirement</h3>
            <p className="mt-1 text-xs text-slate-500">
              Add a site-specific internal permit, municipal NOC, or board condition to this checklist.
            </p>
            <form onSubmit={submitManualTask} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Requirement Title</label>
                <input
                  required
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Local Gram Panchayat No Objection Certificate"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Approving Authority</label>
                <input
                  type="text"
                  value={manualAuth}
                  onChange={(e) => setManualAuth(e.target.value)}
                  placeholder="e.g. Gram Panchayat / MIDC Regional Office"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Explain requirement scope and reference details..."
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
