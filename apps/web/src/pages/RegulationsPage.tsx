import { Link } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { RegulationSummary } from "../lib/types";
import { ErrorNotice, Loading } from "../components/Loading";

export default function RegulationsPage() {
  const { data, loading, error } = useFetch<RegulationSummary[]>("/api/v1/regulations");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Regulations</h1>
        <p className="mt-1 text-sm text-slate-600">Source Acts transcribed into PermitGraph, section by section.</p>
      </div>
      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((r) => (
          <Link key={r.id} to={`/regulations/${r.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-400">
            <p className="font-semibold text-slate-800">{r.name}</p>
            <p className="mt-1 text-xs text-slate-500">{r.short_code} · {r.jurisdiction}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
