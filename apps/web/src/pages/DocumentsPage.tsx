import { useState } from "react";
import { useFetch } from "../lib/useFetch";
import type { DocumentSummary } from "../lib/types";
import { api } from "../lib/api";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";

interface Page<T> { total: number; items: T[]; }

const DOCUMENT_TYPES = ["processing_fee_receipt", "identity_proof", "project_report"];

export default function DocumentsPage() {
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const { data, loading, error, reload } = useFetch<Page<DocumentSummary>>(
    `/api/v1/documents?limit=${pageSize}&offset=${page * pageSize}`, [page]
  );
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Documents</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data ? `${data.total.toLocaleString()} documents. Validation is a deterministic structural check (file-hash integrity + required-field presence) — not an AI confidence score.` : "Loading…"}
          </p>
        </div>
        <button onClick={() => setShowUpload((s) => !s)}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
          {showUpload ? "Cancel" : "+ Upload"}
        </button>
      </div>

      {showUpload && <UploadForm onDone={() => { setShowUpload(false); reload(); }} />}

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-3 py-2">Filename</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Size</th><th className="px-3 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-700">{d.original_filename}</td>
                <td className="px-3 py-2 text-slate-500">{d.document_type}</td>
                <td className="px-3 py-2 text-slate-500">{(d.size_bytes / 1024).toFixed(1)} KB</td>
                <td className="px-3 py-2"><Badge>{d.validation_status}</Badge></td>
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

function UploadForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("document_type", docType);
      await api.postForm("/api/v1/documents/upload", form);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600">File (.pdf / .png / .jpg)</label>
        <input required type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Document type</label>
        <select className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <button type="submit" disabled={submitting || !file} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {submitting ? "Uploading…" : "Upload"}
      </button>
      {error && <ErrorNotice message={error} />}
    </form>
  );
}
