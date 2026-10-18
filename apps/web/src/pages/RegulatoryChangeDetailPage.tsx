import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { ImpactAssessment, RegulatoryChange } from "../lib/types";
import { api } from "../lib/api";
import Badge from "../components/Badge";
import Disclaimer from "../components/Disclaimer";
import { ErrorNotice, Loading } from "../components/Loading";

export default function RegulatoryChangeDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch<RegulatoryChange>(id ? `/api/v1/regulatory-changes/${id}` : null);
  const [impact, setImpact] = useState<ImpactAssessment | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  async function runImpact() {
    setLoadingImpact(true);
    setImpactError(null);
    try {
      const res = await api.get<ImpactAssessment>(`/api/v1/impact/${id}`);
      setImpact(res);
    } catch (err) {
      setImpactError(err instanceof Error ? err.message : "Impact analysis failed");
    } finally {
      setLoadingImpact(false);
    }
  }

  function downloadJsonExport() {
    if (!id) return;
    window.open(`/api/v1/impact/${id}/export`, "_blank");
  }

  if (loading) return <Loading />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{data.section_label}</h1>
            <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {data.change_type.replace(/_/g, " ")}
            </span>
            {data.is_uncertain && (
              <span className="rounded bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                UNCERTAIN MATCH
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Detected: {new Date(data.detected_at).toLocaleString()} · Confidence: {(data.confidence * 100).toFixed(0)}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.is_synthetic && <Badge>SYNTHETIC</Badge>}
          <Badge tone={data.verification_status === "VERIFIED" ? "verified" : "candidate"}>
            {data.verification_status}
          </Badge>
          <button
            onClick={downloadJsonExport}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Uncertainty Notice */}
      {data.is_uncertain && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Review Required:</strong> This alignment has moderate textual similarity. A regulatory reviewer must verify whether this provision was amended or constitutes an entirely distinct legal requirement.
        </div>
      )}

      {/* Summary & Rationale */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Plain Language Explanation</h2>
        <p className="text-sm text-slate-800">{data.summary}</p>
        {data.matching_rationale && (
          <p className="text-xs italic text-slate-500">Alignment Rationale: {data.matching_rationale}</p>
        )}
      </div>

      {/* Side-by-side Clause Diff */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-rose-800">Previous Version Text</span>
            {data.source_references?.old_doc_id && (
              <span className="font-mono text-xs text-rose-600">{data.source_references.old_doc_id}</span>
            )}
          </div>
          <p className="whitespace-pre-wrap font-sans text-sm text-rose-950 leading-relaxed">
            {data.old_text || <span className="italic text-slate-400">None (New clause added)</span>}
          </p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-800">Amended Version Text</span>
            {data.source_references?.new_doc_id && (
              <span className="font-mono text-xs text-emerald-600">{data.source_references.new_doc_id}</span>
            )}
          </div>
          <p className="whitespace-pre-wrap font-sans text-sm text-emerald-950 leading-relaxed">
            {data.new_text || <span className="italic text-slate-400">None (Clause repealed/deleted)</span>}
          </p>
        </div>
      </div>

      {/* Linked Rules & Approvals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Connected Regulatory Rules ({data.affected_rule_ids.length})
          </h2>
          {data.affected_rule_ids.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.affected_rule_ids.map((r) => (
                <Link
                  key={r}
                  to={`/rules/${r}`}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 hover:underline"
                >
                  {r}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No existing rules linked to this section.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            Directly Affected Approvals ({data.affected_approval_ids.length})
          </h2>
          {data.affected_approval_ids.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.affected_approval_ids.map((a) => (
                <Link
                  key={a}
                  to={`/approvals/${a}`}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 hover:underline"
                >
                  {a}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No approvals directly mapped to this clause.</p>
          )}
        </div>
      </div>

      {/* Traceable Graph Impact Analysis */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Approval Dependency Impact</h2>
            <p className="text-xs text-slate-500">Traceable graph traversal following statutory dependencies.</p>
          </div>
          <button
            onClick={runImpact}
            disabled={loadingImpact}
            className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loadingImpact ? "Computing Graph Closure…" : impact ? "Re-evaluate Impact" : "Run Impact Analysis"}
          </button>
        </div>

        {impactError && <ErrorNotice message={impactError} />}

        {impact && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-3xl font-extrabold text-brand-700">{impact.impact_score.toFixed(2)}</span>
                <span className="ml-2 text-xs text-slate-500">Prioritisation Score (0 to 1)</span>
              </div>
              <div className="ml-auto flex gap-2">
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  Direct: {impact.directly_affected_approvals.length}
                </span>
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  Downstream: {impact.downstream_affected_approvals.length}
                </span>
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  Industries: {impact.affected_business_types.length}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">{impact.explanation}</p>

            {impact.has_uncertain_coverage && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                Notice: Graph coverage for this clause may be incomplete. Always check related Acts before making compliance decisions.
              </div>
            )}

            {/* Evidence Paths */}
            {impact.evidence_paths && impact.evidence_paths.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Graph Traversal Reasoning Paths ({impact.evidence_paths.length})
                </h3>
                <div className="max-h-60 space-y-1.5 overflow-auto">
                  {impact.evidence_paths.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.impact_type === "direct" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                        }`}>
                          {p.impact_type}
                        </span>
                        <span className="font-mono text-slate-700">{p.path.join(" → ")}</span>
                      </div>
                      <span className={`text-[10px] uppercase font-semibold ${
                        p.tier === "synthetic" ? "text-amber-600" : "text-emerald-700"
                      }`}>
                        [{p.tier}]
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Disclaimer text={impact.disclaimer} />

            <details className="pt-2">
              <summary className="cursor-pointer text-xs font-medium text-brand-600 hover:underline">
                Methodology & Audit Info
              </summary>
              <p className="mt-1 text-xs text-slate-500">{impact.methodology}</p>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
