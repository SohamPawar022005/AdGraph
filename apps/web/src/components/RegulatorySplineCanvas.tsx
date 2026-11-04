import { useEffect, useRef, useState } from "react";

interface Node3D {
  id: string;
  name: string;
  shortName: string;
  role: string;
  category: "nodal" | "environment" | "infrastructure" | "utilities" | "safety";
  color: string;
  glowColor: string;
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  slaDays: number;
  activePermits: number;
  statute: string;
}

interface Edge3D {
  from: string;
  to: string;
  label: string;
  flowSpeed: number;
  offset: number;
}

const NODES: Node3D[] = [
  {
    id: "maitri",
    name: "MAITRI Single Window",
    shortName: "MAITRI",
    role: "State Nodal Facilitation & Deemed Issuance",
    category: "nodal",
    color: "#6366f1", // indigo
    glowColor: "rgba(99, 102, 241, 0.6)",
    x: 0,
    y: 0,
    z: 0,
    baseRadius: 28,
    slaDays: 21,
    activePermits: 14,
    statute: "MAITRI Act 2023 Sec 4",
  },
  {
    id: "mpcb",
    name: "Maharashtra Pollution Control Board",
    shortName: "MPCB",
    role: "Consent to Establish (CTE) & Operate (CTO)",
    category: "environment",
    color: "#10b981", // emerald
    glowColor: "rgba(16, 185, 129, 0.6)",
    x: 140,
    y: -40,
    z: 60,
    baseRadius: 20,
    slaDays: 30,
    activePermits: 6,
    statute: "Water & Air Act / Sec 16",
  },
  {
    id: "midc",
    name: "MIDC Infrastructure & Planning",
    shortName: "MIDC",
    role: "Allotment, Building Plan & Water Supply",
    category: "infrastructure",
    color: "#3b82f6", // blue
    glowColor: "rgba(59, 130, 246, 0.6)",
    x: -130,
    y: -60,
    z: -40,
    baseRadius: 22,
    slaDays: 15,
    activePermits: 8,
    statute: "MID Act 1961 Sec 46",
  },
  {
    id: "msedcl",
    name: "MSEDCL Industrial Power",
    shortName: "MSEDCL",
    role: "HT Power Sanction & Substation Feasibility",
    category: "utilities",
    color: "#f59e0b", // amber
    glowColor: "rgba(245, 158, 11, 0.6)",
    x: -110,
    y: 80,
    z: 70,
    baseRadius: 18,
    slaDays: 15,
    activePermits: 4,
    statute: "Electricity Act 2003",
  },
  {
    id: "dish",
    name: "Directorate of Industrial Safety",
    shortName: "DISH",
    role: "Factory Plan Approval & Factory License",
    category: "safety",
    color: "#8b5cf6", // purple
    glowColor: "rgba(139, 92, 246, 0.6)",
    x: 120,
    y: 75,
    z: -50,
    baseRadius: 19,
    slaDays: 30,
    activePermits: 5,
    statute: "Factories Act 1948",
  },
  {
    id: "fire",
    name: "Maharashtra Fire Services",
    shortName: "FIRE",
    role: "Provisional & Final Fire Safety NOC",
    category: "safety",
    color: "#f43f5e", // rose
    glowColor: "rgba(244, 63, 94, 0.6)",
    x: 0,
    y: -135,
    z: 20,
    baseRadius: 17,
    slaDays: 14,
    activePermits: 3,
    statute: "Fire Prevention Act 2006",
  },
];

const EDGES: Edge3D[] = [
  { from: "maitri", to: "midc", label: "Land & Water Prerequisite", flowSpeed: 0.015, offset: 0 },
  { from: "maitri", to: "mpcb", label: "CTE Pollution Clearance", flowSpeed: 0.02, offset: 0.25 },
  { from: "midc", to: "mpcb", label: "Plot Allotment Sync", flowSpeed: 0.012, offset: 0.5 },
  { from: "mpcb", to: "dish", label: "Consent Verification", flowSpeed: 0.018, offset: 0.75 },
  { from: "midc", to: "msedcl", label: "Power Infrastructure", flowSpeed: 0.014, offset: 0.3 },
  { from: "midc", to: "fire", label: "Building Plan NOC", flowSpeed: 0.016, offset: 0.6 },
  { from: "fire", to: "dish", label: "Factory Safety Clearance", flowSpeed: 0.015, offset: 0.8 },
];

export default function RegulatorySplineCanvas({
  selectedNodeId,
  onSelectNode,
  shockwaveActive,
}: {
  selectedNodeId?: string;
  onSelectNode?: (node: Node3D) => void;
  shockwaveActive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node3D | null>(null);
  const [isRotating, setIsRotating] = useState(true);

  // Mouse & rotational angle state
  const mouseRef = useRef({ x: 0, y: 0, isHovered: false });
  const rotRef = useRef({ x: 0.2, y: 0 });
  const shockwaveRef = useRef({ active: false, progress: 0 });

  useEffect(() => {
    if (shockwaveActive) {
      shockwaveRef.current = { active: true, progress: 0 };
    }
  }, [shockwaveActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Particle flow counters
    const edgeOffsets = EDGES.map((e) => e.offset);

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const dpr = window.devicePixelRatio || 1;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const fov = 420;

      // Update rotation
      if (isRotating && !mouseRef.current.isHovered) {
        rotRef.current.y += 0.004;
      } else if (mouseRef.current.isHovered) {
        // Gently follow mouse
        const targetRotY = (mouseRef.current.x - centerX) * 0.0015;
        const targetRotX = -(mouseRef.current.y - centerY) * 0.0015;
        rotRef.current.y += (targetRotY - rotRef.current.y) * 0.05;
        rotRef.current.x += (targetRotX - rotRef.current.x) * 0.05;
      }

      const cosY = Math.cos(rotRef.current.y);
      const sinY = Math.sin(rotRef.current.y);
      const cosX = Math.cos(rotRef.current.x);
      const sinX = Math.sin(rotRef.current.x);

      // Project nodes in 3D
      const projectedNodes = NODES.map((node) => {
        // Rotate Y
        const x1 = node.x * cosY + node.z * sinY;
        const z1 = -node.x * sinY + node.z * cosY;

        // Rotate X
        const y2 = node.y * cosX - z1 * sinX;
        const z2 = node.y * sinX + z1 * cosX;

        const scale = fov / (fov + z2 + 250);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;
        const projR = Math.max(8, node.baseRadius * scale);

        return {
          ...node,
          projX,
          projY,
          projR,
          projZ: z2,
          scale,
        };
      });

      // Sort by depth (painters algorithm)
      const nodeMap = new Map(projectedNodes.map((n) => [n.id, n]));

      // 1. Draw subtle background orbital grid rings
      ctx.save();
      ctx.strokeStyle = "rgba(99, 102, 241, 0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 160, 75, rotRef.current.y * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 210, 105, -rotRef.current.y * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 2. Shockwave animation
      if (shockwaveRef.current.active) {
        shockwaveRef.current.progress += 0.015;
        const swProgress = shockwaveRef.current.progress;
        const swRadius = swProgress * (width * 0.6);
        const swAlpha = Math.max(0, 1 - swProgress);

        ctx.save();
        ctx.strokeStyle = `rgba(244, 63, 94, ${swAlpha * 0.8})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, swRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(99, 102, 241, ${swAlpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, swRadius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        if (shockwaveRef.current.progress >= 1) {
          shockwaveRef.current.active = false;
        }
      }

      // 3. Draw Edges with animated pulse packets
      EDGES.forEach((edge, idx) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return;

        edgeOffsets[idx] = (edgeOffsets[idx] + edge.flowSpeed) % 1;
        const t = edgeOffsets[idx];

        const isHighlighted =
          selectedNodeId === edge.from ||
          selectedNodeId === edge.to ||
          hoveredNode?.id === edge.from ||
          hoveredNode?.id === edge.to;

        // Base line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(fromNode.projX, fromNode.projY);
        ctx.lineTo(toNode.projX, toNode.projY);
        ctx.strokeStyle = isHighlighted
          ? "rgba(99, 102, 241, 0.75)"
          : "rgba(148, 163, 184, 0.22)";
        ctx.lineWidth = isHighlighted ? 2 : 1;
        ctx.stroke();

        // Pulsing data packet traveling along edge
        const packetX = fromNode.projX + (toNode.projX - fromNode.projX) * t;
        const packetY = fromNode.projY + (toNode.projY - fromNode.projY) * t;

        ctx.fillStyle = isHighlighted ? "#818cf8" : "rgba(148, 163, 184, 0.6)";
        ctx.beginPath();
        ctx.arc(packetX, packetY, isHighlighted ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();

        // Secondary packet
        const t2 = (t + 0.5) % 1;
        const packet2X = fromNode.projX + (toNode.projX - fromNode.projX) * t2;
        const packet2Y = fromNode.projY + (toNode.projY - fromNode.projY) * t2;
        ctx.fillStyle = isHighlighted ? "#60a5fa" : "rgba(148, 163, 184, 0.35)";
        ctx.beginPath();
        ctx.arc(packet2X, packet2Y, isHighlighted ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 4. Draw Nodes with 3D sphere gradient shading
      projectedNodes.sort((a, b) => a.projZ - b.projZ);

      let foundHover: Node3D | null = null;

      projectedNodes.forEach((node) => {
        const isHover =
          mouseRef.current.isHovered &&
          Math.hypot(mouseRef.current.x - node.projX, mouseRef.current.y - node.projY) <
            node.projR + 8;

        if (isHover) foundHover = node;

        const isSelected = selectedNodeId === node.id;
        const r = isHover || isSelected ? node.projR * 1.15 : node.projR;

        // Outer glow
        ctx.save();
        const glowGrad = ctx.createRadialGradient(
          node.projX,
          node.projY,
          r * 0.4,
          node.projX,
          node.projY,
          r * 2.2
        );
        glowGrad.addColorStop(0, node.glowColor);
        glowGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(node.projX, node.projY, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Sphere body with specular highlight
        const sphereGrad = ctx.createRadialGradient(
          node.projX - r * 0.35,
          node.projY - r * 0.35,
          r * 0.1,
          node.projX,
          node.projY,
          r
        );
        sphereGrad.addColorStop(0, "#ffffff");
        sphereGrad.addColorStop(0.25, node.color);
        sphereGrad.addColorStop(1, "#0f172a");

        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(node.projX, node.projY, r, 0, Math.PI * 2);
        ctx.fill();

        // Selection or hover ring
        if (isSelected || isHover) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(node.projX, node.projY, r + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label below node
        ctx.font = `600 ${Math.max(10, Math.round(11 * node.scale))}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = isSelected ? "#38bdf8" : "#f1f5f9";
        ctx.textAlign = "center";
        ctx.fillText(node.shortName, node.projX, node.projY + r + 14);

        // Subtext role
        ctx.font = `400 ${Math.max(8, Math.round(9 * node.scale))}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
        ctx.fillText(node.category.toUpperCase(), node.projX, node.projY + r + 25);

        ctx.restore();
      });

      setHoveredNode(foundHover);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isRotating, selectedNodeId, hoveredNode?.id]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isHovered: true,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.isHovered = false;
  };

  const handleClick = () => {
    if (hoveredNode && onSelectNode) {
      onSelectNode(hoveredNode);
    }
  };

  return (
    <div className="relative w-full h-[360px] md:h-[420px] rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/90 border border-slate-700/60 overflow-hidden shadow-2xl flex flex-col justify-between group">
      {/* Top Bar inside Spline Canvas */}
      <div className="relative z-10 flex items-center justify-between p-4 border-b border-white/10 backdrop-blur-md bg-slate-900/40">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">
            Interactive Regulatory Topology Visualizer
          </span>
          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300 border border-indigo-500/30">
            3D Spatial DAG
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="rounded px-2 py-1 text-[10px] font-medium bg-white/10 hover:bg-white/20 text-slate-300 transition"
          >
            {isRotating ? "Pause Orbit" : "Resume Orbit"}
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="w-full h-full cursor-pointer touch-none"
      />

      {/* Hover or Selected Node Overlay Pill */}
      {hoveredNode && (
        <div className="absolute bottom-12 left-4 right-4 md:right-auto md:w-80 z-20 rounded-xl bg-slate-900/95 p-3.5 border border-indigo-500/40 shadow-2xl backdrop-blur-md space-y-1.5 pointer-events-none transition-all">
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: hoveredNode.color }}
              />
              {hoveredNode.name}
            </span>
            <span className="font-mono text-[10px] text-indigo-300 bg-indigo-900/60 px-1.5 py-0.5 rounded border border-indigo-500/30">
              SLA: {hoveredNode.slaDays}d
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">{hoveredNode.role}</p>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/60 font-mono">
            <span>{hoveredNode.statute}</span>
            <span className="text-emerald-400 font-semibold">{hoveredNode.activePermits} Active Approvals</span>
          </div>
        </div>
      )}

      {/* Bottom Status Ticker */}
      <div className="relative z-10 flex items-center justify-between px-4 py-2 border-t border-white/10 bg-slate-900/60 backdrop-blur-xs text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="text-indigo-400">❖</span> Drag / hover to tilt 3D spatial node coordinates
        </span>
        <span className="font-mono text-slate-500 hidden sm:inline">
          6 State Regulators · Deterministic Approval Traversal
        </span>
      </div>
    </div>
  );
}
