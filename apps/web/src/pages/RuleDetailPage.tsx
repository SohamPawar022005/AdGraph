import { useParams } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";

interface RuleVersionDetail {
  id: string;
  version: string;
  status: string;
  verification_status: string;
  verified_by?: string | null;
  verified_at?: string | null;
  confidence: number;
  source_document_id: string;
  source_section: string;
  source_url?: string | null;
  notes?: string | null;
  rule_body: Record<string, unknown>;
}

interface RuleDetail {
  id: string;
  name: string;
  jurisdiction: string;
  versions: RuleVersionDetail[];
}

export default function RuleDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch<RuleDetail>(id ? `/api/v1/rules/${id}` : null);

  if (loading) return <Loading />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{data.id}</h1>
        <p className="mt-1 text-sm text-slate-600">{data.name}</p>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Version history</h2>
      <div className="space-y-3">
        {[...data.versions].reverse().map((v) => (
          <div key={v.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-700">{v.version}</p>
              <div className="flex gap-2">
                <Badge>{v.status}</Badge>
                <Badge>{v.verification_status}</Badge>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Source: {v.source_document_id} · {v.source_section} · confidence {v.confidence.toFixed(2)}
              {v.source_url && (
                <>
                  {" "}· <a href={v.source_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">view source</a>
                </>
              )}
            </p>
            {v.verified_by && (
              <p className="mt-1 text-xs text-slate-500">Verified by {v.verified_by} at {v.verified_at}</p>
            )}
            {v.notes && <p className="mt-1 text-xs italic text-slate-500">{v.notes}</p>}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-brand-600">View rule body (JSON)</summary>
              <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                {JSON.stringify(v.rule_body, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
