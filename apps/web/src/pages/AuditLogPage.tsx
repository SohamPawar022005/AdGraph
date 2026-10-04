import { useState } from "react";
import { useFetch } from "../lib/useFetch";
import type { AuditEvent } from "../lib/types";
import { ErrorNotice, Loading } from "../components/Loading";

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState("");
  const qs = entityType ? `?entity_type=${entityType}&limit=100` : "?limit=100";
  const { data, loading, error } = useFetch<AuditEvent[]>(`/api/v1/audit-events${qs}`, [entityType]);

  const entityTypes = ["", "rule_version", "approval", "regulatory_change", "application",
    "business_profile", "document"];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every rule edit, verification decision, document upload, workflow transition, and
          change-detection run is recorded here — this is the system's single source of truth
          for "what happened and who did it".
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {entityTypes.map((t) => (
          <button key={t || "all"} onClick={() => setEntityType(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${entityType === t ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>
            {t || "all"}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}

      <div className="space-y-2">
        {data?.map((e) => (
          <div key={e.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">{e.event_type}</span>
              <span className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {e.entity_type} · {e.entity_id} · actor: {e.actor}
              {e.reason ? ` · reason: ${e.reason}` : ""}
            </p>
          </div>
        ))}
        {data && data.length === 0 && <p className="text-sm text-slate-400">No events found.</p>}
      </div>
    </div>
  );
}
