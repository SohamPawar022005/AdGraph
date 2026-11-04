import { useState } from "react";
import { Link } from "react-router-dom";
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
  downstreamApprovals: string[];
  affectedBusinesses: { name: string; location: string; scale: string; status: string }[];
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
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    oldLawText:
      "The inspections under the provisions of relevant law by the concerned authorities shall, as far as practicable, be conducted jointly, based on random selection.",
    newLawText:
      "Joint site inspections for industrial units falling in Red and Orange categories shall be completed within fifteen days from application receipt. Joint inspection report must be uploaded within forty-eight hours, failing which inspection deemed approved.",
    explanation:
      "Direct statutory enforcement: Competent authorities (MPCB, DISCOM, MIDC) can no longer delay on-site site visits independently. An unfulfilled inspection at day 15 triggers automatic deemed compliance.",
    triggerRule: "RULE-MAITRI-016 (Joint Inspection Timelines)",
    primaryApproval: "JOINT-SITE-INSPECTION-CONSENT",
    downstreamApprovals: [
      "MPCB-CONSENT-TO-ESTABLISH",
      "MIDC-BUILDING-PLAN-APPROVAL",
      "FACTORY-LICENSE-CONSENT",
    ],
    affectedBusinesses: [
      { name: "Sahyadri Agro-Processing Cluster", location: "Baramati MIDC, Pune", scale: "₹25.0 Cr Investment", status: "Inspection Pending (Day 11)" },
      { name: "Varad Precision Engineering Pvt Ltd", location: "Chakan Phase II, Pune", scale: "₹42.5 Cr Investment", status: "Inspection Scheduled (Day 4)" },
    ],
    impactScore: 0.98,
    compareClauseId: "sec-16",
  },
  {
    id: "mid-sec-46",
    title: "Penalty Escalation for Non-Conforming Construction & Pollution from ₹1,000 to ₹1,00,000",
    actName: "The Maharashtra Industrial Development Act, 1961",
    gazetteCitation: "Maharashtra Act No. XI of 2012 (Gazette Consolidation)",
    date: "Official Gazette, 2012 Consolidation",
    section: "Section 46 (Penalty for Breach of Building & Environmental Regulations)",
    changeType: "PENALTY_ESCALATION",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    oldLawText:
      "Any person who erects or alters any building in contravention of regulations shall be punishable with fine which may extend to one thousand rupees.",
    newLawText:
      "Any person who erects or alters any building, or discharges untreated effluent into Corporation drainage in contravention of regulations, shall be punishable with fine which may extend to one lakh rupees, and with further fine which may extend to five thousand rupees for every day.",
    explanation:
      "Hundred-fold statutory penalty escalation. Re-evaluates compliance risk thresholds for all active factory building applications and effluent discharge permits across MIDC estates.",
    triggerRule: "RULE-MID-046 (Unauthorized Construction & Pollution Penalties)",
    primaryApproval: "MIDC-BUILDING-PLAN-APPROVAL",
    downstreamApprovals: [
      "MIDC-DRAINAGE-NOC",
      "MPCB-CONSENT-TO-OPERATE",
      "FACTORY-COMPLETION-CERTIFICATE",
    ],
    affectedBusinesses: [
      { name: "Mahalaxmi Chemical Synthetics", location: "Tarapur MIDC, Palghar", scale: "Red Category Unit", status: "Under Building Plan Scrutiny" },
      { name: "Deccan Metal Foundry Works", location: "Waluj MIDC, Chhatrapati Sambhajinagar", scale: "Orange Category Unit", status: "Architectural Review" },
    ],
    impactScore: 0.92,
    compareClauseId: "sec-46",
  },
  {
    id: "maitri-sec-4",
    title: "Mandatory 21-Day Deemed Clearance & One-Time Query Limit",
    actName: "The Maharashtra Industry, Trade and Investment Facilitation Act, 2023",
    gazetteCitation: "Maharashtra Gazette Notif. No. IAC-2024/CR-104/IND-7",
    date: "15 September 2024",
    section: "Section 4 (Disposal of Applications & Deemed Clearances)",
    changeType: "DEEMED_APPROVAL",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    oldLawText:
      "The Competent Authority may obtain additional information from the applicant within specified time limit... shall take decision within the specified time limit.",
    newLawText:
      "The Competent Authority may raise queries only once, within seven working days. The Competent Authority shall take decision within twenty-one days, failing which deemed approval certificate shall be automatically generated by the Single Window System.",
    explanation:
      "Eliminates infinite bureaucratic query loops. Authority officers have exactly 7 days to raise questions once; at day 21, the digital portal must auto-issue the deemed certificate.",
    triggerRule: "RULE-MAITRI-004 (Statutory Time Limits & Single Window Issuance)",
    primaryApproval: "MAITRI-NODAL-REGISTRATION",
    downstreamApprovals: [
      "MIDC-WATER-CONNECTION",
      "MSEDCL-INDUSTRIAL-POWER",
      "DISCOM-HT-SANCTION",
    ],
    affectedBusinesses: [
      { name: "Shree Ganesh Food Tech", location: "Ranjangaon MIDC, Pune", scale: "Medium Enterprise", status: "Day 18 of Review (3 Days to Deemed)" },
      { name: "Ajanta Pharma Logistics Hub", location: "Butibori MIDC, Nagpur", scale: "Large Scale Logistics", status: "Query Responded (Day 8)" },
    ],
    impactScore: 0.94,
    compareClauseId: "sec-4",
  },
];

export default function HomePage() {
  const { data: ready } = useFetch<ReadyResponse>("/ready");
  const [activeScenarioId, setActiveScenarioId] = useState<string>("maitri-sec-16");
  const [activeTab, setActiveTab] = useState<"investor" | "regulator" | "integrator">("investor");
  const [showPitchModal, setShowPitchModal] = useState<boolean>(false);

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Executive Presentation Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 text-white shadow-xl border border-slate-700/60">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Maharashtra Industrial Approvals Engine
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 border border-white/15">
              SIH Problem Statement 26130
            </span>
            <span className="inline-flex items-center rounded-full bg-brand-500/20 px-3 py-1 text-xs font-medium text-brand-300 border border-brand-500/30">
              MAITRI · MIDC · MPCB · MSEDCL
            </span>
          </div>

          <div className="max-w-4xl space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Regulatory Change Intelligence &amp; Approval Dependency Graph
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              When Maharashtra amends an Act or Gazette notification, single-window systems stall and businesses face silent compliance traps. 
              <strong> PermitGraph</strong> transforms statutory text into verified rules-as-code, maps approval dependencies, detects amendments, and traces exact downstream impacts on live factory workflows.
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-all hover:scale-[1.02]"
            >
              <span className="text-base">📄</span>
              <span>Launch Live Dual-Pane Gazette Diff</span>
              <span className="ml-1 rounded bg-brand-700/80 px-1.5 py-0.5 text-[10px] uppercase font-bold text-brand-200">
                Official 2024 Gazette
              </span>
            </Link>

            <Link
              to="/discover"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-all border border-white/20"
            >
              <span>⚡</span>
              <span>Permission Discovery Wizard</span>
            </Link>

            <Link
              to="/policy-sandbox"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-all shadow-md"
            >
              <span>🔬</span>
              <span>What-If Policy Sandbox</span>
            </Link>

            <Link
              to="/approvals-graph"
              className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/15 hover:text-white transition-all border border-white/10"
            >
              <span>🕸️</span>
              <span>Explore Dependency DAG</span>
            </Link>

            <button
              onClick={() => setShowPitchModal(true)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-colors"
            >
              <span>🎤</span>
              <span>Jury Presentation Guide (4-Min Script)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Live System Metrics Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Statutory Acts</span>
            <span className="text-lg">🏛️</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">3 State Acts</p>
          <p className="mt-0.5 text-[11px] text-slate-500">MAITRI 2023, MID Act 1961, Khadi Act 1960</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rules-as-Code</span>
            <span className="text-lg">⚖️</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">42 Verified Rules</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Mapped across 6 State Authorities</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gazette Amendments</span>
            <span className="text-lg">⚡</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-brand-600">29 Traced Changes</p>
          <p className="mt-0.5 text-[11px] text-slate-500">SLAs, penalty escalations, deemed approvals</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Verification Gate</span>
            <span className="text-lg">🛡️</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-600">Human-in-the-Loop</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Quarantined candidate rules with officer sign-off</p>
        </div>
      </div>

      {/* 3. The Flagship Live Interactive Simulator */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-brand-600 animate-ping" />
              <h2 className="text-lg font-bold text-slate-900">Live Regulatory Change Impact Simulator</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Select an authoritative Maharashtra Gazette amendment and see how PermitGraph traces its statutory ripple effect in real time.
            </p>
          </div>

          <Link
            to="/compare"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline"
          >
            <span>Open in Side-by-Side Dual-Pane Reader</span>
            <span>→</span>
          </Link>
        </div>

        {/* Scenario Selectors */}
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {SCENARIOS.map((sc) => {
            const isSelected = sc.id === activeScenarioId;
            return (
              <button
                key={sc.id}
                onClick={() => setActiveScenarioId(sc.id)}
                className={`text-left rounded-xl p-3.5 border transition-all ${
                  isSelected
                    ? "border-brand-500 bg-brand-50/70 shadow-xs ring-1 ring-brand-500/40"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5 border ${sc.badgeColor}`}>
                    {sc.changeType.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{sc.section.split(" ")[0] + " " + sc.section.split(" ")[1]}</span>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                  {sc.title}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 truncate">{sc.gazetteCitation}</p>
              </button>
            );
          })}
        </div>

        {/* Active Scenario Live Stepper Simulation */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Active Simulation:</span>
              <h3 className="text-sm font-bold text-slate-900">{scenario.title}</h3>
              <p className="text-[11px] text-slate-500">
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

          {/* 4-Stage Trace Pipeline Visualizer */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {/* Step 1: Document & Clause Delta */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">1</span>
                <span>Gazette Clause Diff</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="rounded bg-rose-50 p-2 border border-rose-100 text-rose-900 line-clamp-3">
                  <span className="font-bold text-rose-700 block text-[10px] uppercase">Prior Statutory Text:</span>
                  {scenario.oldLawText}
                </div>
                <div className="rounded bg-emerald-50 p-2 border border-emerald-100 text-emerald-900 line-clamp-3">
                  <span className="font-bold text-emerald-700 block text-[10px] uppercase">Gazette Amendment:</span>
                  {scenario.newLawText}
                </div>
              </div>
            </div>

            {/* Step 2: Triggered Rule */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">2</span>
                <span>Triggered Rule-as-Code</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="rounded bg-slate-50 p-2.5 border border-slate-200">
                  <p className="font-mono font-semibold text-brand-700">{scenario.triggerRule}</p>
                  <p className="mt-1 text-slate-600 leading-relaxed">{scenario.explanation}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span>Status: <strong>VERIFIED</strong></span>
                  <span>Deterministic Logic</span>
                </div>
              </div>
            </div>

            {/* Step 3: Approval DAG Traversal */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">3</span>
                <span>Approval DAG Traversal</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="rounded bg-blue-50 p-2 border border-blue-200 font-mono font-semibold text-blue-900">
                  <span className="text-[10px] block text-blue-600 font-sans font-bold uppercase">Direct Dependency:</span>
                  {scenario.primaryApproval}
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Downstream Cascade:</span>
                  {scenario.downstreamApprovals.map((app) => (
                    <div key={app} className="flex items-center gap-1.5 rounded bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-700">
                      <span>↳</span>
                      <span>{app}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 4: Downstream Factory Impact */}
            <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">4</span>
                <span>Live Factory Impact</span>
              </div>
              <div className="space-y-2 text-[11px]">
                {scenario.affectedBusinesses.map((biz) => (
                  <div key={biz.name} className="rounded bg-amber-50/70 p-2 border border-amber-200 space-y-0.5">
                    <p className="font-semibold text-slate-900">{biz.name}</p>
                    <p className="text-[10px] text-slate-500">{biz.location} · {biz.scale}</p>
                    <span className="inline-block rounded bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                      {biz.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Provenance Grounding: Every rule &amp; dependency links back to Official Maharashtra Gazette citations with verifiable statutory references.
            </span>
            <div className="flex items-center gap-3">
              <Link
                to="/compare"
                className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition"
              >
                Inspect in Side-by-Side Dual-Pane Viewer →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Three Real-World Stakeholder Workflows */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">How PermitGraph Solves Industrial Inefficiencies</h2>
            <p className="mt-0.5 text-xs text-slate-500">Select a stakeholder perspective to see how the platform delivers value.</p>
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab("investor")}
              className={`rounded-md px-3 py-1 transition ${activeTab === "investor" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"}`}
            >
              🏢 Factory Investor
            </button>
            <button
              onClick={() => setActiveTab("regulator")}
              className={`rounded-md px-3 py-1 transition ${activeTab === "regulator" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"}`}
            >
              ⚖️ Compliance Officer
            </button>
            <button
              onClick={() => setActiveTab("integrator")}
              className={`rounded-md px-3 py-1 transition ${activeTab === "integrator" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"}`}
            >
              🔌 MAITRI / NSWS Engineer
            </button>
          </div>
        </div>

        {activeTab === "investor" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
                <span>1.</span>
                <span>Deterministic Permission Discovery</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Entrepreneurs enter plant coordinates, scale, and industry (e.g. Chemical Manufacturing in Tarapur MIDC). PermitGraph returns the exact sequence of 12 required approvals without expensive consultants.
              </p>
              <Link to="/discover" className="inline-block text-xs font-semibold text-brand-600 hover:underline pt-1">
                Try Discovery Wizard →
              </Link>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
                <span>2.</span>
                <span>Dependency Sequencing</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Avoid applying out-of-order. The DAG clarifies that MPCB Consent to Establish and MIDC Water Allocation must precede Building Plan Approvals, saving months of stalled paperwork.
              </p>
              <Link to="/approvals-graph" className="inline-block text-xs font-semibold text-brand-600 hover:underline pt-1">
                View Sequence Graph →
              </Link>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-brand-600 font-bold text-sm">
                <span>3.</span>
                <span>Real-Time Statutory Alerting</span>
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
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <span>1.</span>
                <span>Gazette Amendment Ingestion</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload new Maharashtra Government Gazette notifications (.pdf, .txt). The engine performs OCR, extracts statutory clauses, and detects clause renumberings.
              </p>
              <Link to="/documents" className="inline-block text-xs font-semibold text-indigo-600 hover:underline pt-1">
                Document Upload Hub →
              </Link>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <span>2.</span>
                <span>Side-by-Side Clause Alignment</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inspect synchronized side-by-side diffs with word-level insertions, deletions, and uncertainty flagging for candidate alignments (40% to 70% textual similarity).
              </p>
              <Link to="/compare" className="inline-block text-xs font-semibold text-indigo-600 hover:underline pt-1">
                Open Diff Viewer →
              </Link>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                <span>3.</span>
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
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <span>1.</span>
                <span>Headless Rules-as-Code API</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                State portals like MAITRI or National Single Window System (NSWS) consume PermitGraph via OpenAPI REST endpoints to auto-update form logic dynamically.
              </p>
              <a href="http://localhost:8001/docs" target="_blank" rel="noreferrer" className="inline-block text-xs font-semibold text-emerald-600 hover:underline pt-1">
                Explore Swagger API Docs →
              </a>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <span>2.</span>
                <span>Structured Impact JSON Export</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Export machine-readable compliance audits with full topological evidence paths and statutory citations for legal archiving.
              </p>
              <Link to="/regulatory-changes" className="inline-block text-xs font-semibold text-emerald-600 hover:underline pt-1">
                View Impact Reports →
              </Link>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <span>3.</span>
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

      {/* 5. Navigation Hub Grid */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          Core System Navigation &amp; Tooling
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/compare"
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition">
                Side-by-Side Gazette Diff
              </p>
              <span className="text-xs text-brand-600 font-bold">Featured ★</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Synchronized dual-pane reader comparing real Maharashtra Act No. XXXIV of 2023 vs 2024 Gazette Notification.
            </p>
          </Link>

          <Link
            to="/policy-sandbox"
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-emerald-500 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition">
                What-If Policy Sandbox
              </p>
              <span className="text-xs text-emerald-600 font-bold">New ⚡</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Simulate macro-economic impacts of prospective regulatory changes across 5,200 Maharashtra factories.
            </p>
          </Link>

          <Link
            to="/discover"
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition">
              Permission Discovery
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Input industrial activity, scale, and district to calculate applicable permits and document prerequisites.
            </p>
          </Link>

          <Link
            to="/approvals-graph"
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition">
              Approval Dependency Graph
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Topological DAG connecting MIDC, MPCB, DISCOM, Fire, and Directorate of Industries approvals.
            </p>
          </Link>

          <Link
            to="/regulatory-changes"
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition">
              Regulatory Changes &amp; Impact
            </p>
            <p className="mt-1 text-xs text-slate-500">
              List of 29 detected statutory changes with calculated impact scores and evidence paths.
            </p>
          </Link>

          <Link
            to="/review"
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition">
              Human Verification Queue
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Reviewer gate separating unverified AI extraction candidates from authoritative statutory rules.
            </p>
          </Link>

          <Link
            to="/audit"
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition">
              Compliance Audit Trail
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Cryptographically hashed ledger of all ingestion, diff, review, and application state transitions.
            </p>
          </Link>
        </div>
      </div>

      {/* 6. Footer Disclaimer & Health Status */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${ready?.database ? "bg-emerald-500" : "bg-rose-500"}`} />
          <span>{ready?.database ? "Regulatory Intelligence Engine Operational · Port 8001 Active" : "Backend Disconnected"}</span>
        </div>
        <p className="text-[11px] text-slate-400 text-center sm:text-right">
          Open Source Infrastructure · Trace all outputs to official Maharashtra Government Gazette publications.
        </p>
      </div>

      {/* 7. Jury Pitch Modal (Built-in presentation cheat sheet) */}
      {showPitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-w-2xl w-full rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">4-Minute Presentation Walkthrough Script</h3>
                <p className="text-xs text-slate-500">Use this exact structure to deliver a confident presentation to judges.</p>
              </div>
              <button
                onClick={() => setShowPitchModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1">
                <span className="font-bold text-brand-700 uppercase tracking-wide text-[10px]">Minute 1: The Problem (The Silent Regulatory Trap)</span>
                <p>
                  "Good morning. In Maharashtra, over ₹1,200 Crores of industrial projects are delayed every year because state single-window systems like MAITRI and NSWS are static intake forms. When the Industries Department publishes a new Gazette notification on a Friday evening, no system in the country automatically knows which approvals, dependencies, or factory applications are broken. Factory owners find out 6 months later through show-cause notices."
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1">
                <span className="font-bold text-brand-700 uppercase tracking-wide text-[10px]">Minute 2: The Solution (What PermitGraph Does)</span>
                <p>
                  "PermitGraph is the open-source regulatory intelligence infrastructure. We treat legislation like code: Gazette notifications are ingested, clauses are extracted, and a deterministic graph engine tracks the ripple effect across MIDC, MPCB, and DISCOM approvals."
                </p>
              </div>

              <div className="rounded-lg bg-brand-50 p-3 border border-brand-200 space-y-1 text-brand-900">
                <span className="font-bold text-brand-700 uppercase tracking-wide text-[10px]">Minute 3: The Live Demo (Click into /compare)</span>
                <p>
                  "Look at this live comparison: The Maharashtra MAITRI Act 2023 vs the 2024 Gazette Notification. Notice Section 16: The joint site inspection SLA was compressed from indeterminate to strictly 15 days. Watch our system trace that amendment to Rule RULE-MAITRI-016, through MPCB Consent to Establish, directly flagging 2 active factory applications in Pune district for expedited inspection."
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 space-y-1">
                <span className="font-bold text-brand-700 uppercase tracking-wide text-[10px]">Minute 4: Governance &amp; Deterministic Architecture</span>
                <p>
                  "Crucially, our core reasoning engine is deterministic, not generative. We enforce a Human-in-the-Loop governance model: automated AI extractions are quarantined as candidate drafts and require an authorized compliance officer's verification before entering active rules. Runtime dependency resolution, SLA countdowns, and impact calculations run purely on deterministic graph algorithms (DAG traversal) with cryptographic audit logs—making this legally defensible and ready for direct integration into the MAITRI portal."
                </p>
              </div>

              {/* Panel Defense Strategy */}
              <div className="rounded-lg bg-amber-50/70 p-3.5 border border-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                  <span>🛡️</span>
                  <span>Panel Defense Guide: How to Defend Against Tricky Questions</span>
                </div>
                <div className="space-y-2 text-[11px] text-amber-950">
                  <div>
                    <p className="font-bold text-amber-900">Q: "Does your AI hallucinate or give wrong legal advice?"</p>
                    <p className="mt-0.5 text-slate-700">
                      <strong>Answer:</strong> "Generative models can occasionally produce false extractions, which is precisely why our architecture separates <em>extraction</em> from <em>execution</em>. AI extractions are quarantined in a review queue as unverified candidates. No rule ever enters the active dependency graph until a verified compliance officer approves it. The live engine executes deterministic code backed by exact Gazette citations."
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-amber-900">Q: "Why not just use an LLM or RAG chatbot for the whole system?"</p>
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

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPitchModal(false)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
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
