# Product Gap Analysis

### 1. What already exists?
A federation of applicant-facing single-window portals: NSWS (Central, 327+/3,452+
approvals across Central depts/states), MAITRI/MAITRI 2.0 (Maharashtra, ~119-128
services/14-16 departments, statutory under the MAITRI Act 2023), MIDC (land/industrial
estate administration under the MID Act 1961), and sector-specific windows like
PARIVESH (environment/forest). Each offers filing, tracking, a guided questionnaire
("Know Your Approvals" / "Online Wizard"), document reuse, grievance redressal, and
(for MAITRI) a statutory escalation path (Empowered Committee / Supervisory Committee)
and mandated joint/random-selection inspections.

### 2. What is already solved by NSWS/MAITRI/MIDC?
- Application intake, payment of statutory fees, document upload, and status tracking.
- A first-line "which approvals might I need" questionnaire (KYA / Wizard).
- Grievance/query handling and committee-level escalation for delayed applications.
- Public dashboards of aggregate disposal/approval statistics.
- (MAITRI) a legal mandate for inspection rationalisation and public consultation on
  draft rules.

PermitGraph **does not** attempt to re-implement any of the above. See
`docs/research/government-landscape.md` for the full capability inventory.

### 3. What is missing (confirmed by research, not duplicated anywhere found)?
- A **versioned, machine-readable** representation of the underlying rules, with
  source document/section/page provenance, that a third party can query, test, and
  audit independently of any single portal's UI.
- An inspectable **approval dependency graph** (what blocks what, upstream/downstream
  impact, cycle detection) as structured, queryable data rather than UI copy.
- **Regulatory change detection**: a pipeline that diffs a new regulation/notification
  against the prior version, classifies the change (threshold/deadline/authority/
  applicability/document-requirement), and propagates it through rules → approvals →
  affected business types → affected active applications.
- **Impact analysis** tied to that change feed, with an explicit, non-legal-advice
  confidence/verification status.
- An **open API and CLI** that let outside developers (consultants, legal-tech
  startups, other state governments, researchers) build on top of verified rule data,
  rather than scraping a portal UI.
- A strict, auditable **human-verification workflow** that prevents AI-extracted
  regulatory interpretations from silently becoming "fact" — none of the systems
  reviewed publish their extraction/verification pipeline at all, since none publish
  machine-extracted rules in the first place.

### 4. What open-source projects already solve part of it?
OpenFisca (versioned parametric rules), Catala (statute-traceable rule code), Akoma
Ntoso (legislative document structure standard), Drools/OpenL/Camunda/Temporal
(execution/orchestration). None combine OCR ingestion + provenance + dependency graph +
change detection + impact analysis in one open pipeline. Two independent SIH 26130
hackathon submissions (`ANUMATI`, `NIECP-AI`) validate the "approval dependency graph"
and "deterministic, honestly-labelled rule engine" ideas respectively, but neither
documents a from-primary-text ingestion→verification pipeline with regulatory change
detection as a first-class, tested capability. See `open-source-landscape.md` and
`india-open-source-gap.md` for full detail.

### 5. What is genuinely differentiated about PermitGraph?
The **source → candidate → verified → rules-as-code → graph → change-detection →
impact-analysis → API** pipeline, built and tested end-to-end against a real (if
small) regulatory corpus, with strict separation of REAL / CANDIDATE / SYNTHETIC data
at the schema level — not just in documentation. The differentiator is the connective
infrastructure and its provenance discipline, not any single novel algorithm.

### 6. Why should developers contribute to it?
- A genuinely reusable rules-as-code format + engine for Indian state-level regulation,
  decoupled from any single government's portal.
- Clear, scoped extension points (new jurisdictions, new OCR backends, new Acts) with
  tests and a human-verification gate that keeps contributions safe from fabrication.
- Infrastructure-shaped, not app-shaped: useful to many downstream products (legal-tech,
  GovTech consultancies, researchers, other states) rather than one monolithic app.

### 7. Why would government/consultants/startups use it?
- **Government (state DPIIT-equivalent / MAITRI-type cells):** a way to publish their
  own rules as structured, testable data alongside the existing portal, enabling
  internal QA ("does our Wizard actually match the gazetted rule?") and faster change
  rollout with an audit trail.
- **Consultants/law firms:** a queryable, source-cited reference for "why does this
  approval apply" instead of manually re-reading gazette PDFs every time a rule changes.
- **Startups/legal-tech:** an open API and dataset to build downstream products
  (compliance calendars, document checkers, SLA trackers) without re-deriving the
  underlying rule logic from scratch.

### 8. What is the smallest useful open-source release?
A working pipeline — OCR/ingestion stub → candidate extraction → human-verification
API/CLI → rules-as-code → rule engine → approval dependency graph → change-detection →
impact-analysis → REST API — proven against: the **full MAITRI Act 2023** (29 sections,
the richest and only fully text-extractable of the three source Acts) as the primary
real corpus, with representative verified sections of the Maharashtra Industrial
Development Act 1961 and the Khadi & Village Industries Act 1960, plus large synthetic
datasets (businesses, documents, workflows, regulatory-change scenarios) for
development, demo, and benchmarking. This is exactly the scope this repository ships.
