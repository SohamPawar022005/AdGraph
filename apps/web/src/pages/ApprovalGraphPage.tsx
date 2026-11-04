import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import GraphView from "../components/GraphView";
import { ErrorNotice, Loading } from "../components/Loading";

interface GraphResponse {
  nodes: { id: string; label: string; kind: string; category?: string; is_synthetic?: boolean; verification_status?: string }[];
  edges: { source: string; target: string; relation: string; is_synthetic: boolean }[];
  has_cycle: boolean;
}

export default function ApprovalGraphPage() {
  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get("highlight") || searchParams.get("node");
  const { data, loading, error } = useFetch<GraphResponse>("/api/v1/approvals/graph");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("consent-to-establish");

  useEffect(() => {
    if (highlightParam && data?.nodes) {
      const match = data.nodes.find(
        (n) =>
          n.id.toLowerCase() === highlightParam.toLowerCase() ||
          n.label.toLowerCase().includes(highlightParam.toLowerCase())
      );
      if (match) {
        setSelectedNodeId(match.id);
      }
    }
  }, [highlightParam, data]);

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  // Upstream prerequisites: approvals that must be obtained before selectedNode
  // (In our graph model, edge source depends on target, so if source == selectedNode, target is prerequisite)
  const prerequisites = edges.filter((e) => e.source === selectedNode?.id).map((e) => e.target);
  // Downstream dependencies: approvals that require selectedNode
  const dependents = edges.filter((e) => e.target === selectedNode?.id).map((e) => e.source);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              Inter-Departmental Topology
            </span>
            <span className="text-xs text-slate-500">Government of Maharashtra DAG</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">
            Approval Dependency Graph
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
            Topological sequencing across MIDC, MPCB, DISCOM, Fire Services, and MAITRI. Direction: A → B means Approval A requires Approval B first.
          </p>
        </div>

        <Link
          to="/compare"
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs shrink-0"
        >
          ← Dual-Pane Gazette Diff
        </Link>
      </div>

      {loading && <Loading />}
      {error && <ErrorNotice message={error} />}

      {data && (
        <div className="space-y-6">
          {/* Interactive DAG Canvas */}
          <GraphView
            nodes={nodes}
            edges={edges}
            selectedId={selectedNode?.id}
            onSelectNode={(id) => setSelectedNodeId(id)}
          />

          {/* Node Inspector Drawer */}
          {selectedNode && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Selected Approval Node:
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{selectedNode.label}</h3>
                  <p className="font-mono text-xs text-slate-500">{selectedNode.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Category: {selectedNode.category || "Statutory Approval"}
                  </span>
                  <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    {selectedNode.verification_status || "VERIFIED"}
                  </span>
                  <Link
                    to={`/approvals/${selectedNode.id}`}
                    className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700 transition"
                  >
                    View Approval Full Detail →
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Prerequisites */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="text-amber-600">▲</span>
                    <span>Mandatory Upstream Prerequisites ({prerequisites.length})</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    You cannot obtain {selectedNode.label} until these prior clearances are approved:
                  </p>
                  {prerequisites.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {prerequisites.map((p) => (
                        <button
                          key={p}
                          onClick={() => setSelectedNodeId(p)}
                          className="rounded-md bg-white border border-slate-200 px-2.5 py-1 font-mono text-slate-700 hover:border-brand-500 hover:text-brand-600 transition"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">None (Independent entry-level statutory application)</p>
                  )}
                </div>

                {/* Downstream Dependents */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="text-blue-600">▼</span>
                    <span>Downstream Blocked Approvals ({dependents.length})</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    These subsequent permits are blocked until {selectedNode.label} is granted:
                  </p>
                  {dependents.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {dependents.map((d) => (
                        <button
                          key={d}
                          onClick={() => setSelectedNodeId(d)}
                          className="rounded-md bg-white border border-slate-200 px-2.5 py-1 font-mono text-slate-700 hover:border-brand-500 hover:text-brand-600 transition"
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">None (Terminal operational clearance)</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
