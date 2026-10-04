import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { DiscoveryResponse } from "../lib/types";
import Badge from "../components/Badge";
import Disclaimer from "../components/Disclaimer";
import { ErrorNotice, Loading } from "../components/Loading";

const INDUSTRIES = [
  "food_processing", "textile", "chemical_manufacturing", "engineering_manufacturing",
  "pharmaceutical_manufacturing", "plastics_and_packaging", "electronics_assembly",
  "auto_components", "paper_and_printing", "furniture_and_wood", "leather_and_footwear",
  "agro_based_village_industry", "it_ites_services", "renewable_energy_equipment",
];
const LAND_TYPES = ["midc_industrial_area", "private_industrial_area", "agricultural_converted", "village_industry_area", "commercial_zone"];
const PROJECT_STAGES = ["new", "expansion", "relocation", "diversification"];

export default function DiscoverPage() {
  const [form, setForm] = useState({
    industry: "food_processing",
    location: "Pune",
    district: "Pune",
    employees: 50,
    investment: 25000000,
    project_stage: "new",
    land_type: "midc_industrial_area",
    hazardous_material: false,
    is_village_industry: false,
    jurisdiction: "Maharashtra",
  });
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<DiscoveryResponse>("/api/v1/permissions/discover", form);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setLoading(false);
    }
  }

  function field<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Permission Discovery</h1>
        <p className="mt-1 text-sm text-slate-600">
          Describe a business and get a source-cited list of applicable approvals,
          required documents, and approval dependencies.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">Industry</label>
          <select className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={form.industry}
            onChange={(e) => field("industry", e.target.value)}>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">District</label>
          <input className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={form.district}
            onChange={(e) => field("district", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Employees</label>
          <input type="number" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={form.employees}
            onChange={(e) => field("employees", Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Investment (₹)</label>
          <input type="number" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={form.investment}
            onChange={(e) => field("investment", Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Project stage</label>
          <select className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={form.project_stage}
            onChange={(e) => field("project_stage", e.target.value)}>
            {PROJECT_STAGES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Land type</label>
          <select className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" value={form.land_type}
            onChange={(e) => field("land_type", e.target.value)}>
            {LAND_TYPES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input id="hazardous" type="checkbox" checked={form.hazardous_material}
            onChange={(e) => field("hazardous_material", e.target.checked)} />
          <label htmlFor="hazardous" className="text-xs text-slate-600">Uses hazardous material</label>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input id="village" type="checkbox" checked={form.is_village_industry}
            onChange={(e) => field("is_village_industry", e.target.checked)} />
          <label htmlFor="village" className="text-xs text-slate-600">Is a village industry</label>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={loading}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {loading ? "Discovering…" : "Discover permissions"}
          </button>
        </div>
      </form>

      {error && <ErrorNotice message={error} />}
      {loading && <Loading label="Evaluating rules…" />}

      {result && (
        <div className="space-y-5">
          <Disclaimer tone="warning" text={result.disclaimer} />

          {result.insufficient_input.length > 0 && (
            <Disclaimer
              tone="warning"
              text={
                "Some rules could not be fully evaluated due to missing input: " +
                result.insufficient_input
                  .map((i) => `${i.rule_name} (needs: ${i.reasons.join("; ")})`)
                  .join(" · ")
              }
            />
          )}

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Applicable permissions ({result.permissions.length})
            </h2>
            <div className="space-y-2">
              {result.permissions.map((p) => (
                <div key={p.rule_id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/approvals/${p.approval_id}`} className="font-semibold text-brand-700 hover:underline">
                        {p.approval_id}
                      </Link>
                      <p className="mt-0.5 text-sm text-slate-700">{p.rule_name}</p>
                    </div>
                    <Badge>{p.verification_status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{p.why}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Source: {p.source.document} {p.source.section ?? ""} · confidence {p.confidence.toFixed(2)}
                    {p.source.url && (
                      <>
                        {" "}· <a href={p.source.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">view source</a>
                      </>
                    )}
                  </p>
                  <Link to={`/rules/${p.rule_id}`} className="mt-1 inline-block text-xs text-brand-600 hover:underline">
                    View rule detail →
                  </Link>
                </div>
              ))}
              {result.permissions.length === 0 && (
                <p className="text-sm text-slate-400">No applicable permissions found for this profile.</p>
              )}
            </div>
          </div>

          {result.dependencies.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Dependencies</h2>
              <div className="space-y-2">
                {result.dependencies.map((d) => (
                  <div key={d.approval_id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                    <span className="font-medium text-slate-700">{d.approval_id}</span>{" "}
                    <span className="text-slate-400">depends on</span>{" "}
                    {d.depends_on.map((x, i) => (
                      <span key={x}>
                        <Link to={`/approvals/${x}`} className="text-brand-600 hover:underline">{x}</Link>
                        {i < d.depends_on.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.documents.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Likely required documents</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                {result.documents.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
