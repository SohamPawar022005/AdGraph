import { useState } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { BusinessProfile } from "../lib/types";
import { api } from "../lib/api";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";

interface Page<T> { total: number; items: T[]; }

export default function BusinessesPage() {
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const { data, loading, error, reload } = useFetch<Page<BusinessProfile>>(
    `/api/v1/businesses?limit=${pageSize}&offset=${page * pageSize}`,
    [page]
  );
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Business Profiles</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data ? `${data.total.toLocaleString()} profiles (synthetic demo dataset + any created here)` : "Loading…"}
          </p>
        </div>
        <button onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
          {showForm ? "Cancel" : "+ New business"}
        </button>
      </div>

      {showForm && <CreateBusinessForm onCreated={() => { setShowForm(false); reload(); }} />}

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Industry</th>
              <th className="px-3 py-2">District</th>
              <th className="px-3 py-2">Scale</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-700">{b.name}</td>
                <td className="px-3 py-2 text-slate-500">{b.industry}</td>
                <td className="px-3 py-2 text-slate-500">{b.district}</td>
                <td className="px-3 py-2">{b.is_synthetic && <Badge>SYNTHETIC</Badge>}</td>
                <td className="px-3 py-2"><Link to={`/businesses/${b.id}`} className="text-brand-600 hover:underline">View →</Link></td>
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

const INDUSTRIES = [
  "food_processing", "textile", "chemical_manufacturing", "engineering_manufacturing",
  "pharmaceutical_manufacturing", "plastics_and_packaging", "electronics_assembly",
  "auto_components", "paper_and_printing", "furniture_and_wood", "leather_and_footwear",
  "agro_based_village_industry", "it_ites_services", "renewable_energy_equipment",
];

function CreateBusinessForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [district, setDistrict] = useState("Pune");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/v1/businesses", { name, industry, district, is_synthetic: false });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create business");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-slate-600">Name</label>
        <input required className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">Industry</label>
        <select className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={industry} onChange={(e) => setIndustry(e.target.value)}>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600">District</label>
        <input className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={district} onChange={(e) => setDistrict(e.target.value)} />
      </div>
      <button type="submit" disabled={submitting} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
        {submitting ? "Creating…" : "Create"}
      </button>
      {error && <ErrorNotice message={error} />}
    </form>
  );
}
