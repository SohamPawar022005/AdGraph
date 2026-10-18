import { useState } from "react";
import { useFetch } from "../lib/useFetch";
import type { DocumentSummary, SourceDocument } from "../lib/types";
import { api } from "../lib/api";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";

interface Page<T> { total: number; items: T[]; }

const APP_DOC_TYPES = ["processing_fee_receipt", "identity_proof", "project_report"];

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<"regulatory" | "application">("regulatory");

  return (
    <div className="space-y-4">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("regulatory")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "regulatory"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Regulatory Source Documents (Acts & Rules)
        </button>
        <button
          onClick={() => setActiveTab("application")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "application"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Application Proofs & Attachments
        </button>
      </div>

      {activeTab === "regulatory" ? <RegulatoryDocumentsTab /> : <ApplicationDocumentsTab />}
    </div>
  );
}

function RegulatoryDocumentsTab() {
  const { data, loading, error, reload } = useFetch<SourceDocument[]>("/api/v1/regulations/source-documents/list");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Regulatory Source Documents</h1>
          <p className="mt-1 text-sm text-slate-600">
            Authoritative state Acts, statutory rules, and amendments with provenance, content hashes, and OCR status.
          </p>
        </div>
        <button
          onClick={() => setShowUpload((s) => !s)}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {showUpload ? "Cancel" : "+ Upload Regulatory Document"}
        </button>
      </div>

      {showUpload && <RegulatoryUploadForm onDone={() => { setShowUpload(false); reload(); }} />}

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Document ID</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Jurisdiction</th>
              <th className="px-3 py-2">OCR Status</th>
              <th className="px-3 py-2">Pages</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs text-brand-700">{d.id}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{d.title}</td>
                <td className="px-3 py-2 text-slate-500">{d.version_label}</td>
                <td className="px-3 py-2 text-slate-500">{d.jurisdiction}</td>
                <td className="px-3 py-2"><Badge>{d.ocr_status}</Badge></td>
                <td className="px-3 py-2 text-slate-500">{d.page_count}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setSelectedDocId(selectedDocId === d.id ? null : d.id)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    {selectedDocId === d.id ? "Hide details" : "Inspect sections"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.length === 0 && !loading && (
          <p className="p-4 text-sm text-slate-400">No source documents uploaded yet.</p>
        )}
      </div>

      {selectedDocId && <DocumentDetailView docId={selectedDocId} />}
    </div>
  );
}

function DocumentDetailView({ docId }: { docId: string }) {
  const { data, loading, error } = useFetch<SourceDocument>(`/api/v1/regulations/source-documents/${docId}`, [docId]);

  if (loading) return <Loading />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-3 rounded-lg border border-brand-200 bg-brand-50/20 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">{data.title} ({data.version_label})</h2>
        <Badge>{data.ocr_status}</Badge>
      </div>
      <p className="font-mono text-xs text-slate-500">Hash: {data.content_hash || "n/a"}</p>
      {data.notes && <p className="text-xs italic text-slate-600">{data.notes}</p>}

      {data.raw_text_preview && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-brand-700">Preview extracted raw text</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-100 p-2 font-mono text-xs whitespace-pre-wrap text-slate-700">
            {data.raw_text_preview}
          </pre>
        </details>
      )}

      <div className="mt-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Extracted Clauses ({data.sections?.length || 0})
        </h3>
        <div className="max-h-80 space-y-2 overflow-auto">
          {data.sections?.map((sec) => (
            <div key={sec.id} className="rounded border border-slate-200 bg-white p-2.5">
              <span className="font-semibold text-xs text-brand-800">Section {sec.number}</span>
              {sec.heading && <span className="ml-2 text-xs text-slate-600">— {sec.heading}</span>}
              <p className="mt-1 text-xs text-slate-700 whitespace-pre-wrap">{sec.text}</p>
            </div>
          ))}
          {(!data.sections || data.sections.length === 0) && (
            <p className="text-xs text-slate-400">No sections were structured from this document.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RegulatoryUploadForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [versionLabel, setVersionLabel] = useState("v1");
  const [jurisdiction, setJurisdiction] = useState("Maharashtra");
  const [authority, setAuthority] = useState("");
  const [docType, setDocType] = useState("Act");
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
      form.append("title", title);
      form.append("version_label", versionLabel);
      form.append("jurisdiction", jurisdiction);
      form.append("authority", authority);
      form.append("document_type", docType);
      await api.postForm("/api/v1/regulations/source-documents/upload", form);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold text-slate-800">Upload Regulatory Document (.pdf, .txt, .md, .json)</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Document Title</label>
          <input
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="e.g. Maharashtra Industrial Development Act"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Version / Year</label>
          <input
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="e.g. 2024 or v2"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Document Type</label>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            <option value="Act">Act</option>
            <option value="Rule">Statutory Rule</option>
            <option value="Amendment">Amendment Notification</option>
            <option value="Circular">Government Circular</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Authority</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="e.g. MIDC / Industries Dept"
            value={authority}
            onChange={(e) => setAuthority(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Jurisdiction</label>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
          />
        </div>

      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">File</label>
        <input
          required
          type="file"
          accept=".pdf,.txt,.md,.json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 text-sm"
        />
      </div>
      {error && <ErrorNotice message={error} />}
      <button
        type="submit"
        disabled={submitting || !file || !title}
        className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? "Extracting & Ingesting…" : "Ingest Regulatory Document"}
      </button>
    </form>
  );
}

function ApplicationDocumentsTab() {
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
          <h1 className="text-xl font-bold text-slate-900">Application Proofs & Attachments</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data ? `${data.total.toLocaleString()} business application documents.` : "Loading…"}
          </p>
        </div>
        <button
          onClick={() => setShowUpload((s) => !s)}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {showUpload ? "Cancel" : "+ Upload"}
        </button>
      </div>

      {showUpload && <ApplicationUploadForm onDone={() => { setShowUpload(false); reload(); }} />}

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Filename</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Status</th>
            </tr>
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

function ApplicationUploadForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState(APP_DOC_TYPES[0]);
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
          {APP_DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <button type="submit" disabled={submitting || !file} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {submitting ? "Uploading…" : "Upload"}
      </button>
      {error && <ErrorNotice message={error} />}
    </form>
  );
}
