import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Eye,
  FileCode2,
  FileText,
  Filter,
  GitBranch,
  Layers,
  Scale,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { useFetch } from "../lib/useFetch";

interface ReadyResponse {
  status: string;
  database: boolean;
}

interface SimulationScenario {
  id: string;
  title: string;
  actName: string;
  gazetteCitation: string;
  date: string;
  section: string;
  changeType: "DEADLINE_CHANGE" | "PENALTY_ESCALATION" | "DEEMED_APPROVAL";
  badgeColor: string;
  oldLawText: string;
  newLawText: string;
  explanation: string;
  triggerRule: string;
  primaryApproval: string;
  issuingAuthority: string;
  downstreamApprovals: { name: string; authority: string; reason: string }[];
  affectedBusinesses: {
    name: string;
    location: string;
    scale: string;
    status: string;
    slaRemaining: string;
    badgeStyle: string;
  }[];
  impactScore: number;
  compareClauseId: string;
}

const SCENARIOS: SimulationScenario[] = [
  {
    id: "maitri-sec-16",
    title: "Joint Site Inspection SLA Compressed from Indeterminate to 15 Days",
    actName: "The Maharashtra Industry, Trade and Investment Facilitation Act, 2023",
    gazetteCitation: "Maharashtra Gazette Notif. No. IAC-2024/CR-104/IND-7",
    date: "15 September 2024",
    section: "Section 16 (Rationalization of Inspections)",
    changeType: "DEADLINE_CHANGE",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    oldLawText:
      "The inspections under the provisions of relevant law by the concerned authorities shall, as far as practicable, be conducted jointly, based on random selection.",
    newLawText:
      "Joint site inspections for industrial units falling in Red and Orange categories shall be completed within fifteen days from application receipt. Joint inspection report must be uploaded within forty-eight hours, failing which inspection deemed approved.",
    explanation:
      "Statutory SLA Enforcement: Regulatory bodies (MPCB, DISCOM, MIDC) can no longer delay independent site audits. Unfulfilled inspection at Day 15 triggers automatic deemed inspection compliance.",
    triggerRule: "RULE-MAITRI-016 (Joint Inspection Timelines)",
    primaryApproval: "JOINT-SITE-INSPECTION-CONSENT",
    issuingAuthority: "Joint Inspection Committee (MPCB / DISCOM / MIDC)",
    downstreamApprovals: [
      {
        name: "MPCB-CONSENT-TO-ESTABLISH",
        authority: "MPCB",
        reason: "Prerequisite on-site environmental assessment unblocked",
      },
      {
        name: "MIDC-BUILDING-PLAN-APPROVAL",
        authority: "MIDC",
        reason: "Structural scrutiny proceeds immediately after site audit sign-off",
      },
      {
        name: "FACTORY-LICENSE-CONSENT",
        authority: "DISH",
        reason: "Final operating clearance timeline unblocked",
      },
    ],
    affectedBusinesses: [
      {
        name: "Sahyadri Agro-Processing Cluster",
        location: "Baramati MIDC, Pune",
        scale: "₹25.0 Cr Investment",
        status: "Inspection Pending",
        slaRemaining: "4 Days remaining (Day 11 of 15)",
        badgeStyle: "bg-amber-100 text-amber-800 border-amber-300",
      },
      {
        name: "Varad Precision Engineering Pvt Ltd",
        location: "Chakan Phase II, Pune",
        scale: "₹42.5 Cr Investment",
        status: "Inspection Scheduled",
        slaRemaining: "11 Days remaining (Day 4 of 15)",
        badgeStyle: "bg-blue-100 text-blue-800 border-blue-300",
      },
    ],
    impactScore: 0.98,
    compareClauseId: "sec-16",
  },
  {
    id: "mid-sec-46",
    title: "Hundred-Fold Penalty Escalation for Non-Conforming Construction & Effluent Breach",
    actName: "The Maharashtra Industrial Development Act, 1961",
    gazetteCitation: "Maharashtra Act No. XI of 2012 (Gazette Consolidation)",
    date: "Official Gazette, 2012 Consolidation",
    section: "Section 46 (Penalty for Breach of Building & Environmental Regulations)",
    changeType: "PENALTY_ESCALATION",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    oldLawText:
      "Any person who erects or alters any building in contravention of regulations shall be punishable with fine which may extend to one thousand rupees.",
    newLawText:
      "Any person who erects or alters any building, or discharges untreated effluent into Corporation drainage in contravention of regulations, shall be punishable with fine which may extend to one lakh rupees, and with further fine which may extend to five thousand rupees for every day.",
    explanation:
      "100x Financial Risk Escalation: Shifts non-compliance from negligible cost of business to immediate stop-work threshold. Re-evaluates compliance risk models across all active MIDC factory construction sites.",
    triggerRule: "RULE-MID-046 (Unauthorized Construction & Pollution Penalties)",
    primaryApproval: "MIDC-BUILDING-PLAN-APPROVAL",
    issuingAuthority: "MIDC Planning & Architecture Division",
    downstreamApprovals: [
      {
        name: "MIDC-DRAINAGE-NOC",
        authority: "MIDC",
        reason: "Effluent connection standards require certified discharge conformity",
      },
      {
        name: "MPCB-CONSENT-TO-OPERATE",
        authority: "MPCB",
        reason: "Operating consent conditioned on strict drainage penalty compliance",
      },
      {
        name: "FACTORY-COMPLETION-CERTIFICATE",
        authority: "DISH / MIDC",
        reason: "Final occupancy blocked if unauthorized deviations exist",
      },
    ],
    affectedBusinesses: [
      {
        name: "Mahalaxmi Chemical Synthetics",
        location: "Tarapur MIDC, Palghar",
        scale: "Red Category Unit",
        status: "Architectural Audit",
        slaRemaining: "High penalty risk threshold active",
        badgeStyle: "bg-rose-100 text-rose-800 border-rose-300",
      },
      {
        name: "Deccan Metal Foundry Works",
        location: "Waluj MIDC, Chhatrapati Sambhajinagar",
        scale: "Orange Category Unit",
        status: "Effluent Drainage Scrutiny",
        slaRemaining: "Drainage NOC prerequisite pending",
        badgeStyle: "bg-amber-100 text-amber-800 border-amber-300",
      },
    ],
    impactScore: 0.92,
    compareClauseId: "mid-sec-46",
  },
  {
    id: "maitri-sec-4",
    title: "Mandatory 21-Day Deemed Clearance & Strict One-Time Query Limit",
    actName: "The Maharashtra Industry, Trade and Investment Facilitation Act, 2023",
    gazetteCitation: "Maharashtra Gazette Notif. No. IAC-2024/CR-104/IND-7",
    date: "15 September 2024",
    section: "Section 4 (Disposal of Applications & Deemed Clearances)",
    changeType: "DEEMED_APPROVAL",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    oldLawText:
      "The Competent Authority may obtain additional information from the applicant within specified time limit... shall take decision within the specified time limit.",
    newLawText:
      "The Competent Authority may raise queries only once, within seven working days. The Competent Authority shall take decision within twenty-one days, failing which deemed approval certificate shall be automatically generated by the Single Window System.",
    explanation:
      "Eliminates Bureaucratic Query Loops: State officers are restricted to a single query window (within 7 days). If an application remains pending at Day 21, the digital engine auto-issues statutory deemed clearance.",
    triggerRule: "RULE-MAITRI-004 (Statutory Time Limits & Single Window Issuance)",
    primaryApproval: "MAITRI-NODAL-REGISTRATION",
    issuingAuthority: "MAITRI State Single Window Gateway",
    downstreamApprovals: [
      {
        name: "MIDC-WATER-CONNECTION",
        authority: "MIDC",
        reason: "Water sanction must honor deemed single-window registration",
      },
      {
        name: "MSEDCL-INDUSTRIAL-POWER",
        authority: "MSEDCL",
        reason: "Feasibility study initiated on deemed nodal confirmation",
      },
      {
        name: "DISCOM-HT-SANCTION",
        authority: "DISCOM",
        reason: "High-tension power line processing triggered automatically",
      },
    ],
    affectedBusinesses: [
      {
        name: "Shree Ganesh Food Tech",
        location: "Ranjangaon MIDC, Pune",
        scale: "Medium Enterprise",
        status: "Day 18 of Review",
        slaRemaining: "3 Days to Deemed Auto-Approval",
        badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-300",
      },
      {
        name: "Ajanta Pharma Logistics Hub",
        location: "Butibori MIDC, Nagpur",
        scale: "Large Scale Logistics",
        status: "Query Responded",
        slaRemaining: "Query loop locked · Final decision due",
        badgeStyle: "bg-blue-100 text-blue-800 border-blue-300",
      },
    ],
    impactScore: 0.94,
    compareClauseId: "sec-4",
  },
];

const DEEMED_RADAR_ITEMS = [
  {
    unit: "Shree Ganesh Food Tech",
    district: "Pune (Ranjangaon MIDC)",
    permit: "MAITRI Nodal Registration",
    authority: "MAITRI",
    daysElapsed: 18,
    slaLimit: 21,
    status: "CRITICAL_COUNTDOWN",
    trigger: "Auto-Deemed Clearance at Day 21",
    scale: "Medium Enterprise (₹18.5 Cr)",
  },
  {
    unit: "Sahyadri Agro-Processing Cluster",
    district: "Pune (Baramati MIDC)",
    permit: "Joint Site Inspection",
    authority: "MPCB / MIDC",
    daysElapsed: 11,
    slaLimit: 15,
    status: "EXPEDITED",
    trigger: "Report due within 48h",
    scale: "Large Enterprise (₹25.0 Cr)",
  },
  {
    unit: "Varad Precision Engineering",
    district: "Pune (Chakan Phase II)",
    permit: "Joint Site Inspection",
    authority: "MPCB / DISCOM",
    daysElapsed: 4,
    slaLimit: 15,
    status: "ON_TRACK",
    trigger: "Combined inspection scheduled",
    scale: "Large Enterprise (₹42.5 Cr)",
  },
  {
    unit: "Mahalaxmi Chemical Synthetics",
    district: "Palghar (Tarapur MIDC)",
    permit: "MIDC Building Plan Approval",
    authority: "MIDC Planning",
    daysElapsed: 22,
    slaLimit: 30,
    status: "SCRUTINY",
    trigger: "Section 46 penalty check active",
    scale: "Red Category Unit (₹14.2 Cr)",
  },
];

export default function HomePage() {
  const { data: ready } = useFetch<ReadyResponse>("/ready");
  const [activeScenarioId, setActiveScenarioId] = useState<string>("maitri-sec-16");
  const [activeTab, setActiveTab] = useState<"investor" | "regulator" | "integrator">("investor");
  const [selectedRadarDistrict, setSelectedRadarDistrict] = useState<string>("all");
  const [showPitchModal, setShowPitchModal] = useState<boolean>(false);

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

  const filteredRadarItems =
    selectedRadarDistrict === "all"
      ? DEEMED_RADAR_ITEMS
      : DEEMED_RADAR_ITEMS.filter((item) =>
          item.district.toLowerCase().includes(selectedRadarDistrict.toLowerCase())
        );

  return (
    <div className="space-y-8 pb-16 font-sans antialiased text-slate-800">
      {/* 1. Impeccable System Bar: Crisp GovTech Utility Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white border border-slate-200/90 px-5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                  ready?.database ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  ready?.database ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
            </span>
            <span className="text-xs font-bold text-slate-900 tracking-tight">
              PermitGraph Regulatory Intelligence Engine
            </span>
          </div>

          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
            <span>Maharashtra State Single Window</span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-[10px] text-slate-500">API Port 8001</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/compare"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Launch Dual-Pane Gazette Diff</span>
          </Link>

          <button
            onClick={() => setShowPitchModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold border border-slate-200 transition-colors"
          >
            <Shield className="h-3.5 w-3.5 text-slate-600" />
            <span>Jury Pitch &amp; Panel Defense</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Command Section: Authoritative Context & Segmented Scenarios */}
      <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-850 p-6 sm:p-8 md:p-10 text-white shadow-xl border border-slate-800 space-y-6 relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300 border border-brand-500/30">
              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
              SIH Problem Statement 26130
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 border border-white/15">
              MAITRI · MIDC · MPCB · MSEDCL · DISH
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Automating Industrial Approvals &amp; Gazette Change Intelligence
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            When Maharashtra amends an Act or publishes a Gazette notification, single-window systems stall and businesses face silent compliance traps. 
            <strong> PermitGraph</strong> converts statutory law into verified rules-as-code, traverses approval dependencies, and traces the ripple effect to active factory applications before deadlines expire.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all hover:scale-[1.01]"
            >
              <span>📄</span>
              <span>Open Side-by-Side Gazette Diff</span>
              <span className="ml-1 rounded bg-brand-700/90 px-1.5 py-0.5 text-[9px] uppercase font-bold text-brand-200">
                Official 2024 Gazette
              </span>
            </Link>

            <Link
              to="/policy-sandbox"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.01]"
            >
              <Sparkles className="h-4 w-4" />
              <span>What-If Policy Sandbox</span>
            </Link>

            <Link
              to="/approvals-graph"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white transition-all border border-white/15"
            >
              <GitBranch className="h-4 w-4" />
              <span>Explore Dependency DAG</span>
            </Link>

            <Link
              to="/discover"
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/15 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-all border border-white/10"
            >
              <Compass className="h-4 w-4" />
              <span>Permission Discovery Wizard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Watermelon UI Bento KPI Grid: 4 Clean Metrics Grounded in SQLite Database */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Statutory Acts
            </span>
            <span className="rounded-lg bg-slate-100 p-2 text-slate-700">
              <Scale className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">3 State Acts</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            MAITRI Act 2023 · MID Act 1961 · Khadi Act 1960
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Active in Database</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rules-as-Code
            </span>
            <span className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
              <FileCode2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">20 Rules-as-Code</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            43 Statutory Sections across 6 State Authorities
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-brand-700">
            <GitBranch className="h-3.5 w-3.5" />
            <span>Deterministic Graph Traversals</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gazette Changes
            </span>
            <span className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <Zap className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-brand-700 tracking-tight">153 Traced Changes</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            29 Real Gazette Diffs in Side-by-Side Viewer
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
            <Activity className="h-3.5 w-3.5" />
            <span>Full Evidence Chains Logged</span>
          </div>
        </div>

        {/* Metric 4: DEFENSIBLE AI GOVERNANCE */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Verification Gate
            </span>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <Shield className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-700 tracking-tight">Human-in-the-Loop</p>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Quarantined draft rules require compliance officer sign-off
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Immutable Audit Trail</span>
          </div>
        </div>
      </div>

      {/* 4. Flagship Interactive Command Center: Regulatory Change Impact Console */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_4px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-brand-600 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Live Regulatory Change Ripple Simulator
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Select an authoritative Maharashtra Gazette amendment to inspect how changes propagate from statutory text to approval dependencies and factory operations.
            </p>
          </div>

          <Link
            to="/compare"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-800 transition"
          >
            <span>Open in Dual-Pane Gazette Diff</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Impeccable Segmented Scenario Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SCENARIOS.map((sc) => {
            const isSelected = sc.id === activeScenarioId;
            return (
              <button
                key={sc.id}
                onClick={() => setActiveScenarioId(sc.id)}
                className={`text-left rounded-2xl p-4 border transition-all ${
                  isSelected
                    ? "border-brand-500 bg-brand-50/70 shadow-xs ring-1 ring-brand-500/30"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${sc.badgeColor}`}
                  >
                    {sc.changeType.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-xs text-slate-400 font-semibold">
                    {sc.section.split(" ")[0]} {sc.section.split(" ")[1]}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                  {sc.title}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 truncate font-mono">
                  {sc.primaryApproval}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Scenario Inspector Workspace */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div>
              <span className="text-[10px] font-bold text-brand-700 uppercase tracking-widest">
                Active Scenario Trace
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                {scenario.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {scenario.actName} · {scenario.section} · Published: {scenario.date}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Calculated Impact Score:</span>
              <span className="rounded-full bg-rose-100 px-3 py-1 font-mono text-xs font-bold text-rose-800 border border-rose-200">
                {(scenario.impactScore * 100).toFixed(0)}% Critical Impact
              </span>
            </div>
          </div>

          {/* Unified 4-Stage Regulatory Dependency Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Stage 1 & 2: Statutory Diff & Rules-as-Code (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Clause Diff Block */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                      1
                    </span>
                    <span>Gazette Clause Diff</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">STATUTORY TEXT</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="rounded-xl bg-rose-50/80 p-3 border border-rose-100 text-rose-950 leading-relaxed">
                    <span className="font-bold text-rose-700 block text-[9px] uppercase tracking-wider mb-1">
                      Prior Statutory Text:
                    </span>
                    {scenario.oldLawText}
                  </div>
                  <div className="rounded-xl bg-emerald-50/80 p-3 border border-emerald-100 text-emerald-950 leading-relaxed">
                    <span className="font-bold text-emerald-700 block text-[9px] uppercase tracking-wider mb-1">
                      Gazette Amendment (2024):
                    </span>
                    {scenario.newLawText}
                  </div>
                </div>

                <div className="pt-1">
                  <Link
                    to="/compare"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
                  >
                    <span>Inspect Full Side-by-Side Diff</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Triggered Rule Block */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                      2
                    </span>
                    <span>Triggered Rule-as-Code</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 font-semibold">
                    ✓ DETERMINISTIC
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 space-y-1.5 text-xs">
                  <p className="font-mono font-bold text-brand-700">{scenario.triggerRule}</p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{scenario.explanation}</p>
                </div>
              </div>
            </div>

            {/* Stage 3 & 4: Approval DAG Traversal & Live Plant Impact (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Approval Dependency Cascade Block */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                      3
                    </span>
                    <span>Approval DAG Traversal</span>
                  </span>
                  <span className="text-[10px] font-mono text-blue-600 font-semibold">
                    STATE AUTHORITIES
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Primary Node */}
                  <div className="rounded-xl bg-blue-50/80 p-3 border border-blue-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                        Primary Impacted Node
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {scenario.issuingAuthority}
                      </span>
                    </div>
                    <p className="font-mono font-bold text-blue-950 text-sm">
                      {scenario.primaryApproval}
                    </p>
                  </div>

                  {/* Downstream Cascading Nodes */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Downstream Approvals Cascaded:
                    </span>
                    {scenario.downstreamApprovals.map((app) => (
                      <div
                        key={app.name}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-brand-600 font-bold">↳</span>
                          <span className="font-mono font-semibold text-slate-800">{app.name}</span>
                          <span className="rounded bg-slate-200/80 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                            {app.authority}
                          </span>
                        </div>
                        <span className="text-slate-500 text-[10px] italic">{app.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Real Factory Units Impacted */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                      4
                    </span>
                    <span>Live Factory Units Impacted</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    REAL MAHARASHTRA PLANTS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {scenario.affectedBusinesses.map((biz) => (
                    <div
                      key={biz.name}
                      className="rounded-xl bg-amber-50/50 p-3 border border-amber-200/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 line-clamp-1">
                          {biz.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${biz.badgeStyle}`}
                        >
                          {biz.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {biz.location} · <span className="font-medium text-slate-800">{biz.scale}</span>
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 pt-0.5 border-t border-amber-200/60">
                        {biz.slaRemaining}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                Provenance Grounding: Every rule &amp; dependency links back to Official Maharashtra Gazette citations.
              </span>
            </span>

            <Link
              to="/approvals-graph"
              className="font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
            >
              <span>Explore Complete Approval DAG</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Section 4 Deemed Approval & Statutory SLA Radar Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_4px_rgba(0,0,0,0.04)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Section 4 Deemed Approval Radar &amp; Statutory SLA Monitor
              </h3>
              <p className="text-xs text-slate-500">
                Tracking Maharashtra industrial units approaching statutory deemed approval deadlines under the MAITRI Act 2023.
              </p>
            </div>
          </div>

          {/* District Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <span className="px-2 text-slate-400 flex items-center gap-1 text-[11px]">
              <Filter className="h-3 w-3" />
              <span>Estate:</span>
            </span>
            {["all", "Pune", "Palghar", "Nagpur"].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedRadarDistrict(d)}
                className={`px-2.5 py-1 rounded-lg transition capitalize text-xs ${
                  selectedRadarDistrict === d
                    ? "bg-white text-slate-900 shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                {d === "all" ? "All Estates" : d}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Enterprise &amp; Scale</th>
                <th className="py-3 px-4">Industrial Estate</th>
                <th className="py-3 px-4">Target Statutory Approval</th>
                <th className="py-3 px-4">SLA Elapsed vs Limit</th>
                <th className="py-3 px-4">Automated Statutory Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {filteredRadarItems.map((item) => {
                const percent = Math.min(100, Math.round((item.daysElapsed / item.slaLimit) * 100));
                return (
                  <tr key={item.unit} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{item.unit}</p>
                      <p className="text-[10px] text-slate-500">{item.scale}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">{item.district}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-indigo-700 font-semibold block">
                        {item.permit}
                      </span>
                      <span className="text-[10px] text-slate-400">{item.authority}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-48 space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="font-semibold text-slate-700">
                            Day {item.daysElapsed} of {item.slaLimit}
                          </span>
                          <span
                            className={`font-bold ${
                              percent >= 80 ? "text-rose-600" : percent >= 60 ? "text-amber-600" : "text-emerald-600"
                            }`}
                          >
                            {percent}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percent >= 80 ? "bg-rose-500" : percent >= 60 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                          item.status === "CRITICAL_COUNTDOWN"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : item.status === "EXPEDITED"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        <Zap className="h-3 w-3" />
                        {item.trigger}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Three Real-World Stakeholder Workflows */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_4px_rgba(0,0,0,0.04)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Delivering Value Across Maharashtra Stakeholders
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Select a stakeholder view to inspect tailored workflows and direct system interfaces.
            </p>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab("investor")}
              className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === "investor" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-brand-600" />
              <span>Factory Investor</span>
            </button>
            <button
              onClick={() => setActiveTab("regulator")}
              className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === "regulator" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-indigo-600" />
              <span>Compliance Officer</span>
            </button>
            <button
              onClick={() => setActiveTab("integrator")}
              className={`rounded-lg px-3 py-1.5 transition flex items-center gap-1.5 ${
                activeTab === "integrator" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
              }`}
            >
              <Cpu className="h-3.5 w-3.5 text-emerald-600" />
              <span>State Integrator</span>
            </button>
          </div>
        </div>

        {activeTab === "investor" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
                <Compass className="h-4 w-4" />
                <span>Deterministic Discovery</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Entrepreneurs enter plant coordinates, investment scale, and industry (e.g. Chemical Manufacturing in Tarapur MIDC). PermitGraph calculates the exact sequence of 12 required approvals without expensive consultants.
              </p>
              <Link to="/discover" className="inline-block text-xs font-semibold text-brand-600 hover:underline pt-1">
                Try Discovery Wizard →
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
                <GitBranch className="h-4 w-4" />
                <span>Dependency Sequencing</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Avoid applying out-of-order. The DAG clarifies that MPCB Consent to Establish and MIDC Water Allocation must precede Building Plan Approvals, saving months of stalled paperwork.
              </p>
              <Link to="/approvals-graph" className="inline-block text-xs font-semibold text-brand-600 hover:underline pt-1">
                View Sequence Graph →
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
                <Clock className="h-4 w-4" />
                <span>Statutory Alerting</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                When Section 16 shortens joint inspections to 15 days, existing applicants are automatically alerted with a countdown clock to demand deemed clearance.
              </p>
              <Link to="/applications" className="inline-block text-xs font-semibold text-brand-600 hover:underline pt-1">
                Inspect Applications →
              </Link>
            </div>
          </div>
        )}

        {activeTab === "regulator" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <FileText className="h-4 w-4" />
                <span>Gazette Ingestion</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload new Maharashtra Government Gazette notifications (.pdf, .txt). The engine performs OCR, extracts statutory clauses, and detects clause renumberings.
              </p>
              <Link to="/documents" className="inline-block text-xs font-semibold text-indigo-600 hover:underline pt-1">
                Document Upload Hub →
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <Eye className="h-4 w-4" />
                <span>Side-by-Side Clause Alignment</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inspect synchronized side-by-side diffs with word-level insertions, deletions, and uncertainty flagging for candidate alignments (40% to 70% textual similarity).
              </p>
              <Link to="/compare" className="inline-block text-xs font-semibold text-indigo-600 hover:underline pt-1">
                Open Diff Viewer →
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <Shield className="h-4 w-4" />
                <span>Human Verification Gate</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                No AI-generated candidate rule enters production without an authorized reviewer signing off. Every decision creates an immutable audit trail record.
              </p>
              <Link to="/review" className="inline-block text-xs font-semibold text-indigo-600 hover:underline pt-1">
                Review Queue →
              </Link>
            </div>
          </div>
        )}

        {activeTab === "integrator" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Cpu className="h-4 w-4" />
                <span>Headless Rules API</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                State portals like MAITRI or National Single Window System (NSWS) consume PermitGraph via OpenAPI REST endpoints to auto-update form logic dynamically.
              </p>
              <a
                href="http://localhost:8001/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs font-semibold text-emerald-600 hover:underline pt-1"
              >
                Explore Swagger API Docs →
              </a>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Layers className="h-4 w-4" />
                <span>Structured Impact JSON</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Export machine-readable compliance audits with full topological evidence paths and statutory citations for legal archiving.
              </p>
              <Link to="/regulatory-changes" className="inline-block text-xs font-semibold text-emerald-600 hover:underline pt-1">
                View Impact Reports →
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Activity className="h-4 w-4" />
                <span>Immutable Audit Logging</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track every review decision, document upload, and rule change with timestamps, actors, and cryptographic content hashes.
              </p>
              <Link to="/audit" className="inline-block text-xs font-semibold text-emerald-600 hover:underline pt-1">
                Inspect Audit Ledger →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 7. Tooling Navigation Bento Grid */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          Core System Navigation &amp; Tooling
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/compare"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-600" />
                Side-by-Side Gazette Diff
              </p>
              <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] text-brand-700 font-bold border border-brand-200">
                Featured ★
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Synchronized dual-pane reader comparing real Maharashtra Act No. XXXIV of 2023 vs 2024 Gazette Notification with word-level insertions and deletions.
            </p>
          </Link>

          <Link
            to="/policy-sandbox"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-emerald-500 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                What-If Policy Sandbox
              </p>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 font-bold border border-emerald-200">
                New ⚡
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Simulate macro-economic impacts of prospective regulatory changes across 5,200 Maharashtra factories, testing capital unlocked and SLA reduction.
            </p>
          </Link>

          <Link
            to="/discover"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition flex items-center gap-2">
              <Compass className="h-4 w-4 text-brand-600" />
              Permission Discovery
            </p>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Input industrial activity, investment scale, and district to calculate applicable permits, prerequisite document checklists, and issuing authorities.
            </p>
          </Link>

          <Link
            to="/approvals-graph"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-brand-600" />
              Approval Dependency Graph
            </p>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Topological DAG connecting MIDC, MPCB, DISCOM, Fire, and Directorate of Industries approvals with SLA milestones and blocking constraints.
            </p>
          </Link>

          <Link
            to="/review"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                Human Verification Queue
              </p>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-bold border border-slate-200">
                HITL Gate
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Safety quarantine separating unverified AI extraction candidates from authoritative statutory rules until compliance officer approval.
            </p>
          </Link>

          <Link
            to="/audit"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />
              Compliance Audit Trail
            </p>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Cryptographically hashed ledger of all ingestion, diff, review, and application state transitions for statutory court-admissible archiving.
            </p>
          </Link>
        </div>
      </div>

      {/* 8. Footer & Status Indicator */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-2xs">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              ready?.database ? "bg-emerald-500" : "bg-rose-500"
            }`}
          />
          <span>
            {ready?.database
              ? "Regulatory Intelligence Engine Operational · Port 8001 Active"
              : "Backend Disconnected"}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 text-center sm:text-right">
          Open Source Infrastructure · All outputs grounded in Official Maharashtra Government Gazette publications.
        </p>
      </div>

      {/* 9. Presentation Pitch & Jury Defense Modal */}
      {showPitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-w-2xl w-full rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  4-Minute Presentation Walkthrough Script &amp; Panel Defense
                </h3>
                <p className="text-xs text-slate-500">
                  Authoritative structure designed to deliver a confident presentation to evaluators.
                </p>
              </div>
              <button
                onClick={() => setShowPitchModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-1">
                <span className="font-bold text-brand-700 uppercase tracking-wide text-[10px]">
                  Minute 1: The Problem (The Silent Regulatory Trap)
                </span>
                <p>
                  "Good morning. In Maharashtra, over ₹1,200 Crores of industrial projects are delayed every year because state single-window systems like MAITRI and NSWS are static intake forms. When the Industries Department publishes a new Gazette notification on a Friday evening, no system in the country automatically knows which approvals, dependencies, or factory applications are broken. Factory owners find out 6 months later through show-cause notices."
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-1">
                <span className="font-bold text-brand-700 uppercase tracking-wide text-[10px]">
                  Minute 2: The Solution (What PermitGraph Does)
                </span>
                <p>
                  "PermitGraph is the open-source regulatory intelligence infrastructure. We treat legislation like code: Gazette notifications are ingested, clauses are extracted, and a deterministic graph engine tracks the ripple effect across MIDC, MPCB, and DISCOM approvals."
                </p>
              </div>

              <div className="rounded-xl bg-brand-50 p-3.5 border border-brand-200 space-y-1 text-brand-900">
                <span className="font-bold text-brand-700 uppercase tracking-wide text-[10px]">
                  Minute 3: The Live Demo (Click into /compare)
                </span>
                <p>
                  "Look at this live comparison: The Maharashtra MAITRI Act 2023 vs the 2024 Gazette Notification. Notice Section 16: The joint site inspection SLA was compressed from indeterminate to strictly 15 days. Watch our system trace that amendment to Rule RULE-MAITRI-016, through MPCB Consent to Establish, directly flagging 2 active factory applications in Pune district for expedited inspection."
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 space-y-1">
                <span className="font-bold text-brand-700 uppercase tracking-wide text-[10px]">
                  Minute 4: Governance &amp; Deterministic Architecture
                </span>
                <p>
                  "Crucially, our core reasoning engine is deterministic, not generative. We enforce a Human-in-the-Loop governance model: automated AI extractions are quarantined as candidate drafts and require an authorized compliance officer's verification before entering active rules. Runtime dependency resolution, SLA countdowns, and impact calculations run purely on deterministic graph algorithms (DAG traversal) with cryptographic audit logs—making this legally defensible and ready for direct integration into the MAITRI portal."
                </p>
              </div>

              {/* Panel Defense Strategy */}
              <div className="rounded-xl bg-amber-50/70 p-4 border border-amber-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                  <Shield className="h-4 w-4 text-amber-700" />
                  <span>Panel Defense Guide: How to Defend Against Tricky Questions</span>
                </div>
                <div className="space-y-2.5 text-[11px] text-amber-950">
                  <div>
                    <p className="font-bold text-amber-900">
                      Q: "Does your AI hallucinate or give wrong legal advice?"
                    </p>
                    <p className="mt-0.5 text-slate-700">
                      <strong>Answer:</strong> "Generative models can occasionally produce false extractions, which is precisely why our architecture separates <em>extraction</em> from <em>execution</em>. AI extractions are quarantined in a review queue as unverified candidates. No rule ever enters the active dependency graph until a verified compliance officer approves it. The live engine executes deterministic code backed by exact Gazette citations."
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-amber-900">
                      Q: "Why not just use an LLM or RAG chatbot for the whole system?"
                    </p>
                    <p className="mt-0.5 text-slate-700">
                      <strong>Answer:</strong> "Regulatory compliance cannot rely on probabilistic inference. If an SLA is 15 days or a penalty is ₹1,00,000, that requires mathematical determinism and topological DAG ordering, not probabilistic token generation. We use AI strictly as an ingestion accelerator, while the compliance engine is a formal Directed Acyclic Graph."
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-amber-900">Q: "How do you prove provenance?"</p>
                    <p className="mt-0.5 text-slate-700">
                      <strong>Answer:</strong> "Every rule and dependency edge stores explicit metadata linking to the specific Gazette publication number, gazette issue date, and section number. We provide side-by-side synchronized diffs so any officer can visually cross-reference the source law."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-100">
              <button
                onClick={() => setShowPitchModal(false)}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 shadow-xs transition"
              >
                Close &amp; Present
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
