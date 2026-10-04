import { useFetch } from "../lib/useFetch";
import GraphView from "../components/GraphView";
import { ErrorNotice, Loading } from "../components/Loading";

interface GraphResponse {
  nodes: { id: string; label: string; kind: string }[];
  edges: { source: string; target: string; relation: string; is_synthetic: boolean }[];
  has_cycle: boolean;
}

export default function ApprovalGraphPage() {
  const { data, loading, error } = useFetch<GraphResponse>("/api/v1/approvals/graph");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Approval Dependency Graph</h1>
        <p className="mt-1 text-sm text-slate-600">
          Solid blue edges are real-process dependencies; dashed grey edges are
          synthetic/illustrative. Direction: A → B means A depends on / requires B.
        </p>
      </div>
      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}
      {data && (
        <>
          <GraphView nodes={data.nodes} edges={data.edges} />
          <p className="text-xs text-slate-500">
            {data.nodes.length} approvals · {data.edges.length} dependencies · cycle detected: {String(data.has_cycle)}
          </p>
        </>
      )}
    </div>
  );
}
