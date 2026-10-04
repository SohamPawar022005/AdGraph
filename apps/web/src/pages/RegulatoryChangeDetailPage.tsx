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

  if (loading) return <Loading />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{data.section_label}</h1>
          <p className="mt-1 text-sm text-slate-500">{data.change_type} · detected {new Date(data.detected_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          {data.is_synthetic && <Badge>SYNTHETIC</Badge>}
          <Badge>{data.verification_status}</Badge>
        </div>
      </div>

      <p className="text-sm text-slate-600">{data.summary}</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-rose-700">Old text</p>
          <p className="whitespace-pre-wrap text-sm text-rose-900">{data.old_text}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-emerald-700">New text</p>
          <p className="whitespace-pre-wrap text-sm text-emerald-900">{data.new_text}</p>
        </div>
      </div>

      {data.affected_rule_ids.length > 0 && (
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Affected rules</h2>
          <div className="flex flex-wrap gap-2">
            {data.affected_rule_ids.map((r) => (
              <Link key={r} to={`/rules/${r}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-brand-700 hover:underline">{r}</Link>
            ))}
          </div>
        </div>
      )}
      {data.affected_approval_ids.length > 0 && (
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Affected approvals</h2>
          <div className="flex flex-wrap gap-2">
            {data.affected_approval_ids.map((a) => (
              <Link key={a} to={`/approvals/${a}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-brand-700 hover:underline">{a}</Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Impact analysis</h2>
          <button onClick={runImpact} disabled={loadingImpact}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {loadingImpact ? "Computing…" : impact ? "Re-run" : "Run impact analysis"}
          </button>
        </div>
        {impactError && <ErrorNotice message={impactError} />}
        {impact && (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-brand-700">{impact.impact_score.toFixed(2)}</span>
              <span className="text-xs text-slate-500">bounded [0,1] prioritisation signal — not a legal risk score</span>
            </div>
            <p className="text-sm text-slate-600">{impact.explanation}</p>
            <Disclaimer text={impact.disclaimer} />
            <details>
              <summary className="cursor-pointer text-xs text-brand-600">Methodology</summary>
              <p className="mt-1 text-xs text-slate-500">{impact.methodology}</p>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
