import { Link } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import Disclaimer from "../components/Disclaimer";
import { Loading } from "../components/Loading";

interface ReadyResponse {
  status: string;
  database: boolean;
}

function StatCard({ label, to, description }: { label: string; to: string; description: string }) {
  return (
    <Link
      to={to}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
    >
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </Link>
  );
}

export default function HomePage() {
  const { data: ready, loading } = useFetch<ReadyResponse>("/ready");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">PermitGraph</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          An open-source regulatory intelligence &amp; compliance automation infrastructure
          layer for Maharashtra industrial approvals — turning Act text into versioned,
          source-cited, human-verified machine-readable rules, an approval dependency
          graph, regulatory change detection, and impact analysis.
        </p>
      </div>

      <Disclaimer
        tone="warning"
        text={
          'PermitGraph is NOT a government portal and does NOT replace NSWS, MAITRI, or MIDC\u2019s ' +
          "own systems. It is not legal advice and does not claim to be \u201cgovernment-approved\u201d. " +
          "Every rule shown here is explicitly labelled VERIFIED, CANDIDATE, or SYNTHETIC — " +
          "trace every answer back to its source Act and section before relying on it."
        }
      />

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className={`h-2 w-2 rounded-full ${ready?.database ? "bg-emerald-500" : "bg-rose-500"}`} />
        {loading ? "Checking API status…" : ready?.database ? "API &amp; database reachable" : "API unreachable"}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Start here</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            to="/discover"
            label="Discover what permissions I need"
            description="Describe a business and get a source-cited list of applicable approvals, documents, and dependencies."
          />
          <StatCard
            to="/regulations"
            label="Browse source Acts"
            description="MAITRI Act 2023, MID Act 1961, Khadi & Village Industries Act 1960 — section by section."
          />
          <StatCard
            to="/rules"
            label="Inspect rules-as-code"
            description="Every rule traces to a section, a confidence score, and a verification status."
          />
          <StatCard
            to="/approvals-graph"
            label="Explore the approval graph"
            description="See how approvals depend on each other across authorities."
          />
          <StatCard
            to="/regulatory-changes"
            label="Regulatory change detection"
            description="Compare old vs. new section text and see which rules and businesses are affected."
          />
          <StatCard
            to="/review"
            label="Human verification queue"
            description="Candidate rules awaiting a Regulatory Reviewer's approval (role-gated)."
          />
        </div>
      </div>
    </div>
  );
}
