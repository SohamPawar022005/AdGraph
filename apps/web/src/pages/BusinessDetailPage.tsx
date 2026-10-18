import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { Application, BusinessProfile, DocumentSummary } from "../lib/types";
import { api } from "../lib/api";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";

interface Page<T> { total: number; items: T[]; }

export default function BusinessDetailPage() {
  const { id } = useParams();
  const { data: biz, loading, error } = useFetch<BusinessProfile>(id ? `/api/v1/businesses/${id}` : null);
  const { data: apps, reload: reloadApps } = useFetch<Page<Application>>(
    id ? `/api/v1/applications?business_profile_id=${id}&limit=20` : null
  );
  const { data: docs } = useFetch<Page<DocumentSummary>>(
    id ? `/api/v1/documents?business_profile_id=${id}&limit=20` : null
  );
  const [creating, setCreating] = useState(false);

  if (loading) return <Loading />;
  if (error) return <ErrorNotice message={error} />;
  if (!biz) return null;

  async function createApplication(approvalId: string) {
    setCreating(true);
    try {
      await api.post("/api/v1/applications", { business_profile_id: id, approval_id: approvalId });
      reloadApps();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{biz.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {biz.industry} · {biz.district} · {biz.employees ?? "?"} employees
            {biz.is_synthetic && <> · <Badge>SYNTHETIC</Badge></>}
          </p>
        </div>
        <Link
          to={`/checklist?businessId=${biz.id}`}
          className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition"
        >
          <span className="mr-1.5">📋</span> Smart Compliance Checklist
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div><p className="text-xs text-slate-400">Investment</p><p className="font-medium">₹{biz.investment?.toLocaleString()}</p></div>
        <div><p className="text-xs text-slate-400">Project stage</p><p className="font-medium">{biz.project_stage}</p></div>
        <div><p className="text-xs text-slate-400">Land type</p><p className="font-medium">{biz.land_type}</p></div>
        <div><p className="text-xs text-slate-400">Hazardous material</p><p className="font-medium">{String(biz.hazardous_material)}</p></div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Applications ({apps?.total ?? 0})</h2>
          <button disabled={creating} onClick={() => createApplication("single-window-application")}
            className="text-xs text-brand-600 hover:underline disabled:opacity-50">
            + File single-window application
          </button>
        </div>
        <div className="space-y-2">
          {apps?.items.map((a) => (
            <Link key={a.id} to={`/applications/${a.id}`}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-sm hover:border-brand-400">
              <span>{a.approval_id}</span>
              <Badge>{a.state}</Badge>
            </Link>
          ))}
          {apps && apps.items.length === 0 && <p className="text-sm text-slate-400">No applications yet.</p>}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Documents ({docs?.total ?? 0})</h2>
        <div className="space-y-2">
          {docs?.items.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-sm">
              <span>{d.original_filename} <span className="text-xs text-slate-400">({d.document_type})</span></span>
              <Badge>{d.validation_status}</Badge>
            </div>
          ))}
          {docs && docs.items.length === 0 && <p className="text-sm text-slate-400">No documents yet.</p>}
        </div>
      </div>
    </div>
  );
}
