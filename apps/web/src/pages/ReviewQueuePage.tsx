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
  summary?: string | null;
  change_type?: string | null;
  old_text?: string | null;
  new_text?: string | null;
  name?: string | null;
  rule_body?: Record<string, any> | null;
}

const ENTITY_TYPES = ["rule_version", "approval", "approval_dependency", "regulatory_change"];

export default function ReviewQueuePage() {
  const { role } = useAuth();
  const [entityType, setEntityType] = useState("regulatory_change");
  const { data, loading, error, reload } = useFetch<QueueItem[]>(`/api/v1/review/queue/${entityType}`, [entityType]);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<QueueItem | null>(null);

  const canReview = role && REVIEWER_ROLES.includes(role);

  async function act(itemId: string, action: "approve" | "reject") {
    setActingOn(itemId);
    setActionError(null);
    try {
      const reason = window.prompt(`Reason for ${action} (required for the audit trail):`, "") ?? "";
      if (!reason.trim()) {
        alert("A reason is mandatory for regulatory audit compliance.");
        setActingOn(null);
        return;
      }
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
          CANDIDATE content (AI-extracted rules, inferred change interpretations) requires review by an authorized reviewer.
          Reviewers may approve to promote to VERIFIED, reject, or edit candidates with full audit logging.
        </p>
      </div>

      {!canReview && (
        <Disclaimer
          tone="warning"
          text="You are signed in without REGULATORY_REVIEWER/ADMIN privileges (or not signed in). You can view the queue, but review and edit actions will be rejected by the API."
        />
      )}

      <div className="flex flex-wrap gap-2">
        {ENTITY_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setEntityType(t)}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
              entityType === t ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}
      {actionError && <ErrorNotice message={actionError} />}

      {editingItem && (
        <EditModal
          item={editingItem}
          entityType={entityType}
          onClose={() => setEditingItem(null)}
          onSuccess={() => { setEditingItem(null); reload(); }}
        />
      )}

      <div className="space-y-3">
        {data?.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-500">{item.id}</span>
                  {item.change_type && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {item.change_type}
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium text-slate-800">
                  {item.name || item.summary || `${item.source_document_id || "Doc"} · ${item.source_section || "Section"}`}
                </p>

                {item.old_text && item.new_text && (
                  <div className="mt-2 text-xs text-slate-600 border-l-2 border-slate-200 pl-2 space-y-1">
                    <p className="line-clamp-2"><strong className="text-rose-700">Old:</strong> {item.old_text}</p>
                    <p className="line-clamp-2"><strong className="text-emerald-700">New:</strong> {item.new_text}</p>
                  </div>
                )}

                {item.confidence != null && (
                  <p className="text-xs text-slate-400">Extraction Confidence: {(item.confidence * 100).toFixed(0)}%</p>
                )}
                {item.notes && <p className="text-xs italic text-slate-500">{item.notes}</p>}
              </div>

              <Badge tone="candidate">{item.verification_status}</Badge>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                disabled={!canReview || actingOn === item.id}
                onClick={() => act(item.id, "approve")}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                Approve → VERIFIED
              </button>
              <button
                disabled={!canReview || actingOn === item.id}
                onClick={() => setEditingItem(item)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Edit / Correct
              </button>
              <button
                disabled={!canReview || actingOn === item.id}
                onClick={() => act(item.id, "reject")}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </div>
        ))}

        {data && data.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
            No items pending review for {entityType}.
          </p>
        )}
      </div>
    </div>
  );
}

function EditModal({
  item,
  entityType,
  onClose,
  onSuccess,
}: {
  item: QueueItem;
  entityType: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [summary, setSummary] = useState(item.summary ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("An audit reason is required for any human edit.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updates: Record<string, any> = { notes };
      if (entityType === "regulatory_change") {
        updates.summary = summary;
      }
      await api.post(`/api/v1/review/${entityType}/${item.id}`, {
        action: "edit",
        reason,
        updates,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-base font-bold text-slate-900">Edit & Correct Candidate {entityType}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          {entityType === "regulatory_change" && (
            <div>
              <label className="block text-xs font-medium text-slate-600">Explanation / Summary</label>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600">Reviewer Notes</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="Internal reviewer notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rose-700">Audit Reason (Required) *</label>
            <input
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              placeholder="e.g. Corrected plain-language summary to reflect exact clause wording"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {error && <ErrorNotice message={error} />}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Edits & Re-queue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
