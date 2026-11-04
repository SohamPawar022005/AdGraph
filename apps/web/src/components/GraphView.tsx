import { useMemo } from "react";

export interface GraphNode {
  id: string;
  label: string;
  kind: string;
  category?: string;
  verification_status?: string;
  is_synthetic?: boolean;
  [key: string]: unknown;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  is_synthetic: boolean;
}

function getNodeTheme(id: string, isSelected: boolean) {
  if (isSelected) {
    return {
      fill: "#1e3a8a",
      stroke: "#3b82f6",
      text: "#ffffff",
      dept: "#93c5fd",
    };
  }
  const low = id.toLowerCase();
  if (low.includes("consent") || low.includes("mpcb")) {
    return {
      fill: "#ecfdf5",
      stroke: "#10b981",
      text: "#065f46",
      dept: "MPCB (Pollution)",
    };
  }
  if (low.includes("midc") || low.includes("plot") || low.includes("building")) {
    return {
      fill: "#eff6ff",
      stroke: "#3b82f6",
      text: "#1e40af",
      dept: "MIDC (Infrastructure)",
    };
  }
  if (low.includes("fire") || low.includes("labour") || low.includes("factory")) {
    return {
      fill: "#fff7ed",
      stroke: "#f97316",
      text: "#9a3412",
      dept: "Safety & Labour",
    };
  }
  return {
    fill: "#faf5ff",
    stroke: "#a855f7",
    text: "#6b21a8",
    dept: "MAITRI Single Window",
  };
}

export default function GraphView({
  nodes,
  edges,
  highlight,
  selectedId,
  onSelectNode,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlight?: string;
  selectedId?: string;
  onSelectNode?: (nodeId: string) => void;
}) {
  const layout = useMemo(() => {
    const incoming = new Map<string, string[]>();
    nodes.forEach((n) => incoming.set(n.id, []));
    edges.forEach((e) => incoming.get(e.target)?.push(e.source));

    const layer = new Map<string, number>();
    function computeLayer(id: string, seen: Set<string>): number {
      if (layer.has(id)) return layer.get(id)!;
      if (seen.has(id)) return 0;
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

    const colWidth = 240;
    const rowHeight = 85;
    const positions = new Map<string, { x: number; y: number }>();
    [...layers.entries()]
      .sort((a, b) => a[0] - b[0])
      .forEach(([l, ids]) => {
        ids.forEach((id, i) => {
          positions.set(id, { x: l * colWidth + 110, y: i * rowHeight + 50 });
        });
      });

    const width = (Math.max(...[...layers.keys()], 0) + 1) * colWidth + 120;
    const height = Math.max(...[...layers.values()].map((v) => v.length), 1) * rowHeight + 70;
    return { positions, width, height };
  }, [nodes, edges]);

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <svg width={layout.width} height={layout.height} className="min-w-full">
        <defs>
          <marker id="arrow-solid" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#3b82f6" />
          </marker>
          <marker id="arrow-synthetic" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Edge lines */}
        {edges.map((e, i) => {
          const s = layout.positions.get(e.source);
          const t = layout.positions.get(e.target);
          if (!s || !t) return null;
          return (
            <line
              key={i}
              x1={s.x + 75}
              y1={s.y}
              x2={t.x - 75}
              y2={t.y}
              stroke={e.is_synthetic ? "#cbd5e1" : "#60a5fa"}
              strokeWidth={e.is_synthetic ? 1.5 : 2}
              strokeDasharray={e.is_synthetic ? "4 3" : undefined}
              markerEnd={e.is_synthetic ? "url(#arrow-synthetic)" : "url(#arrow-solid)"}
            />
          );
        })}

        {/* Node cards */}
        {nodes.map((n) => {
          const p = layout.positions.get(n.id);
          if (!p) return null;
          const isSelected = n.id === selectedId;
          const isHighlight = n.id === highlight;
          const theme = getNodeTheme(n.id, isSelected || isHighlight);

          return (
            <g
              key={n.id}
              transform={`translate(${p.x - 75}, ${p.y - 22})`}
              onClick={() => onSelectNode?.(n.id)}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <rect
                width={150}
                height={44}
                rx={8}
                fill={theme.fill}
                stroke={theme.stroke}
                strokeWidth={isSelected ? 2.5 : 1.5}
                filter={isSelected ? "drop-shadow(0 4px 6px rgba(37,99,235,0.25))" : undefined}
              />
              <text
                x={75}
                y={18}
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                fill={theme.text}
              >
                {n.label.length > 20 ? n.label.slice(0, 19) + "…" : n.label}
              </text>
              <text
                x={75}
                y={32}
                textAnchor="middle"
                fontSize={8}
                fontWeight="medium"
                fill={isSelected ? "#93c5fd" : "#64748b"}
              >
                {theme.dept}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> MIDC
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> MPCB Pollution
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> MAITRI Single Window
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Safety &amp; Labour
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          {nodes.map((n) => (
            <button
              key={n.id}
              onClick={() => onSelectNode?.(n.id)}
              className={`rounded px-2 py-0.5 transition ${
                n.id === selectedId
                  ? "bg-brand-600 text-white font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {n.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
