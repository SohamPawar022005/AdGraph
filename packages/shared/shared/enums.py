"""Canonical enums shared by the API, rules engine, graph engine, and CLI.

These values are the backbone of PermitGraph's provenance / safety guarantees
(see docs/architecture/human-verification.md). Do not add a bare "verified"
bool anywhere else in the codebase -- always use VerificationStatus.
"""

from enum import Enum


class DataTier(str, Enum):
    """Which of the four strictly-separated data tiers a record belongs to."""

    REAL = "real"
    CANDIDATE = "candidate"
    SYNTHETIC = "synthetic"
    BENCHMARK = "benchmark"


class ExtractionMethod(str, Enum):
    MANUAL = "manual"
    OCR = "ocr"
    OFFICIAL_TEXT_MIRROR = "official_text_mirror"
    AI_CANDIDATE = "ai_candidate"
    SYNTHETIC_GENERATOR = "synthetic_generator"


class RuleStatus(str, Enum):
    CANDIDATE = "candidate"
    VERIFIED = "verified"
    DEPRECATED = "deprecated"
    SUPERSEDED = "superseded"
    REJECTED = "rejected"


class VerificationStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    CANDIDATE = "CANDIDATE"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    SYNTHETIC = "SYNTHETIC"


class DependencyType(str, Enum):
    REQUIRES = "requires"
    DEPENDS_ON = "depends_on"
    PRODUCES = "produces"
    INFORMS = "informs"


class ChangeType(str, Enum):
    ADDITION = "addition"
    DELETION = "deletion"
    MODIFICATION = "modification"
    THRESHOLD_CHANGE = "threshold_change"
    AUTHORITY_CHANGE = "authority_change"
    DEADLINE_CHANGE = "deadline_change"
    DOCUMENT_REQUIREMENT_CHANGE = "document_requirement_change"
    APPLICABILITY_CHANGE = "applicability_change"
    DEFINITION_CHANGE = "definition_change"
    MOVED = "moved"
    RENUMBERED = "renumbered"
    UNCERTAIN = "uncertain"


class WorkflowState(str, Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    QUERY_RAISED = "query_raised"
    QUERY_RESPONDED = "query_responded"
    INSPECTION_SCHEDULED = "inspection_scheduled"
    INSPECTION_COMPLETED = "inspection_completed"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"
    WITHDRAWN = "withdrawn"


class SLAState(str, Enum):
    NOT_STARTED = "not_started"
    RUNNING = "running"
    APPROACHING_DEADLINE = "approaching_deadline"
    OVERDUE = "overdue"
    ESCALATED = "escalated"
    PAUSED = "paused"
    COMPLETED = "completed"


class AuditEventType(str, Enum):
    RULE_CREATED = "RULE_CREATED"
    RULE_EDITED = "RULE_EDITED"
    RULE_VERIFIED = "RULE_VERIFIED"
    RULE_REJECTED = "RULE_REJECTED"
    RULE_SUPERSEDED = "RULE_SUPERSEDED"
    RULE_DEPRECATED = "RULE_DEPRECATED"
    APPROVAL_CREATED = "APPROVAL_CREATED"
    DEPENDENCY_CREATED = "DEPENDENCY_CREATED"
    DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED"
    DOCUMENT_VALIDATED = "DOCUMENT_VALIDATED"
    BUSINESS_PROFILE_CREATED = "BUSINESS_PROFILE_CREATED"
    APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED"
    WORKFLOW_EVENT = "WORKFLOW_EVENT"
    SLA_STARTED = "SLA_STARTED"
    SLA_BREACHED = "SLA_BREACHED"
    SLA_ESCALATED = "SLA_ESCALATED"
    REGULATORY_CHANGE_DETECTED = "REGULATORY_CHANGE_DETECTED"
    IMPACT_ANALYSIS_CREATED = "IMPACT_ANALYSIS_CREATED"
    REEVALUATION_RUN = "REEVALUATION_RUN"


class Role(str, Enum):
    ADMIN = "ADMIN"
    REGULATORY_REVIEWER = "REGULATORY_REVIEWER"
    OFFICER = "OFFICER"
    BUSINESS_USER = "BUSINESS_USER"
    DEVELOPER = "DEVELOPER"
    READ_ONLY = "READ_ONLY"
