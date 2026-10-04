import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import { api } from "../lib/api";
import Badge from "../components/Badge";
import Disclaimer from "../components/Disclaimer";
import { ErrorNotice, Loading } from "../components/Loading";

interface SlaSnapshot {
  state: string;
  started_at?: string;
  deadline?: string;
  elapsed_days?: number;
  remaining_days?: number;
  is_breached?: boolean;
  limit_days?: number;
  is_synthetic?: boolean;
  source_note?: string;
}

interface WorkflowEventRow {
  event_type: string;
  from_state: string | null;
  to_state: string | null;
  occurred_at: string;
  actor: string | null;
}

interface ApplicationDetail {
  id: string;
  business_profile_id: string;
  approval_id: string;
  state: string;
  is_synthetic: boolean;
  sla: SlaSnapshot;
  events: WorkflowEventRow[];
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  submitted: ["under_review", "withdrawn"],
  under_review: ["query_raised", "inspection_scheduled", "approved", "rejected", "escalated", "withdrawn"],
  query_raised: ["query_responded", "withdrawn"],
  query_responded: ["under_review", "inspection_scheduled", "approved", "rejected"],
  inspection_scheduled: ["inspection_completed", "withdrawn"],
  inspection_completed: ["under_review", "approved", "rejected"],
  escalated: ["approved", "rejected", "under_review"],
  approved: [],
  rejected: [],
  withdrawn: [],
};

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch<ApplicationDetail>(id ? `/api/v1/applications/${id}` : null);
  const [transitioning, setTransitioning] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return null;

  async function transition(target: string) {
    setTransitioning(true);
    setTxError(null);
    try {
      await api.post(`/api/v1/applications/${id}/transition`, { target_state: target });
      reload();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Transition failed");
    } finally {
      setTransitioning(false);
    }
  }

  const options = ALLOWED_TRANSITIONS[data.state] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{data.approval_id}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Application {data.id} · <Link to={`/businesses/${data.business_profile_id}`} className="text-brand-600 hover:underline">business profile</Link>
          </p>
        </div>
        <Badge>{data.state}</Badge>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">SLA clock</h2>
        {data.sla.state === "not_started" ? (
          <p className="text-sm text-slate-400">No SLA started.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
            <div><p className="text-xs text-slate-400">State</p><Badge>{data.sla.state}</Badge></div>
            <div><p className="text-xs text-slate-400">Elapsed</p><p className="font-medium">{data.sla.elapsed_days?.toFixed(1)} days</p></div>
            <div><p className="text-xs text-slate-400">Remaining</p><p className="font-medium">{data.sla.remaining_days?.toFixed(1)} days</p></div>
            <div><p className="text-xs text-slate-400">Limit</p><p className="font-medium">{data.sla.limit_days} days</p></div>
          </div>
        )}
        {data.sla.source_note && <Disclaimer text={data.sla.source_note} />}
      </div>

      {options.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Transition</h2>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <button key={o} disabled={transitioning} onClick={() => transition(o)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:border-brand-400 disabled:opacity-50">
                → {o}
              </button>
            ))}
          </div>
          {txError && <div className="mt-2"><ErrorNotice message={txError} /></div>}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Workflow timeline</h2>
        <div className="space-y-2">
          {data.events.map((e, i) => (
            <div key={i} className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="text-xs text-slate-400">{new Date(e.occurred_at).toLocaleString()}</span>
              <span>{e.from_state ? `${e.from_state} → ${e.to_state}` : `started at ${e.to_state}`}</span>
              <span className="ml-auto text-xs text-slate-400">{e.actor}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
