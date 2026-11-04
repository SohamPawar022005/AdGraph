import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorNotice } from "../components/Loading";

interface DistrictStat {
  district: string;
  units: number;
  capital_cr: number;
}

interface SampleUnit {
  id: string;
  name: string;
  district: string;
  industry: string;
  investment_cr: number;
  approval_id: string;
  state: string;
}

interface PolicySimulationResult {
  policy_type: string;
  title: string;
  statutory_citation: string;
  total_units_impacted: number;
  capital_accelerated_crores: number;
  average_days_saved_per_unit: number;
  total_mandays_saved: number;
  backlog_reduction_percent: number;
  district_distribution: DistrictStat[];
  sample_affected_units: SampleUnit[];
  statutory_claim_template: string;
}

const POLICY_PRESETS = [
  {
    id: "sla_reduction",
    name: "⚡ 15-Day Joint Inspection SLA",
    section: "MAITRI Act 2023 · Section 16",
    days: 15,
    tag: "Ease of Doing Business",
    description: "Compress on-site inspection timeline for Red & Orange category units from 30 days to strictly 15 days.",
  },
  {
    id: "deemed_approval",
    name: "📜 21-Day Mandatory Deemed Clearance",
    section: "MAITRI Act 2023 · Section 4",
    days: 21,
    tag: "Red-Tape Buster",
    description: "Require single-window system to automatically issue clearance certificates if authority takes over 21 days.",
  },
  {
    id: "fee_waiver",
    name: "🌸 MSME & Women-Led Unit Fee Exemption",
    section: "MAITRI Act 2023 · Section 19",
    days: 7,
    tag: "Inclusive Growth",
    description: "Provide 100% concession on single-window processing fees for registered micro enterprises and women entrepreneurs.",
  },
  {
    id: "penalty_escalation",
    name: "⚖️ 100x Effluent Pollution Penalty",
    section: "MID Act 1961 · Section 46",
    days: 30,
    tag: "Environmental Compliance",
    description: "Escalate penalties for illegal industrial effluent discharge into MIDC drainage from ₹1,000 to ₹1,00,000.",
  },
];

export default function PolicySandboxPage() {
  const [selectedPolicy, setSelectedPolicy] = useState<string>("sla_reduction");
  const [timelineDays, setTimelineDays] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PolicySimulationResult | null>(null);
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  async function runSimulation(policyType = selectedPolicy, days = timelineDays) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<PolicySimulationResult>("/api/v1/impact/policy-simulation", {
        policy_type: policyType,
        target_timeline_days: days,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Policy simulation failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSimulation("sla_reduction", 15);
  }, []);

  function handlePresetClick(p: (typeof POLICY_PRESETS)[0]) {
    setSelectedPolicy(p.id);
    setTimelineDays(p.days);
    runSimulation(p.id, p.days);
  }

  function copyNoticeText() {
    if (!result?.statutory_claim_template) return;
    navigator.clipboard.writeText(result.statutory_claim_template);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700">
              Prospective Intelligence
            </span>
            <span className="text-xs text-slate-500">Government of Maharashtra Policy Engine</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">
            What-If Regulatory Policy Sandbox &amp; Economic Simulator
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
            Simulate the economic and pipeline impact of proposed statutory amendments across Maharashtra's 5,200 industrial undertakings in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/compare"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            ← Dual-Pane Gazette Diff
          </Link>
          <button
            onClick={() => setShowClaimModal(true)}
            disabled={!result}
            className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>📜</span>
            <span>Generate Deemed Notice</span>
          </button>
        </div>
      </div>

      {/* Preset Policy Levers */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Select Statutory Policy Lever to Simulate:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {POLICY_PRESETS.map((p) => {
            const isSelected = selectedPolicy === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handlePresetClick(p)}
                className={`text-left rounded-xl p-3.5 border transition-all ${
                  isSelected
                    ? "border-brand-500 bg-brand-50/80 shadow-xs ring-1 ring-brand-500/30"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider rounded bg-white px-2 py-0.5 border border-slate-200 text-slate-700">
                    {p.tag}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-brand-600">{p.days}d SLA</span>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-900 leading-snug">{p.name}</p>
                <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{p.description}</p>
                <p className="mt-2 text-[10px] font-medium text-slate-400 border-t border-slate-100 pt-1.5">{p.section}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline Slider & Filter Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Adjust Target Statutory Timeline SLA:</span>
            <span className="font-mono font-bold text-brand-600 text-sm">{timelineDays} Calendar Days</span>
          </div>
          <input
            type="range"
            min={5}
            max={45}
            step={1}
            value={timelineDays}
            onChange={(e) => setTimelineDays(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>5 Days (Ultra Fast-Track)</span>
            <span>15 Days (IAC-2024 SLA)</span>
            <span>30 Days (Standard)</span>
            <span>45 Days (Legacy)</span>
          </div>
        </div>

        <button
          onClick={() => runSimulation(selectedPolicy, timelineDays)}
          disabled={loading}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-700 shadow-md transition disabled:opacity-50 shrink-0 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Computing Macro Closures…</span>
          ) : (
            <>
              <span>⚡</span>
              <span>Re-Run Simulation</span>
            </>
          )}
        </button>
      </div>

      {error && <ErrorNotice message={error} />}

      {/* Simulation Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Statutory Grounding Banner */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-blue-900 block">{result.title}</span>
              <span className="text-blue-700 text-[11px]">{result.statutory_citation}</span>
            </div>
            <span className="rounded bg-blue-200/80 px-2.5 py-1 text-[11px] font-bold text-blue-950 shrink-0 self-start sm:self-auto">
              Backed by Live Database Closures
            </span>
          </div>

          {/* 4 Macro KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Capital Accelerated</span>
              <p className="mt-1 text-2xl font-black text-brand-600">
                ₹{result.capital_accelerated_crores.toLocaleString()} <span className="text-sm font-bold text-slate-500">Cr</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Industrial investment in pipeline</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Manufacturing Units</span>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {result.total_units_impacted.toLocaleString()} <span className="text-sm font-bold text-slate-500">Units</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Active pending applications affected</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Time Saved per Factory</span>
              <p className="mt-1 text-2xl font-black text-emerald-600">
                {result.average_days_saved_per_unit} <span className="text-sm font-bold text-slate-500">Days</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Total {result.total_mandays_saved.toLocaleString()} man-days saved
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Queue Reduction</span>
              <p className="mt-1 text-2xl font-black text-indigo-600">
                {result.backlog_reduction_percent}% <span className="text-sm font-bold text-slate-500">Faster</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Departmental backlog clearance rate</p>
            </div>
          </div>

          {/* District Distribution & Sample Units Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: District Distribution Progress Bars */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900">Top Impacted Industrial Districts</h3>
                <span className="text-xs text-slate-400">Maharashtra Corridors</span>
              </div>

              <div className="space-y-3">
                {result.district_distribution.map((d) => {
                  const maxUnits = result.district_distribution[0]?.units || 1;
                  const pct = (d.units / maxUnits) * 100;
                  return (
                    <div key={d.district} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{d.district}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500">{d.units} units</span>
                          <span className="font-mono font-bold text-brand-700">₹{d.capital_cr} Cr</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Real Sample Factory Units */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900">Sample Active Industrial Units Accelerated</h3>
                <span className="text-xs text-slate-400">Live Database Records</span>
              </div>

              <div className="space-y-2">
                {result.sample_affected_units.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 flex items-center justify-between gap-2 hover:bg-slate-100 transition"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">{u.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {u.district} · {u.industry} · <span className="font-semibold text-slate-700">{u.approval_id}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-xs text-brand-700">₹{u.investment_cr} Cr</p>
                      <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 uppercase">
                        {u.state.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statutory Deemed Approval Notice Modal */}
      {showClaimModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-w-2xl w-full rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Statutory Deemed Approval Claim Notice</h3>
                <p className="text-xs text-slate-500">
                  Ready-to-serve legal demand notice citing Section 16(3) &amp; Section 4(3) of Maharashtra Act No. XXXIV of 2023.
                </p>
              </div>
              <button
                onClick={() => setShowClaimModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-[11px] text-slate-800 leading-relaxed overflow-x-auto">
              {result.statutory_claim_template}
            </pre>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Investors can submit this formal notice when authority SLAs lapse.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyNoticeText}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 flex items-center gap-1.5"
                >
                  {copiedNotice ? "✓ Copied to Clipboard!" : "Copy Legal Notice"}
                </button>
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
