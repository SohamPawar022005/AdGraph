import { useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFetch } from '../lib/useFetch';
import { api } from '../lib/api';
import type { BusinessProfile } from '../lib/types';
import {
  type ComplianceChecklist,
  type TaskState,
  transformGraphToTasks,
  recalculateChecklistStates,
  validateUploadedDocument,
  simulateDocumentUpload,
  getChecklistMetrics,
} from '../lib/complianceChecklist';
import DocumentIntelligenceCard from '../components/DocumentIntelligenceCard';
import { ErrorNotice, Loading } from '../components/Loading';

interface GraphResponse {
  nodes: { id: string; label: string; kind: string; metadata?: Record<string, unknown> }[];
  edges: { source: string; target: string; relation: string; is_synthetic: boolean }[];
  has_cycle: boolean;
}

interface BusinessListResponse {
  total: number;
  items: BusinessProfile[];
}

export default function ComplianceChecklistPage() {
  const [searchParams] = useSearchParams();
  const businessIdParam = searchParams.get('businessId') || 'biz-default-01';

  // Fetch approval graph
  const { data: graphData, loading: graphLoading, error: graphError } =
    useFetch<GraphResponse>('/api/v1/approvals/graph');

  // Fetch business profiles for switcher
  const { data: businessesData } = useFetch<BusinessListResponse>('/api/v1/businesses?limit=20');

  // Active business profile
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(businessIdParam);
  const selectedBusiness = businessesData?.items.find((b) => b.id === selectedBusinessId);
  const entityName = selectedBusiness?.name || 'Apex Agro-Processing & Packaging Pvt Ltd';

const DEFAULT_FALLBACK_NODES = [
  { id: 'single-window-application', label: 'Single Window Common Application (MAITRI)', kind: 'approval' },
  { id: 'consent-to-establish', label: 'Consent to Establish (Pollution Control Board)', kind: 'approval' },
  { id: 'consent-to-operate', label: 'Consent to Operate (Pollution Control Board)', kind: 'approval' },
  { id: 'factory-license', label: 'Factory License (Directorate of Industrial Safety & Health)', kind: 'approval' },
  { id: 'fire-noc', label: 'Provisional Fire Safety No-Objection Certificate (NOC)', kind: 'approval' },
  { id: 'midc-plot-allotment', label: 'MIDC Industrial Plot Allotment & Possession', kind: 'approval' },
  { id: 'labour-registration', label: 'Contract Labour Registration Certificate', kind: 'approval' },
  { id: 'joint-inspection-scheduling', label: 'Joint / Rationalised Inspection Scheduling', kind: 'approval' },
];

const DEFAULT_FALLBACK_EDGES = [
  { source: 'consent-to-establish', target: 'single-window-application', relation: 'requires', is_synthetic: false },
  { source: 'factory-license', target: 'consent-to-establish', relation: 'requires', is_synthetic: false },
  { source: 'consent-to-operate', target: 'consent-to-establish', relation: 'requires', is_synthetic: false },
  { source: 'consent-to-operate', target: 'factory-license', relation: 'requires', is_synthetic: false },
];

  // Initial checklist derived from graph
  const initialChecklist = useMemo(() => {
    const nodes = graphData?.nodes && graphData.nodes.length > 0 ? graphData.nodes : DEFAULT_FALLBACK_NODES;
    const edges = graphData?.edges && graphData.edges.length > 0 ? graphData.edges : DEFAULT_FALLBACK_EDGES;
    const initialTasks = transformGraphToTasks(nodes, edges);
    return recalculateChecklistStates({
      businessProfileId: selectedBusinessId,
      tasks: initialTasks,
      overallReadinessScore: 0,
    });
  }, [graphData, selectedBusinessId]);

  // Checklist state override when user uploads or mutates tasks
  const [checklistOverride, setChecklist] = useState<ComplianceChecklist | null>(null);
  const checklist = checklistOverride ?? initialChecklist;

  // UI Filter state: All | Ready to Apply | In Progress | Blocked
  const [filterState, setFilterState] = useState<'ALL' | TaskState>('ALL');

  // Expanded task accordions (default open first approvals)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    () => new Set(['consent-to-establish', 'single-window-application'])
  );

  // Uploading status per doc slot
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  // Hidden file input ref for real file uploads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadSlot, setActiveUploadSlot] = useState<{
    taskIndex: number;
    docIndex: number;
  } | null>(null);

  // Toggle accordion expansion
  const toggleExpand = (approvalId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(approvalId)) {
        next.delete(approvalId);
      } else {
        next.add(approvalId);
      }
      return next;
    });
  };

  // Expand all / Collapse all
  const toggleAll = (expand: boolean) => {
    if (!checklist) return;
    if (expand) {
      setExpandedTasks(new Set(checklist.tasks.map((t) => t.approvalId)));
    } else {
      setExpandedTasks(new Set());
    }
  };

  // Target date modification
  const handleDateChange = (taskIndex: number, newDate: string) => {
    if (!checklist) return;
    const updatedTasks = [...checklist.tasks];
    updatedTasks[taskIndex].targetDate = newDate;
    setChecklist({ ...checklist, tasks: updatedTasks });
  };

  // Real file upload trigger
  const triggerFileUpload = (taskIndex: number, docIndex: number) => {
    setActiveUploadSlot({ taskIndex, docIndex });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Process chosen file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadSlot || !checklist) return;

    const { taskIndex, docIndex } = activeUploadSlot;
    const task = checklist.tasks[taskIndex];
    const docSlot = task.requiredDocuments[docIndex];

    setUploadingDocId(docSlot.docId);

    try {
      // Simulate / perform Document Intelligence extraction & verification
      const validated = validateUploadedDocument(
        docSlot,
        {
          name: file.name,
          size: file.size,
        },
        {
          businessProfileName: entityName,
          businessProfileId: selectedBusinessId,
        }
      );

      // Attempt optional backend upload to sync with Document Engine if reachable
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('document_type', validated.extractedFields?.document_type as string || 'processing_fee_receipt');
        form.append('business_profile_id', selectedBusinessId);
        await api.postForm('/api/v1/documents/upload', form);
      } catch {
        // Backend upload failure is gracefully absorbed; verification engine remains authoritative
      }

      const updatedTasks = [...checklist.tasks];
      updatedTasks[taskIndex].requiredDocuments[docIndex] = validated;

      const nextChecklist = recalculateChecklistStates({
        ...checklist,
        tasks: updatedTasks,
      });

      setChecklist(nextChecklist);
    } finally {
      setUploadingDocId(null);
      setActiveUploadSlot(null);
    }
  };

  // Run simulation scenario on a document requirement slot
  const handleSimulateScenario = (
    taskIndex: number,
    docIndex: number,
    scenario: 'valid' | 'expired' | 'name_mismatch' | 'missing_signature' | 'warning_expiring_soon'
  ) => {
    if (!checklist) return;
    const updatedTasks = [...checklist.tasks];
    const currentSlot = updatedTasks[taskIndex].requiredDocuments[docIndex];

    const simulated = simulateDocumentUpload(currentSlot, scenario, entityName);
    updatedTasks[taskIndex].requiredDocuments[docIndex] = simulated;

    const nextChecklist = recalculateChecklistStates({
      ...checklist,
      tasks: updatedTasks,
    });

    setChecklist(nextChecklist);
  };

  // Reset a document slot back to MISSING
  const handleClearDocument = (taskIndex: number, docIndex: number) => {
    if (!checklist) return;
    const updatedTasks = [...checklist.tasks];
    const currentSlot = updatedTasks[taskIndex].requiredDocuments[docIndex];

    updatedTasks[taskIndex].requiredDocuments[docIndex] = {
      ...currentSlot,
      uploadedFileId: undefined,
      validationStatus: 'MISSING',
      extractedFields: undefined,
      validationIssues: undefined,
    };

    const nextChecklist = recalculateChecklistStates({
      ...checklist,
      tasks: updatedTasks,
    });

    setChecklist(nextChecklist);
  };

  // One-click Auto-Clearance (simulate complete pass for all approvals)
  const handleSimulateAllValid = () => {
    if (!checklist) return;
    const updatedTasks = checklist.tasks.map((task) => ({
      ...task,
      requiredDocuments: task.requiredDocuments.map((doc) =>
        simulateDocumentUpload(doc, 'valid', entityName)
      ),
    }));

    const nextChecklist = recalculateChecklistStates({
      ...checklist,
      tasks: updatedTasks,
    });

    setChecklist(nextChecklist);
  };

  // Reset entire checklist
  const handleResetChecklist = () => {
    if (!graphData) return;
    const initialTasks = transformGraphToTasks(graphData.nodes, graphData.edges);
    setChecklist(
      recalculateChecklistStates({
        businessProfileId: selectedBusinessId,
        tasks: initialTasks,
        overallReadinessScore: 0,
      })
    );
  };

  // Export JSON checklist
  const handleExportJson = () => {
    if (!checklist) return;
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(checklist, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `permitgraph-compliance-checklist-${selectedBusinessId}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Metrics computation
  const metrics = useMemo(() => {
    if (!checklist) return null;
    return getChecklistMetrics(checklist.tasks);
  }, [checklist]);

  // Filtered task rows
  const filteredTasks = useMemo(() => {
    if (!checklist) return [];
    if (filterState === 'ALL') return checklist.tasks;
    return checklist.tasks.filter((t) => t.status === filterState);
  }, [checklist, filterState]);

  // Task map for finding blocking prerequisite titles
  const taskTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    checklist?.tasks.forEach((t) => map.set(t.approvalId, t.title));
    return map;
  }, [checklist]);

  if (graphLoading) return <Loading />;
  if (graphError) return <ErrorNotice message={graphError} />;
  if (!checklist || !metrics) return null;

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* Hidden real file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.txt,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* HEADER PANEL: Summary Bar, Dynamic Progress Bar, Filter Chips & Export Actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-700/10">
                Smart Compliance Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Profile ID: {selectedBusinessId}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Smart Compliance Checklist
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span>
                Applying Entity:{' '}
                <span className="font-semibold text-slate-800">{entityName}</span>
              </span>
              {businessesData?.items && businessesData.items.length > 0 && (
                <div className="flex items-center space-x-1.5 print:hidden">
                  <span className="text-[11px] text-slate-400">Switch:</span>
                  <select
                    value={selectedBusinessId}
                    onChange={(e) => setSelectedBusinessId(e.target.value)}
                    className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 focus:border-brand-500 focus:outline-hidden"
                  >
                    {businessesData.items.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.industry})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons (hidden in print) */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Quick Test / Auto-Clearance */}
            <button
              onClick={handleSimulateAllValid}
              title="Automatically upload valid documents for all approvals"
              className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Auto-Validate All (100%)
            </button>

            {/* Reset Checklist */}
            <button
              onClick={handleResetChecklist}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Reset
            </button>

            {/* Export JSON */}
            <button
              onClick={handleExportJson}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <svg className="mr-1.5 h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export JSON
            </button>

            {/* Print Summary */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
            >
              <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / PDF
            </button>
          </div>
        </div>

        {/* Dynamic Progress Bar & Live Readiness Metrics */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4 items-center">
          <div className="lg:col-span-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Overall Application Readiness Progress
              </span>
              <span className="font-mono font-bold text-brand-700 text-sm">
                {metrics.percentage}% READY
              </span>
            </div>
            {/* Dynamic visual progress bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  metrics.percentage === 100
                    ? 'bg-emerald-500'
                    : metrics.percentage > 40
                    ? 'bg-brand-600'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${metrics.percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Prerequisites & Document Validation Enforced</span>
              <span>
                {metrics.validDocs} of {metrics.totalDocs} mandatory documents verified
              </span>
            </div>
          </div>

          {/* Visual Counter showing 'X of Y Approvals Cleared' */}
          <div className="rounded-lg border border-slate-200/90 bg-slate-50 p-3 text-center">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Readiness Status
            </span>
            <span className="text-xl font-extrabold text-slate-900">
              {metrics.ready} of {metrics.total}
            </span>
            <span className="block text-[11px] font-medium text-emerald-700">
              Approvals Cleared
            </span>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 print:hidden">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-slate-500">Filter Tasks:</span>
            <button
              onClick={() => setFilterState('ALL')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filterState === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({metrics.total})
            </button>
            <button
              onClick={() => setFilterState('READY_TO_APPLY')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filterState === 'READY_TO_APPLY'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Ready to Apply ({metrics.ready})
            </button>
            <button
              onClick={() => setFilterState('IN_PROGRESS')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filterState === 'IN_PROGRESS'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              In Progress ({metrics.inProgress})
            </button>
            <button
              onClick={() => setFilterState('BLOCKED')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filterState === 'BLOCKED'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Blocked ({metrics.blocked})
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => toggleAll(true)}
              className="text-brand-600 hover:text-brand-800 font-medium"
            >
              Expand All
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => toggleAll(false)}
              className="text-slate-500 hover:text-slate-700 font-medium"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* CHECKLIST TASK ROWS (Accordion / Expandable Table) */}
      <div className="space-y-3">
        {filteredTasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No compliance tasks match the selected filter.
          </div>
        )}

        {filteredTasks.map((task) => {
          const taskIndex = checklist.tasks.findIndex((t) => t.approvalId === task.approvalId);
          const isExpanded = expandedTasks.has(task.approvalId);
          const isBlocked = task.status === 'BLOCKED';
          const isReady = task.status === 'READY_TO_APPLY';
          const isInProgress = task.status === 'IN_PROGRESS';
          const isNotStarted = task.status === 'NOT_STARTED';

          // Determine which prerequisite approvals are pending
          const pendingPrereqs = task.prerequisiteApprovalIds
            .map((pId) => {
              const pTask = checklist.tasks.find((t) => t.approvalId === pId);
              return {
                id: pId,
                title: pTask ? pTask.title : taskTitleMap.get(pId) || pId,
                isReady: pTask?.status === 'READY_TO_APPLY',
              };
            })
            .filter((p) => !p.isReady);

          return (
            <div
              key={task.approvalId}
              className={`rounded-lg border bg-white transition-all shadow-xs overflow-hidden ${
                isReady
                  ? 'border-emerald-200'
                  : isBlocked
                  ? 'border-red-200'
                  : isInProgress
                  ? 'border-amber-200'
                  : 'border-slate-200'
              }`}
            >
              {/* COLLAPSED ROW (Interactive Accordion Header) */}
              <div
                onClick={() => toggleExpand(task.approvalId)}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between cursor-pointer select-none hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  {/* Chevron Icon */}
                  <span
                    className={`mt-0.5 transform text-slate-400 transition-transform duration-200 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  >
                    ▶
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{task.title}</h3>
                      {/* Department Badge */}
                      <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {task.authority}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-slate-500 font-mono">
                      Statutory Citation: {task.actsOrRulesRef}
                    </p>
                  </div>
                </div>

                {/* Right controls: Due date picker & Status badge */}
                <div className="flex items-center space-x-3 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                  {/* Due Date Picker */}
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                    <span className="text-[11px] font-medium text-slate-400">Target Date:</span>
                    <input
                      type="date"
                      value={task.targetDate || ''}
                      onChange={(e) => handleDateChange(taskIndex, e.target.value)}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-brand-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Status Badge */}
                  {isReady && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      ● READY TO APPLY
                    </span>
                  )}
                  {isInProgress && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      ◐ IN PROGRESS
                    </span>
                  )}
                  {isBlocked && (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                      ⛔ BLOCKED
                    </span>
                  )}
                  {isNotStarted && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      ○ NOT STARTED
                    </span>
                  )}
                </div>
              </div>

              {/* EXPANDED VIEW */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4">
                  {/* Prerequisite Status Alert */}
                  {isBlocked && pendingPrereqs.length > 0 && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                      <div className="flex items-start space-x-2">
                        <span className="font-bold text-base shrink-0">⚠️</span>
                        <div>
                          <p className="font-bold">Prerequisite Approval Pending (Task Blocked)</p>
                          <p className="mt-0.5">
                            Under statutory guidelines, this application cannot be filed until the following prerequisite approvals reach{' '}
                            <span className="font-semibold text-emerald-800">READY TO APPLY</span>:
                          </p>
                          <ul className="mt-1 list-disc list-inside space-y-0.5 font-medium">
                            {pendingPrereqs.map((p) => (
                              <li key={p.id}>
                                <button
                                  onClick={() => {
                                    setExpandedTasks((prev) => new Set(prev).add(p.id));
                                    const el = document.getElementById(`task-${p.id}`);
                                    el?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                  className="text-red-900 underline hover:text-red-700"
                                >
                                  {p.title}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Required Document List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Mandatory Document Requirements & Upload Slots ({task.requiredDocuments.length})
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        Verification status: {task.requiredDocuments.filter((d) => d.validationStatus === 'VALID').length} of{' '}
                        {task.requiredDocuments.filter((d) => d.isRequired).length} mandatory documents valid
                      </span>
                    </div>

                    <div className="space-y-3">
                      {task.requiredDocuments.map((doc, docIndex) => {
                        const isDocValid = doc.validationStatus === 'VALID';
                        const isDocInvalid = doc.validationStatus === 'INVALID';
                        const isDocWarning = doc.validationStatus === 'WARNING';
                        const isDocMissing = doc.validationStatus === 'MISSING';
                        const isUploading = uploadingDocId === doc.docId;

                        return (
                          <div
                            key={doc.docId}
                            className={`rounded-lg border p-3.5 transition-all bg-white ${
                              isDocValid
                                ? 'border-emerald-200'
                                : isDocInvalid
                                ? 'border-red-200'
                                : isDocWarning
                                ? 'border-amber-200'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-slate-800">
                                    {doc.name}
                                  </span>
                                  {doc.isRequired ? (
                                    <span className="rounded bg-red-50 px-1.5 py-0.2 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-600/10">
                                      Mandatory
                                    </span>
                                  ) : (
                                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                                      Optional
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">{doc.description}</p>
                              </div>

                              {/* Upload Slot Action CTAs */}
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {/* Direct File Upload Dropzone / Button */}
                                <button
                                  disabled={isUploading}
                                  onClick={() => triggerFileUpload(taskIndex, docIndex)}
                                  className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-2xs"
                                >
                                  <svg className="mr-1 h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  {isUploading ? 'Validating…' : isDocMissing ? 'Upload File' : 'Replace File'}
                                </button>

                                {/* Simulation Quick-Action Dropdown or Direct Buttons */}
                                {isDocMissing ? (
                                  <>
                                    <button
                                      onClick={() => handleSimulateScenario(taskIndex, docIndex, 'valid')}
                                      className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition"
                                      title="Simulate uploading a valid, verified document"
                                    >
                                      + Valid Sample
                                    </button>
                                    <button
                                      onClick={() => handleSimulateScenario(taskIndex, docIndex, 'expired')}
                                      className="rounded-md bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 transition"
                                      title="Simulate an expired document error"
                                    >
                                      Test Expired
                                    </button>
                                    <button
                                      onClick={() => handleSimulateScenario(taskIndex, docIndex, 'name_mismatch')}
                                      className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 transition"
                                      title="Simulate a mismatched business name error"
                                    >
                                      Test Mismatch
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleClearDocument(taskIndex, docIndex)}
                                    className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-red-600 transition"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Inline Document Intelligence Card (Feature #3 Integration) */}
                            {!isDocMissing && (
                              <DocumentIntelligenceCard
                                document={doc}
                                businessName={entityName}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
