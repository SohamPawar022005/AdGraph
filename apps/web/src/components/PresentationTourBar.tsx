import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface TourStep {
  step: number;
  title: string;
  route: string;
  talkingPoint: string;
  actionHint: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    title: "1. Executive Command Center",
    route: "/",
    talkingPoint:
      "Start here: State single-window portals are static form-fillers. Over ₹1,200 Cr is delayed annually in Maharashtra because no system tracks Gazette amendments automatically.",
    actionHint: "Click Scenario 1 (Section 16) in the Live Simulator to show the 4-stage pipeline.",
  },
  {
    step: 2,
    title: "2. Dual-Pane Gazette Diff",
    route: "/compare",
    talkingPoint:
      "Look at the official Gazette mirror: MAITRI Act 2023 vs 2024 Gazette Notification. Section 16 compresses joint inspections to strictly 15 days with deemed compliance.",
    actionHint: "Scroll mouse wheel to demonstrate butter-smooth hardware-accelerated sync.",
  },
  {
    step: 3,
    title: "3. Approval Dependency DAG",
    route: "/approvals-graph",
    talkingPoint:
      "PermitGraph maps inter-departmental dependencies across MIDC, MPCB, DISCOM, and MAITRI into a topological DAG, preventing investors from applying out-of-order.",
    actionHint: "Click Consent to Establish to inspect upstream prerequisites & blocked permits.",
  },
  {
    step: 4,
    title: "4. What-If Policy Sandbox",
    route: "/policy-sandbox",
    talkingPoint:
      "Our economic policy simulator queries 5,200 Maharashtra factories to show that a 15-day SLA accelerates ₹23,834 Crores of capital and saves 11,100 man-days.",
    actionHint: "Click 'Generate Deemed Notice' to show the legal demand notice under Section 16(3).",
  },
  {
    step: 5,
    title: "5. Human Verification Gate",
    route: "/review",
    talkingPoint:
      "Zero Legal Hallucination: AI only assists with candidate extraction. Every statutory rule must be approved or edited by an authorized reviewer with audit logs.",
    actionHint: "Show the Review Queue and the mandatory audit reason requirement on human edits.",
  },
];

export default function PresentationTourBar() {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Find current step based on location.pathname
  const currentStepIdx = TOUR_STEPS.findIndex((s) => s.route === location.pathname);
  const activeStep = currentStepIdx >= 0 ? TOUR_STEPS[currentStepIdx] : TOUR_STEPS[0];

  function goToStep(idx: number) {
    const s = TOUR_STEPS[idx];
    if (s) {
      navigate(s.route);
    }
  }

  return (
    <aside aria-label="Presentation walkthrough controller" className="fixed bottom-4 right-4 z-50 max-w-xl w-full px-4 pointer-events-none">
      <div className="pointer-events-auto rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all">
        {/* Minimized Pill */}
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 text-xs font-bold text-amber-300 hover:text-white"
          >
            <span>🎤</span>
            <span>Presentation Mode Active: Step {activeStep.step}/5 ({activeStep.title})</span>
            <span className="text-[10px] text-slate-400 underline ml-1">Expand</span>
          </button>
        ) : (
          <div className="space-y-3">
            {/* Top Bar with Step Navigator */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  🎤 4-Min Presentation Controller
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  Step {activeStep.step} of 5
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {TOUR_STEPS.map((s, i) => (
                    <button
                      key={s.step}
                      onClick={() => goToStep(i)}
                      title={s.title}
                      className={`h-2 w-6 rounded-full transition ${
                        s.step === activeStep.step
                          ? "bg-amber-400"
                          : "bg-slate-700 hover:bg-slate-500"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white text-xs ml-2"
                >
                  Minimize ✕
                </button>
              </div>
            </div>

            {/* Speaking Script & Action Hint */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{activeStep.title}</span>
                <span className="rounded bg-brand-500/20 px-2 py-0.5 text-[10px] text-brand-300 border border-brand-500/30">
                  {activeStep.route}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                <strong className="text-amber-300">Say:</strong> "{activeStep.talkingPoint}"
              </p>
              <div className="rounded-lg bg-slate-800/80 px-2.5 py-1 text-[11px] text-emerald-300 border border-slate-700">
                <strong>Action:</strong> {activeStep.actionHint}
              </div>
            </div>

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
              <button
                disabled={activeStep.step <= 1}
                onClick={() => goToStep(activeStep.step - 2)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition"
              >
                ← Prev Step
              </button>

              <button
                disabled={activeStep.step >= 5}
                onClick={() => goToStep(activeStep.step)}
                className="rounded-lg bg-brand-600 px-4 py-1.5 font-bold text-white hover:bg-brand-500 disabled:opacity-30 transition flex items-center gap-1.5 shadow-md"
              >
                <span>Next Step →</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
