# Regulatory Data Model

Full SQLAlchemy definitions: `apps/api/app/models/`. This document is the human-readable
map. All timestamps UTC. All IDs are UUID strings unless noted.

## Provenance mixin
Every regulatory-fact table includes (`apps/api/app/models/provenance.py`):

| Field | Type | Notes |
|---|---|---|
| `source_document_id` | FK → `source_documents.id` | nullable only for purely synthetic rows |
| `source_section` | str | e.g. "Section 14" |
| `source_page` | str | nullable (not all sources are paginated the same way) |
| `source_url` | str | public URL if available |
| `extraction_method` | enum | `manual | ocr | official_text_mirror | ai_candidate` |
| `confidence` | float 0-1 | nullable; set by AI extraction, cleared on human edit |
| `status` | enum | `candidate | verified | deprecated | superseded` |
| `verification_status` | enum | `UNVERIFIED | CANDIDATE | VERIFIED | REJECTED` |
| `verified_by` | str | reviewer identity |
| `verified_at` | datetime | nullable |
| `notes` | text | free-form reviewer notes |
| `created_at` / `updated_at` | datetime | |

## Core entities

- **SourceDocument** — a regulatory source file (Act/notification). `title, jurisdiction,
  authority, document_type, version_label, content_hash (sha256), retrieved_at,
  source_url, file_type, ocr_status`.
- **SourceLocation** — a precise pointer into a `SourceDocument` (page, section label,
  bounding box optional) used by `Rule`/`Clause`/`ApprovalDependency` provenance.
- **Regulation / RegulationVersion** — a named Act and its versions over time;
  `RegulationVersion.supersedes_id` links versions.
- **Section / Clause** — structural decomposition of a `RegulationVersion`.
- **Rule / RuleVersion** — machine-readable rule derived from a `Clause`.
  `RuleVersion.supersedes_id` links versions; `effective_from/effective_to` make the
  version applicable to a point in time. The **declarative rule body** itself (the
  `applies_when` / `requires` structure) is stored as JSON mirroring the YAML
  rules-as-code format in `packages/rules-engine`.
- **Authority** — issuing/competent authority (name, type, jurisdiction).
- **Jurisdiction** — e.g. "Maharashtra" / a district.
- **Approval / ApprovalRequirement** — a permission/licence/consent and its declared
  requirements (documents, conditions).
- **ApprovalDependency** — directed edge `approval_id -> depends_on_approval_id` with
  `dependency_type (requires|produces|informs), confidence, is_synthetic`.
- **BusinessProfile** — applicant/business attributes used for rule evaluation.
- **DocumentRequirement** — a document type an approval requires.
- **Workflow / WorkflowEvent** — an application's lifecycle and its event log.
- **SLA** — configured time limits and computed state per workflow.
- **Notification** — reminder/escalation messages tied to SLA state changes.
- **Inspection** — scheduled/joint inspection records.
- **Scheme** — government incentive/scheme metadata (synthetic/candidate only in this
  release — no scheme eligibility data was in the supplied source Acts).
- **RegulatoryChange** — a detected diff between two `RegulationVersion`/`SourceDocument`
  states, with `change_type, affected_sections, affected_rule_ids,
  affected_approval_ids, affected_business_types, summary, confidence,
  verification_status, reviewer, approved_at`.
- **ImpactAssessment** — the computed impact of a `RegulatoryChange` (affected rules /
  approvals / documents / workflows / business categories / active applications,
  `impact_score`, explanation).
- **VerificationRecord** — immutable audit of a human review action
  (`approve|reject|edit|flag|deprecate|supersede`) against any regulatory entity.
- **AuditEvent** — generic append-only audit log for every state-changing action in the
  system (see `docs/architecture/human-verification.md`).
- **BusinessUser / User / Role** — auth/RBAC.

## Status lifecycle (regulatory entities)

```
candidate --(human approve)--> verified --(superseded by new version)--> deprecated
     │
     └--(human reject)--> rejected
```

No code path sets `verification_status = VERIFIED` without a corresponding
`VerificationRecord` row created by an authenticated `REGULATORY_REVIEWER`/`ADMIN`
action (see `apps/api/app/services/verification_service.py`). Seed scripts that need a
"verified" demo rule call that same service function under a documented
`demo_reviewer` identity — never a silent default.
