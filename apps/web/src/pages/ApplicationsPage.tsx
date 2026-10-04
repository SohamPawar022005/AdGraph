import { useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { Application } from "../lib/types";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";

interface Page<T> { total: number; items: T[]; }

const STATES = ["all", "submitted", "under_review", "query_raised", "query_responded",
  "inspection_scheduled", "inspection_completed", "approved", "rejected", "escalated", "withdrawn"];

export default function ApplicationsPage() {
  const [page, setPage] = useState(0);
  const [state, setState] = useState("all");
  const pageSize = 25;
  const qs = `limit=${pageSize}&offset=${page * pageSize}${state !== "all" ? `&state=${state}` : ""}`;
  const { data, loading, error } = useFetch<Page<Application>>(`/api/v1/applications?${qs}`, [page, state]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Applications</h1>
        <p className="mt-1 text-sm text-slate-600">
          {data ? `${data.total.toLocaleString()} applications tracked through the workflow engine's state machine.` : "Loading…"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATES.map((s) => (
          <button key={s} onClick={() => { setState(s); setPage(0); }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${state === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>
            {s}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-3 py-2">Approval</th><th className="px-3 py-2">State</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-700">{a.approval_id}</td>
                <td className="px-3 py-2"><Badge>{a.state}</Badge></td>
                <td className="px-3 py-2"><Link to={`/applications/${a.id}`} className="text-brand-600 hover:underline">View →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30">← Previous</button>
          <span>Page {page + 1} of {Math.max(1, Math.ceil(data.total / pageSize))}</span>
          <button disabled={(page + 1) * pageSize >= data.total} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}
