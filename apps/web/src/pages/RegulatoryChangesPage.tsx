import { useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { RegulatoryChange } from "../lib/types";
import { api } from "../lib/api";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";

export default function RegulatoryChangesPage() {
  const { data, loading, error, reload } = useFetch<RegulatoryChange[]>("/api/v1/regulatory-changes");
  const [showForm, setShowForm] = useState(false);

  const sorted = [...(data ?? [])].sort((a, b) => (a.detected_at < b.detected_at ? 1 : -1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Regulatory Change Detection</h1>
          <p className="mt-1 text-sm text-slate-600">
            Structural diff between old and new section text, with automatic rule/approval impact tracing.
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
          {showForm ? "Cancel" : "+ Analyze a change"}
        </button>
      </div>

      {showForm && <AnalyzeForm onDone={() => { setShowForm(false); reload(); }} />}

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}

      <div className="space-y-2">
        {sorted.map((c) => (
          <Link key={c.id} to={`/regulatory-changes/${c.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-400">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800">{c.section_label} — {c.change_type}</p>
              <div className="flex gap-2">
                {c.is_synthetic && <Badge>SYNTHETIC</Badge>}
                <Badge>{c.verification_status}</Badge>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">{c.summary}</p>
          </Link>
        ))}
        {sorted.length === 0 && !loading && <p className="text-sm text-slate-400">No changes detected yet.</p>}
      </div>
    </div>
  );
}

function AnalyzeForm({ onDone }: { onDone: () => void }) {
  const [sectionLabel, setSectionLabel] = useState("Section 16");
  const [oldText, setOldText] = useState("");
  const [newText, setNewText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/v1/regulatory-changes/analyze", {
        old_sections: { [sectionLabel]: oldText },
        new_sections: { [sectionLabel]: newText },
        is_synthetic: true,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600">Section label</label>
        <input className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={sectionLabel} onChange={(e) => setSectionLabel(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Old text</label>
          <textarea required rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={oldText} onChange={(e) => setOldText(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">New text</label>
          <textarea required rows={4} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={newText} onChange={(e) => setNewText(e.target.value)} />
        </div>
      </div>
      {error && <ErrorNotice message={error} />}
      <button type="submit" disabled={submitting} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {submitting ? "Analyzing…" : "Run change detection"}
      </button>
    </form>
  );
}
