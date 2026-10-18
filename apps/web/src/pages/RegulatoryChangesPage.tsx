import { useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { RegulatoryChange, SourceDocument } from "../lib/types";
import { api } from "../lib/api";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";

export default function RegulatoryChangesPage() {
  const { data, loading, error, reload } = useFetch<RegulatoryChange[]>("/api/v1/regulatory-changes");
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const changes = data ?? [];

  const filtered = changes.filter((c) => {
    if (filterType !== "all" && c.change_type.toLowerCase() !== filterType.toLowerCase()) return false;
    if (filterTier === "real" && c.is_synthetic) return false;
    if (filterTier === "synthetic" && !c.is_synthetic) return false;
    if (filterStatus !== "all" && c.verification_status !== filterStatus) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => (a.detected_at < b.detected_at ? 1 : -1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Regulatory Change Intelligence</h1>
          <p className="mt-1 text-sm text-slate-600">
            Compare regulatory versions, detect clause additions, renumberings, and threshold modifications, and trace approval impacts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/compare"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs flex items-center gap-1.5"
          >
            <span>📄</span>
            <span>Side-by-Side Visual Compare</span>
          </Link>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {showForm ? "Cancel" : "+ Compare Stored Documents"}
          </button>
        </div>
      </div>

      {showForm && <CompareModal onDone={() => { setShowForm(false); reload(); }} />}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs">
        <div>
          <span className="font-semibold text-slate-500 mr-1.5">Change Type:</span>
          <select
            className="rounded border border-slate-300 px-2 py-1"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="deadline_change">Deadline Change</option>
            <option value="threshold_change">Threshold Change</option>
            <option value="authority_change">Authority Change</option>
            <option value="document_requirement_change">Document Requirement</option>
            <option value="applicability_change">Applicability Change</option>
            <option value="definition_change">Definition Change</option>
            <option value="renumbered">Renumbered</option>
            <option value="moved">Moved</option>
            <option value="uncertain">Uncertain Match</option>
            <option value="addition">Addition</option>
            <option value="deletion">Deletion</option>
            <option value="modification">Modification</option>
          </select>
        </div>

        <div>
          <span className="font-semibold text-slate-500 mr-1.5">Data Tier:</span>
          <select
            className="rounded border border-slate-300 px-2 py-1"
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
          >
            <option value="all">All Tiers</option>
            <option value="real">Real Regulations</option>
            <option value="synthetic">Synthetic / Test Scenarios</option>
          </select>
        </div>

        <div>
          <span className="font-semibold text-slate-500 mr-1.5">Verification:</span>
          <select
            className="rounded border border-slate-300 px-2 py-1"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="CANDIDATE">CANDIDATE (Unreviewed)</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div className="ml-auto text-slate-500 font-medium">
          Showing {sorted.length} of {changes.length} change(s)
        </div>
      </div>

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}

      <div className="space-y-2">
        {sorted.map((c) => (
          <Link
            key={c.id}
            to={`/regulatory-changes/${c.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-400 transition-colors shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{c.section_label}</p>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {c.change_type.replace(/_/g, " ")}
                </span>
                {c.is_uncertain && (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    UNCERTAIN MATCH
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {c.is_synthetic && <Badge>SYNTHETIC</Badge>}
                <Badge tone={c.verification_status === "VERIFIED" ? "verified" : "candidate"}>
                  {c.verification_status}
                </Badge>
              </div>
            </div>

            <p className="mt-1.5 text-sm text-slate-600">{c.summary}</p>

            <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-400">
              <span>Confidence: {(c.confidence * 100).toFixed(0)}%</span>
              {c.affected_rule_ids.length > 0 && (
                <span>Affects {c.affected_rule_ids.length} rule(s)</span>
              )}
              {c.affected_approval_ids.length > 0 && (
                <span>Affects {c.affected_approval_ids.length} approval(s)</span>
              )}
              <span className="ml-auto text-slate-400">{new Date(c.detected_at).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}

        {sorted.length === 0 && !loading && (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            No regulatory changes match your selected filters.
          </p>
        )}
      </div>
    </div>
  );
}

function CompareModal({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"documents" | "manual">("documents");
  const { data: sourceDocs } = useFetch<SourceDocument[]>("/api/v1/regulations/source-documents/list");

  const [oldDocId, setOldDocId] = useState("");
  const [newDocId, setNewDocId] = useState("");

  const [sectionLabel, setSectionLabel] = useState("Section 16");
  const [oldText, setOldText] = useState("");
  const [newText, setNewText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitDocuments(e: React.FormEvent) {
    e.preventDefault();
    if (!oldDocId || !newDocId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/v1/regulations/compare-source-documents", {
        old_document_id: oldDocId,
        new_document_id: newDocId,
        is_synthetic: false,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document comparison failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/v1/regulatory-changes/analyze", {
        old_sections: { [sectionLabel]: oldText },
        new_sections: { [sectionLabel]: newText },
        is_synthetic: false,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-brand-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900">Run Regulatory Change Detection</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("documents")}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              mode === "documents" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Compare Two Ingested Documents
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              mode === "manual" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Manual Clause Snippets
          </button>
        </div>
      </div>

      {mode === "documents" ? (
        <form onSubmit={submitDocuments} className="space-y-4">
          <p className="text-xs text-slate-600">
            Select an authoritative base document and an amendment/new version to align clauses, detect moved provisions, and trace impact.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">Base / Previous Version</label>
              <select
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                value={oldDocId}
                onChange={(e) => setOldDocId(e.target.value)}
              >
                <option value="">Select base document…</option>
                {sourceDocs?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.version_label})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">New / Amended Version</label>
              <select
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                value={newDocId}
                onChange={(e) => setNewDocId(e.target.value)}
              >
                <option value="">Select amended document…</option>
                {sourceDocs?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.version_label})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <ErrorNotice message={error} />}
          <button
            type="submit"
            disabled={submitting || !oldDocId || !newDocId}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Analyzing Differences…" : "Compare Documents & Trace Impacts"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitManual} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Section label</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              value={sectionLabel}
              onChange={(e) => setSectionLabel(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Old Clause Text</label>
              <textarea
                required
                rows={4}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                value={oldText}
                onChange={(e) => setOldText(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">New Clause Text</label>
              <textarea
                required
                rows={4}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
            </div>
          </div>
          {error && <ErrorNotice message={error} />}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Analyzing…" : "Run Clause Comparison"}
          </button>
        </form>
      )}
    </div>
  );
}
