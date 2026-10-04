import { useParams } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { Approval } from "../lib/types";
import Badge from "../components/Badge";
import Disclaimer from "../components/Disclaimer";
import GraphView from "../components/GraphView";
import { ErrorNotice, Loading } from "../components/Loading";

interface DependencyDetail {
  approval_id: string;
  direct_dependencies: { depends_on: string; dependency_type: string; is_synthetic: boolean; confidence: number }[];
  upstream_closure: string[];
  downstream_closure: string[];
  has_cycle_in_full_graph: boolean;
}

export default function ApprovalDetailPage() {
  const { id } = useParams();
  const { data: approval, loading, error } = useFetch<Approval>(id ? `/api/v1/approvals/${id}` : null);
  const { data: deps } = useFetch<DependencyDetail>(id ? `/api/v1/approvals/${id}/dependencies` : null);

  if (loading) return <Loading />;
  if (error) return <ErrorNotice message={error} />;
  if (!approval) return null;

  const nodes = deps
    ? [approval.id, ...deps.upstream_closure, ...deps.downstream_closure]
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((nid) => ({ id: nid, label: nid, kind: "approval" }))
    : [];
  const edges = deps
    ? deps.direct_dependencies.map((d) => ({
        source: approval.id,
        target: d.depends_on,
        relation: d.dependency_type,
        is_synthetic: d.is_synthetic,
      }))
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{approval.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{approval.id} · {approval.category}</p>
        </div>
        <Badge>{approval.is_synthetic ? "SYNTHETIC" : approval.verification_status}</Badge>
      </div>

      {approval.is_synthetic && (
        <Disclaimer tone="warning" text="This approval is an illustrative synthetic placeholder for demo purposes and is not sourced from the three real Acts in this corpus." />
      )}

      {approval.source_document_id && (
        <p className="text-xs text-slate-500">Source: {approval.source_document_id} · {approval.source_section}</p>
      )}

      {approval.applicable_industries && (
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Applicable industries</h2>
          <div className="flex flex-wrap gap-1">
            {approval.applicable_industries.map((i) => (
              <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{i}</span>
            ))}
          </div>
        </div>
      )}

      {deps && (
        <>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Dependency graph</h2>
            <GraphView nodes={nodes} edges={edges} highlight={approval.id} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-slate-700">Upstream (prerequisites)</p>
              <p className="text-slate-500">{deps.upstream_closure.join(", ") || "None"}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700">Downstream (depends on this)</p>
              <p className="text-slate-500">{deps.downstream_closure.join(", ") || "None"}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
