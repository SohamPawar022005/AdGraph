export interface SourceRef {
  document: string;
  document_version?: string | null;
  section?: string | null;
  page?: number | null;
  url?: string | null;
}

export interface PermissionResult {
  approval_id: string;
  rule_id: string;
  rule_name: string;
  reason: string;
  why: string;
  source: SourceRef;
  confidence: number;
  verification_status: string;
}

export interface InsufficientInputItem {
  rule_id: string;
  rule_name: string;
  reasons: string[];
}

export interface DiscoveryResponse {
  permissions: PermissionResult[];
  documents: string[];
  dependencies: { approval_id: string; depends_on: string[] }[];
  sources: (SourceRef & { rule_id: string; verification_status: string })[];
  verification_status: { rule_id: string; status: string }[];
  insufficient_input: InsufficientInputItem[];
  disclaimer: string;
}

export const REVIEWER_ROLES = ["REGULATORY_REVIEWER", "ADMIN"];

export interface RegulationSummary {

  id: string;
  name: string;
  short_code: string;
  jurisdiction: string;
}

export interface RuleSummary {
  id: string;
  name: string;
  jurisdiction: string;
  latest_version: string;
  status: string;
  verification_status: string;
  source_document_id: string;
  source_section: string;
  version_count: number;
}

export interface Approval {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  authority_id?: string | null;
  is_synthetic: boolean;
  status: string;
  verification_status: string;
  source_document_id?: string | null;
  source_section?: string | null;
  applicable_industries?: string[] | null;
}

export interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  district?: string | null;
  location?: string | null;
  jurisdiction: string;
  investment?: number | null;
  employees?: number | null;
  project_stage?: string | null;
  land_type?: string | null;
  hazardous_material?: boolean | null;
  is_village_industry?: boolean | null;
  environmental_attributes?: string[] | null;
  is_synthetic: boolean;
}

export interface Application {
  id: string;
  business_profile_id: string;
  approval_id: string;
  state: string;
  is_synthetic: boolean;
}

export interface RegulatoryChange {
  id: string;
  old_source_document_id?: string | null;
  new_source_document_id?: string | null;
  detected_at: string;
  change_type: string;
  section_label?: string | null;
  old_text?: string | null;
  new_text?: string | null;
  affected_rule_ids: string[];
  affected_approval_ids: string[];
  affected_business_types: string[];
  summary?: string | null;
  confidence: number;
  verification_status: string;
  reviewer?: string | null;
  approved_at?: string | null;
  is_synthetic: boolean;
  source_references?: {
    old_section?: string | null;
    new_section?: string | null;
    old_doc_id?: string | null;
    new_doc_id?: string | null;
  } | null;
  matching_rationale?: string | null;
  is_uncertain?: boolean;
  evidence_tokens?: Record<string, any> | null;
}

export interface EvidencePath {
  trigger_rule: string;
  source_approval: string;
  target_approval: string;
  impact_type: "direct" | "downstream";
  path: string[];
  path_summary: string;
  relationship: string;
  tier: "confirmed" | "candidate" | "synthetic";
}

export interface ImpactAssessment {
  id: string;
  regulatory_change_id: string;
  directly_affected_approvals: string[];
  downstream_affected_approvals: string[];
  affected_business_types: string[];
  affected_application_ids: string[];
  impact_score: number;
  methodology: string;
  explanation: string;
  disclaimer: string;
  evidence_paths?: EvidencePath[];
  has_uncertain_coverage?: boolean;
  relationship_tiers?: { confirmed: number; candidate: number; synthetic: number };
}

export interface SourceDocument {
  id: string;
  title: string;
  jurisdiction: string;
  authority?: string | null;
  document_type: string;
  version_label: string;
  content_hash?: string | null;
  source_url?: string | null;
  file_type?: string;
  ocr_status: string;
  page_count: number;
  notes?: string | null;
  created_at?: string;
  raw_text_preview?: string | null;
  sections?: Array<{ id: string; number: string; heading?: string; text: string; preview: string }>;
}


export interface AuditEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor: string;
  old_value?: unknown;
  new_value?: unknown;
  reason?: string | null;
  created_at: string;
}

export interface DocumentSummary {
  id: string;
  document_type: string;
  original_filename: string;
  size_bytes: number;
  validation_status: string;
  is_synthetic: boolean;
  business_profile_id?: string | null;
  application_id?: string | null;
  created_at: string;
}

export interface ChecklistDocument {
  id: string;
  checklist_id: string;
  task_id: string;
  document_type: string;
  name: string;
  purpose?: string | null;
  is_mandatory: boolean;
  status: "missing" | "collected" | "uploaded" | "verified" | "unknown";
  source_reference?: string | null;
  verification_status: string;
  document_id?: string | null;
  file_url?: string | null;
  notes?: string | null;
}

export interface ChecklistTask {
  id: string;
  checklist_id: string;
  approval_id?: string | null;
  application_id?: string | null;
  title: string;
  description?: string | null;
  authority_name: string;
  category: string;
  status: "not_started" | "in_progress" | "blocked" | "completed" | "needs_review";
  is_manual: boolean;
  legal_deadline?: string | null;
  legal_deadline_note?: string | null;
  due_date?: string | null;
  reminder_days: number;
  prerequisite_approval_ids: string[];
  blocking_reasons: string[];
  supporting_rule_id?: string | null;
  source_reference?: SourceRef | null;
  notes?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  flagged_for_review: boolean;
  flag_reason?: string | null;
  flag_change_id?: string | null;
  documents: ChecklistDocument[];
}

export interface ComplianceChecklist {
  id: string;
  business_profile_id: string;
  project_name: string;
  status: string;
  readiness_status: "ready_for_review" | "action_required" | "needs_verification";
  readiness_summary?: {
    checklist_id: string;
    readiness_status: string;
    evaluated_at: string;
    passed_checks: string[];
    failed_checks: Array<{ check: string; title: string; items: any[] }>;
    verification_needed: Array<{ check: string; title: string; items: any[]; reason?: string }>;
    disclaimer: string;
  } | null;
  last_evaluated_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
  tasks: ChecklistTask[];
  documents: ChecklistDocument[];
}

export interface RegulatorySource {
  id: string;
  name: string;
  jurisdiction: string;
  authority: string;
  source_url: string;
  source_type: string;
  last_checked_at?: string | null;
  last_check_status: "success" | "failed" | "pending";
  last_error?: string | null;
  version_fingerprint?: string | null;
  check_interval_hours: number;
  is_active: boolean;
  description?: string | null;
}

export interface RegulatorySubscription {
  id: string;
  user_id?: string | null;
  subscription_type: "act" | "rule" | "regulation" | "approval" | "authority" | "business";
  target_id: string;
  target_label: string;
  notification_channels?: string[];
  is_active: boolean;
  created_at?: string | null;
}

export interface RegulatoryAlert {
  id: string;
  subscription_id?: string | null;
  user_id?: string | null;
  regulatory_change_id: string;
  title: string;
  message: string;
  priority: "urgent" | "medium" | "informational";
  is_read: boolean;
  read_at?: string | null;
  is_dismissed: boolean;
  is_false_positive: boolean;
  resolution_notes?: string | null;
  affected_business_id?: string | null;
  affected_business_name?: string | null;
  affected_application_id?: string | null;
  affected_task_id?: string | null;
  impact_summary?: {
    regulation_title?: string;
    change_summary?: string;
    affected_business?: string;
    affected_application?: string;
    potential_impact?: string;
    recommended_action?: string;
    effective_date?: string;
    confidence?: number;
    official_source?: string | null;
    is_direct?: boolean;
  } | null;
  created_at?: string | null;
}

