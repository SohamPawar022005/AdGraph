import { useMemo } from "react";
import { Link } from "react-router-dom";

interface GraphNode {
  id: string;
  label: string;
  kind: string;
  [key: string]: unknown;
}
interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  is_synthetic: boolean;
}

/** A small dependency-free layered SVG graph renderer (no extra npm package needed). */
export default function GraphView({ nodes, edges, highlight }: { nodes: GraphNode[]; edges: GraphEdge[]; highlight?: string }) {
  const layout = useMemo(() => {
    // Simple longest-path layering: layer(n) = 1 + max(layer(predecessor)).
    const incoming = new Map<string, string[]>();
    nodes.forEach((n) => incoming.set(n.id, []));
    edges.forEach((e) => incoming.get(e.target)?.push(e.source));

    const layer = new Map<string, number>();
    function computeLayer(id: string, seen: Set<string>): number {
      if (layer.has(id)) return layer.get(id)!;
      if (seen.has(id)) return 0; // cycle guard
      seen.add(id);
      const preds = incoming.get(id) ?? [];
      const l = preds.length === 0 ? 0 : 1 + Math.max(...preds.map((p) => computeLayer(p, seen)));
      layer.set(id, l);
      return l;
    }
    nodes.forEach((n) => computeLayer(n.id, new Set()));

    const layers = new Map<number, string[]>();
    nodes.forEach((n) => {
      const l = layer.get(n.id) ?? 0;
      if (!layers.has(l)) layers.set(l, []);
      layers.get(l)!.push(n.id);
    });

    const colWidth = 220;
    const rowHeight = 70;
    const positions = new Map<string, { x: number; y: number }>();
    [...layers.entries()].sort((a, b) => a[0] - b[0]).forEach(([l, ids]) => {
      ids.forEach((id, i) => {
        positions.set(id, { x: l * colWidth + 100, y: i * rowHeight + 50 });
      });
    });

    const width = (Math.max(...[...layers.keys()], 0) + 1) * colWidth + 100;
    const height = (Math.max(...[...layers.values()].map((v) => v.length), 1)) * rowHeight + 60;
    return { positions, width, height };
  }, [nodes, edges]);

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white p-3">
      <svg width={layout.width} height={layout.height} className="min-w-full">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#94a3b8" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const s = layout.positions.get(e.source);
          const t = layout.positions.get(e.target);
          if (!s || !t) return null;
          return (
            <line key={i} x1={s.x + 60} y1={s.y} x2={t.x - 10} y2={t.y}
              stroke={e.is_synthetic ? "#cbd5e1" : "#60a5fa"} strokeWidth={1.5}
              strokeDasharray={e.is_synthetic ? "4 3" : undefined} markerEnd="url(#arrow)" />
          );
        })}
        {nodes.map((n) => {
          const p = layout.positions.get(n.id);
          if (!p) return null;
          const isHighlight = n.id === highlight;
          return (
            <g key={n.id} transform={`translate(${p.x - 60}, ${p.y - 16})`}>
              <rect width={120} height={32} rx={6}
                fill={isHighlight ? "#2f7bff" : "#f1f5f9"}
                stroke={isHighlight ? "#1b5cf2" : "#cbd5e1"} />
              <text x={60} y={20} textAnchor="middle" fontSize={10}
                fill={isHighlight ? "#fff" : "#334155"}>
                {n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        {nodes.map((n) => (
          <Link key={n.id} to={`/approvals/${n.id}`} className="hover:text-brand-600 hover:underline">
            {n.id}
          </Link>
        ))}
      </div>
    </div>
  );
}
