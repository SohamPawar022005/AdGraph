import { useState } from "react";
import { useFetch } from "../lib/useFetch";
import { api } from "../lib/api";
import { useAuth, REVIEWER_ROLES } from "../context/AuthContext";
import Badge from "../components/Badge";
import Disclaimer from "../components/Disclaimer";
import { ErrorNotice, Loading } from "../components/Loading";

interface QueueItem {
  id: string;
  verification_status: string;
  source_document_id?: string | null;
  source_section?: string | null;
  confidence?: number | null;
  notes?: string | null;
}

const ENTITY_TYPES = ["rule_version", "approval", "approval_dependency", "regulatory_change"];

export default function ReviewQueuePage() {
  const { role } = useAuth();
  const [entityType, setEntityType] = useState("rule_version");
  const { data, loading, error, reload } = useFetch<QueueItem[]>(`/api/v1/review/queue/${entityType}`, [entityType]);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canReview = role && REVIEWER_ROLES.includes(role);

  async function act(itemId: string, action: "approve" | "reject") {
    setActingOn(itemId);
    setActionError(null);
    try {
      const reason = window.prompt(`Reason for ${action} (required for the audit trail):`, "") ?? "";
      await api.post(`/api/v1/review/${entityType}/${itemId}`, { action, reason });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Review action failed");
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Human Verification Review Queue</h1>
        <p className="mt-1 text-sm text-slate-600">
          CANDIDATE content (AI-extracted or AI-inferred) only becomes VERIFIED when a
          REGULATORY_REVIEWER or ADMIN explicitly approves it here. This is the single
          enforcement point in PermitGraph for that transition — see
          docs/architecture/human-verification.md.
        </p>
      </div>

      {!canReview && (
        <Disclaimer tone="warning" text="You are signed in without REGULATORY_REVIEWER/ADMIN privileges (or not signed in). You can view the queue but review actions will be rejected by the API." />
      )}

      <div className="flex flex-wrap gap-2">
        {ENTITY_TYPES.map((t) => (
          <button key={t} onClick={() => setEntityType(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${entityType === t ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>
            {t}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}
      {actionError && <ErrorNotice message={actionError} />}

      <div className="space-y-2">
        {data?.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-slate-500">{item.id}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {item.source_document_id} {item.source_section ? `· ${item.source_section}` : ""}
                </p>
                {item.confidence != null && <p className="text-xs text-slate-400">confidence {item.confidence.toFixed(2)}</p>}
                {item.notes && <p className="mt-1 text-xs italic text-slate-500">{item.notes}</p>}
              </div>
              <Badge>{item.verification_status}</Badge>
            </div>
            <div className="mt-3 flex gap-2">
              <button disabled={!canReview || actingOn === item.id} onClick={() => act(item.id, "approve")}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                Approve → VERIFIED
              </button>
              <button disabled={!canReview || actingOn === item.id} onClick={() => act(item.id, "reject")}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40">
                Reject
              </button>
            </div>
          </div>
        ))}
        {data && data.length === 0 && <p className="text-sm text-slate-400">Nothing pending review for this entity type.</p>}
      </div>
    </div>
  );
}
