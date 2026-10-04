import { useParams } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import Badge from "../components/Badge";
import { ErrorNotice, Loading } from "../components/Loading";

interface Section {
  id: string;
  number: string;
  heading?: string | null;
  text: string;
}

interface RegulationVersionDetail {
  id: string;
  version_label: string;
  status: string;
  verification_status: string;
  source_document_id: string;
  source_url?: string | null;
  sections: Section[];
}

interface RegulationDetail {
  id: string;
  name: string;
  short_code: string;
  jurisdiction: string;
  versions: RegulationVersionDetail[];
}

export default function RegulationDetailPage() {
  const { id } = useParams();
  const { data, loading, error } = useFetch<RegulationDetail>(id ? `/api/v1/regulations/${id}` : null);

  if (loading) return <Loading />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{data.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{data.short_code} · {data.jurisdiction}</p>
      </div>

      {data.versions.map((v) => (
        <div key={v.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">{v.version_label}</p>
              {v.source_url && (
                <a href={v.source_url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
                  Source document →
                </a>
              )}
            </div>
            <Badge>{v.verification_status}</Badge>
          </div>
          <div className="divide-y divide-slate-100">
            {v.sections.map((s) => (
              <details key={s.id} className="py-2">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                  Section {s.number}{s.heading ? ` — ${s.heading}` : ""}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{s.text}</p>
              </details>
            ))}
            {v.sections.length === 0 && <p className="py-2 text-sm text-slate-400">No sections transcribed yet.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
