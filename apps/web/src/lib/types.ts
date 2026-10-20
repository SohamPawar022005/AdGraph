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

export type SearchEntityType = 'act' | 'section' | 'rule' | 'approval' | 'source_document';

export interface CitationInfo {
  act_title: string;
  act_short_code: string;
  section_number?: string | null;
  official_reference: string;
  jurisdiction: string;
  authority?: string | null;
  source_url?: string | null;
  source_document_id?: string | null;
}

export interface VerificationInfo {
  status: 'VERIFIED' | 'CANDIDATE' | 'SYNTHETIC' | 'PROPOSED' | 'UNVERIFIED';
  extraction_method?: string | null;
  confidence?: number | null;
  badge_label: string;
  provenance_summary?: string | null;
}

export interface RegulatorySearchResult {
  id: string;
  entity_type: SearchEntityType;
  title: string;
  title_mr?: string | null;
  subtitle?: string | null;
  matched_text: string;
  matched_field: string;
  language_detected: 'en' | 'mr' | 'mixed';
  relevance_score: number;
  citation: CitationInfo;
  verification: VerificationInfo;
  navigation_link: string;
  tags?: string[];
}

export interface RegulatorySearchResponse {
  query: string;
  detected_language: string;
  translated_query?: string | null;
  total_matches: number;
  counts_by_type: Record<SearchEntityType, number>;
  counts_by_status: Record<string, number>;
  items: RegulatorySearchResult[];
  execution_time_ms: number;
}

