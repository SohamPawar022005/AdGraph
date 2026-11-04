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
interface SimulationScenario {
  id: string;
  datasetId: string;
  title: string;
  actName: string;
  gazetteCitation: string;
  date: string;
  section: string;
  changeType: "DEADLINE_CHANGE" | "PENALTY_ESCALATION" | "DEEMED_APPROVAL" | "FEE_TIMELINE_REDUCTION" | "AUDIT_DELEGATION";
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
    datasetId: "real-maitri-2023-2024",
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
    datasetId: "real-mid-1961-2012",
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
    datasetId: "real-maitri-2023-2024",
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
  {
    id: "mpcb-auto-consent-2024",
    datasetId: "real-mpcb-consent-2020-2024",
    title: "MPCB 2024 Fast-Track Auto-Renewal & Green/White Self-Certification Slabs",
    actName: "The Water & Air (Prevention & Control of Pollution) Acts (Maharashtra Gazette Scheme)",
    gazetteCitation: "MPCB Order No. MPCB/JD(WPC)/B-240118-FTS-0120 & Environment Dept GR",
    date: "18 January 2024",
    section: "Schedule IV (Categorization, Capital Slabs & 5-Year Auto-Renewal)",
    changeType: "FEE_TIMELINE_REDUCTION",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    oldLawText:
      "Consent to Establish and Operate requires preliminary physical site inspection by Sub-Regional Officer for all units within 120 days. Renewal requires fresh verification.",
    newLawText:
      "Green Category units up to ₹50 Cr investment and White Category units receive instant automated Consent on MAITRI portal without physical inspection. Orange & Red units with continuous online monitoring (OCEMS) get 5-year Auto-Renewal upon fee payment within 30 days.",
    explanation:
      "Zero-Touch Green/White Clearances: Completely eliminates physical licensing bottlenecks for compliant units. Compresses review SLAs from 120 days to 30 days while incentivizing OCEMS IoT telemetry.",
    triggerRule: "RULE-MPCB-2024-AUTO (Green/White Consent Auto-Issuance)",
    primaryApproval: "MPCB-CONSENT-TO-ESTABLISH",
    issuingAuthority: "Maharashtra Pollution Control Board (MPCB)",
    downstreamApprovals: [
      {
        name: "MIDC-BUILDING-PLAN-APPROVAL",
        authority: "MIDC",
        reason: "Environmental prerequisite cleared for factory construction",
      },
      {
        name: "MSEDCL-INDUSTRIAL-POWER",
        authority: "MSEDCL",
        reason: "Power connection energization sanctioned upon CTE receipt",
      },
      {
        name: "FACTORY-LICENSE-DISH",
        authority: "DISH",
        reason: "Operating license review unblocked",
      },
    ],
    affectedBusinesses: [
      {
        name: "Sahyadri Bio-Pharma Synthetics",
        location: "Tarapur MIDC Zone II, Palghar",
        scale: "₹75.0 Cr Investment (Red Category)",
        status: "Auto-Renewal Eligible",
        slaRemaining: "OCEMS Connected · 48h Auto-Grant",
        badgeStyle: "bg-teal-100 text-teal-800 border-teal-300",
      },
      {
        name: "Kalyani Precision Castings",
        location: "Chakan Phase IV, Pune",
        scale: "₹32.0 Cr Investment (Orange Category)",
        status: "Auto-Renewal Active",
        slaRemaining: "5-Year Extension Confirmed",
        badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-300",
      },
    ],
    impactScore: 0.96,
    compareClauseId: "mpcb-cl-1",
  },
  {
    id: "fire-sec-5",
    datasetId: "real-fire-safety-2006-2023",
    title: "Fire NOC Departmental Inspection Exemption for Factory Sheds < 15m",
    actName: "The Maharashtra Fire Prevention and Life Safety Measures Act, 2006",
    gazetteCitation: "Maharashtra Act No. XVIII of 2023 (Official Gazette, 28 April 2023)",
    date: "28 April 2023",
    section: "Section 5(1A) & Section 3(3) (Licensed Agency Self-Certification & Form B)",
    changeType: "AUDIT_DELEGATION",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    oldLawText:
      "The Chief Fire Officer or authorized officer shall inspect the building or premises before issuing the final Fire No-Objection Certificate (NOC) and verify all hydrants physically.",
    newLawText:
      "For low and moderate hazard industrial factory sheds with height not exceeding 15 meters in approved MIDC industrial estates, departmental physical inspection is substituted by verified Form 'A' certificate from an accredited Licensed Agency.",
    explanation:
      "Third-Party Accredited Certification: Replaces departmental inspection queue with private licensed agency audit, cutting Fire NOC cycle time from 60+ days to 7 days for standard factory sheds.",
    triggerRule: "RULE-FIRE-2023-LICENSED (Licensed Agency Audit Substitution)",
    primaryApproval: "FIRE-NO-OBJECTION-CERTIFICATE",
    issuingAuthority: "Maharashtra Fire Services / MIDC Fire Division",
    downstreamApprovals: [
      {
        name: "MIDC-WATER-CONNECTION",
        authority: "MIDC",
        reason: "Water pressure verification satisfied by Form A certification",
      },
      {
        name: "FACTORY-LICENSE-DISH",
        authority: "DISH",
        reason: "Occupancy certificate prerequisite satisfied",
      },
      {
        name: "MPCB-CONSENT-TO-OPERATE",
        authority: "MPCB",
        reason: "Operating consent fire safety clearance fulfilled",
      },
    ],
    affectedBusinesses: [
      {
        name: "Pune Tooling & Fabrication Works",
        location: "Pimpri-Chinchwad MIDC, Pune",
        scale: "₹14.5 Cr Investment",
        status: "Form A Certified",
        slaRemaining: "Deemed Fire NOC Granted",
        badgeStyle: "bg-amber-100 text-amber-800 border-amber-300",
      },
      {
        name: "Aurangabad Auto Components",
        location: "Waluj MIDC, Chhatrapati Sambhajinagar",
        scale: "₹28.0 Cr Investment",
        status: "Licensed Agency Review",
        slaRemaining: "Form B Bi-Annual Audit Filed",
        badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-300",
      },
    ],
    impactScore: 0.93,
    compareClauseId: "fire-sec-5",
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
    unit: "Sahyadri Bio-Pharma Synthetics",
    district: "Palghar (Tarapur MIDC Zone II)",
    permit: "MPCB Consent to Operate (CTO)",
    authority: "MPCB",
    daysElapsed: 28,
    slaLimit: 30,
    status: "CRITICAL_COUNTDOWN",
    trigger: "Auto-Deemed Renewal at Day 30",
    scale: "Red Category Unit (₹75.0 Cr)",
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
    unit: "Kalyani Precision Castings",
    district: "Pune (Chakan Phase IV)",
    permit: "Fire Safety Provisional NOC",
    authority: "Maharashtra Fire Services / MIDC",
    daysElapsed: 19,
    slaLimit: 21,
    status: "EXPEDITED",
    trigger: "Form A Audit Verified · Deemed NOC Due",
    scale: "Orange Category (₹32.0 Cr)",
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
    unit: "Vidarbha Agro Logistics",
    district: "Nagpur (Butibori MIDC)",
    permit: "FSSAI Central State Manufacturing License",
    authority: "FDA Maharashtra",
    daysElapsed: 25,
    slaLimit: 30,
    status: "SCRUTINY",
    trigger: "Joint Sampling Signoff Pending",
    scale: "Agro Unit (₹12.0 Cr)",
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
  const [activeScenarioId, setActiveScenarioId] = useState<string>("maitri-sec-16");
  const [activeTab, setActiveTab] = useState<"investor" | "regulator" | "integrator">("investor");
  const [selectedRadarDistrict, setSelectedRadarDistrict] = useState<string>("all");

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

  const filteredRadarItems =
    selectedRadarDistrict === "all"
      ? DEEMED_RADAR_ITEMS
      : DEEMED_RADAR_ITEMS.filter((item) =>
          item.district.toLowerCase().includes(selectedRadarDistrict.toLowerCase())
        );

  return (
    <div className="space-y-8 pb-16 font-sans antialiased text-slate-800">
      {/* Hero Command Section: Light Sky Blue Theme */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 via-sky-100/80 to-blue-50/70 p-6 sm:p-8 md:p-10 border border-sky-200/90 shadow-[0_4px_24px_rgba(56,189,248,0.12)] space-y-5">
        {/* Subtle decorative sky mesh aura */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-sky-300/25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-blue-200/30 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Automating Industrial Approvals &amp; Gazette Change Intelligence
          </h1>

          <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-3xl font-medium">
            When Maharashtra amends an Act or publishes a Gazette notification, single-window systems stall and businesses face silent compliance traps. 
            <strong className="text-slate-900 font-bold"> PermitGraph</strong> converts statutory law into verified rules-as-code, traverses approval dependencies, and traces the ripple effect to active factory applications before deadlines expire.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/compare"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-sky-600/25 transition-all hover:scale-[1.01]"
            >
              <FileText className="h-4 w-4" />
              <span>Open Side-by-Side Gazette Diff</span>
            </Link>

            <Link
              to="/policy-sandbox"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:scale-[1.01]"
            >
              <Sparkles className="h-4 w-4" />
              <span>What-If Policy Sandbox</span>
            </Link>

            <Link
              to="/approvals-graph"
              className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-sky-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 hover:text-sky-900 transition-all border border-sky-300 shadow-xs"
            >
              <GitBranch className="h-4 w-4 text-sky-600" />
              <span>Explore Dependency DAG</span>
            </Link>

            <Link
              to="/discover"
              className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-sky-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 hover:text-sky-900 transition-all border border-sky-300 shadow-xs"
            >
              <Compass className="h-4 w-4 text-sky-600" />
              <span>Permission Discovery Wizard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. KPI Overview: 4 Metrics Grounded in SQLite Database */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Statutory Acts
            </span>
            <span className="rounded-lg bg-sky-50 p-2 text-sky-700">
              <Scale className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">3 State Acts</p>
          <p className="mt-1 text-xs text-slate-600 font-medium">
            MAITRI Act 2023 · MID Act 1961 · Khadi Act 1960
          </p>
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
          <p className="mt-1 text-xs text-slate-600 font-medium">
            43 Statutory Sections across 6 State Authorities
          </p>
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
          <p className="mt-1 text-xs text-slate-600 font-medium">
            29 Real Gazette Diffs in Side-by-Side Viewer
          </p>
        </div>

        {/* Metric 4: Human-in-the-Loop Governance */}
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
          <p className="mt-1 text-xs text-slate-600 font-medium">
            Quarantined draft rules require compliance officer sign-off
          </p>
        </div>
      </div>

      {/* 3. Regulatory Change Ripple Simulator */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_4px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Live Regulatory Change Ripple Simulator
            </h2>
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

        {/* Segmented Scenario Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SCENARIOS.map((sc) => {
            const isSelected = sc.id === activeScenarioId;
            return (
              <button
                key={sc.id}
                onClick={() => setActiveScenarioId(sc.id)}
                className={`text-left rounded-2xl p-4 border transition-all ${
                  isSelected
                    ? "border-sky-500 bg-sky-50/90 shadow-sm ring-1 ring-sky-400/40"
                    : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${sc.badgeColor}`}
                  >
                    {sc.changeType.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-xs text-slate-500 font-semibold">
                    {sc.section.split(" ")[0]} {sc.section.split(" ")[1]}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                  {sc.title}
                </p>
                <p className="mt-1 text-[11px] text-slate-600 truncate font-mono">
                  {sc.primaryApproval}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Scenario Inspector Workspace */}
        <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-5 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-200/60 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                {scenario.title}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
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
                    to={`/compare?dataset=${scenario.datasetId}&clause=${scenario.compareClauseId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
                  >
                    <span>Inspect Full Side-by-Side Diff ({scenario.section})</span>
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
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
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
                    ? "bg-sky-600 text-white shadow-xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                {d === "all" ? "All Estates" : d}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-sky-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-sky-50/70 border-b border-sky-100 text-[10px] font-bold text-sky-950 uppercase tracking-wider">
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
        <h2 className="mb-3 text-base font-bold text-slate-900 tracking-tight">
          System Navigation &amp; Modules
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/compare"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-brand-500 hover:shadow-md"
          >
            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-600" />
              Side-by-Side Gazette Diff
            </p>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Synchronized dual-pane reader comparing real Maharashtra Act No. XXXIV of 2023 vs 2024 Gazette Notification with word-level insertions and deletions.
            </p>
          </Link>

          <Link
            to="/policy-sandbox"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-emerald-500 hover:shadow-md"
          >
            <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              What-If Policy Sandbox
            </p>
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
            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              Human Verification Queue
            </p>
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

      {/* Footer */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 py-6 border-t border-slate-200">
        <span>PermitGraph · Maharashtra Industrial Regulatory Intelligence Infrastructure</span>
        <span>All outputs grounded in Official Maharashtra Government Gazette publications</span>
      </footer>
    </div>
  );
}
