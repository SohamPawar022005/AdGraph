import { useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { RuleSummary } from "../lib/types";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";

const STATUS_FILTERS = ["all", "verified", "candidate", "deprecated", "superseded", "rejected"];

export default function RulesPage() {
  const { data, loading, error } = useFetch<RuleSummary[]>("/api/v1/rules");
  const [filter, setFilter] = useState("all");

  const filtered = (data ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Rules-as-Code</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every rule is machine-readable, versioned, and traceable to a source Act section.
        </p>
      </div>

      <div className="flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>
            {s}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Rule</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <Link to={`/rules/${r.id}`} className="font-medium text-brand-700 hover:underline">{r.id}</Link>
                  <p className="text-xs text-slate-500">{r.name}</p>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{r.source_document_id} · {r.source_section}</td>
                <td className="px-3 py-2"><Badge>{r.status}</Badge></td>
                <td className="px-3 py-2"><Badge>{r.verification_status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
