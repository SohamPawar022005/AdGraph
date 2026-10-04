import { Link } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { Approval } from "../lib/types";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";

export default function ApprovalsPage() {
  const { data, loading, error } = useFetch<Approval[]>("/api/v1/approvals");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Approval Catalogue</h1>
          <p className="mt-1 text-sm text-slate-600">
            Process-level approvals established by the real Acts, plus illustrative
            synthetic licence/consent nodes (clearly flagged) used to demo the full
            dependency graph.
          </p>
        </div>
        <Link to="/approvals-graph" className="text-sm text-brand-600 hover:underline">View full graph →</Link>
      </div>

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((a) => (
          <Link key={a.id} to={`/approvals/${a.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-400">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-800">{a.name}</p>
              <Badge>{a.is_synthetic ? "SYNTHETIC" : a.verification_status}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">{a.id} · {a.category}</p>
            {a.applicable_industries && (
              <p className="mt-1 text-xs text-slate-400">
                Applies to: {a.applicable_industries.slice(0, 3).join(", ")}
                {a.applicable_industries.length > 3 ? "…" : ""}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
