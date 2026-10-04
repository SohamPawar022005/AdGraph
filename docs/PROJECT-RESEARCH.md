# PermitGraph — Project Research Report

This is the synthesis document required by the project brief. It summarizes the
detailed research in `docs/research/*.md` and records the resulting product and
engineering decisions. Read the linked documents for full citations and detail.

## 1. SIH 26130 interpretation
Problem Statement 26130 ("Efficiency in streamlining industrial approvals, compliance
processes, and access to government support services," Government of Maharashtra /
Maharashtra State Innovation Society) asks for approval discovery, checklists,
pre-validation, workflow coordination, inspection scheduling, SLA tracking, alerts,
dashboards, regulatory knowledge, risk-based scrutiny, grievance escalation, delay
analytics, and scheme discovery. PermitGraph interprets this not as "build another
single-window portal" (that already exists, see §2-5) but as "build the regulatory
intelligence infrastructure that such portals need but do not publish."

## 2–5. Existing government ecosystem (NSWS, MAITRI, MIDC, and context)
See `docs/research/government-landscape.md` for full detail. Summary: NSWS (DPIIT,
Central) and MAITRI/MAITRI 2.0 (Maharashtra, statutory since the MAITRI Act 2023)
already provide applicant-facing single windows, wizards, dashboards, grievance
redressal, and (MAITRI) a statutory escalation/inspection-rationalisation mechanism.
MIDC administers industrial land under the Maharashtra Industrial Development Act,
1961. None publish their rule logic, approval dependency graph, or a regulatory
change-detection feed as open, machine-readable, provenance-tracked data.

## 6. Open-source competitors / regulatory technology landscape
See `docs/research/open-source-landscape.md`. OpenFisca, Catala, Akoma Ntoso,
LegalRuleML, Drools, OpenL Tablets, Camunda, Temporal, and UNCTAD eRegulations were
evaluated. No project combines OCR ingestion + source provenance + a rules-as-code
engine + an approval dependency graph + regulatory change detection + impact analysis
in one open pipeline — this is PermitGraph's connective-infrastructure contribution.

## 7. Rules-as-Code landscape
OpenFisca's "legislation pinned to effective dates" model and Catala's "code traceable
line-by-line to statute" principle are the two biggest influences on PermitGraph's own
YAML rules-as-code format (`packages/rules-engine`), without adopting either toolchain
directly (see `technical-landscape.md` for the engineering rationale).

## 8. India-specific open-source gap
See `docs/research/india-open-source-gap.md`. No official NSWS/MAITRI/MIDC source code
is public. Adjacent open data/API infra exists (India Code, a community JSON API over
India Code, a commercial legislation API) but none solve "detect a regulatory change
and tell me who/what is affected." Two other SIH 26130 GitHub submissions (`ANUMATI`,
`NIECP-AI`) independently validate the approval-dependency-graph and
honest/deterministic-rule-engine design choices PermitGraph also makes.

## 9. PermitGraph USP
"Convert authoritative regulatory documents into versioned machine-readable rules, map
dependencies between approvals, detect regulatory changes, determine their impact, and
expose the resulting compliance intelligence through open APIs." Core novel loop:
**Regulatory change → rule change → dependency impact → business impact.**

## 10. Architecture
See `docs/architecture/overview.md` for the full diagram and component descriptions:
source ingestion → OCR/text extraction → document versioning → regulatory parser →
candidate rules → human verification → rules-as-code → {rule engine, knowledge graph,
versioning} → approval dependency graph → impact analysis → {business profiles,
application workflows, regulatory changes} → API/CLI/UI.

## 11. Data strategy
Four strictly separated tiers: `data/real` (provenance-backed, human-verifiable),
`data/candidate` (AI-extracted, pending review, never treated as fact),
`data/synthetic` (generated, `synthetic=true`, safe to redistribute), and
`data/benchmarks` (gold-labelled evaluation sets). See §27 of the brief and
`docs/research/data-licensing.md`.

## 12. Regulatory provenance strategy
Every regulation/section/rule/approval/dependency record stores
`source_document_id, source_section, source_page (if applicable), source_url,
retrieved_at, content_hash (sha256), extraction_method, verification_status,
verified_by, verified_at, confidence, notes`. See the SQLAlchemy models in
`apps/api/app/models/` and `docs/architecture/data-model.md`.

## 13. Synthetic data strategy
Generated via `scripts/generate_synthetic_*.py`: ≥5,000 synthetic businesses across
Maharashtra manufacturing sub-sectors, ≥1,000 synthetic documents (with intentional
validation errors), ≥10,000 workflow events, ≥100 regulatory-change scenarios, and a
library of synthetic approval dependency graph topologies (linear, branching, merging,
cyclic, deep, disconnected) for graph-engine testing. All flagged `synthetic: true`.

## 14. AI/human responsibility split
LLM/AI is used only for: OCR text cleanup, section/clause candidate extraction,
candidate rule drafting, semantic-diff explanation, and natural-language search —
never as the system of record. Deterministic code (rule engine, graph traversal, SLA
timers, dependency checks, audit logging) is the system of record. No AI-authored
regulatory fact is ever auto-promoted to `verified` by this codebase; promotion
requires an explicit human verification action, logged in `verification_records` and
`audit_events` (see `docs/architecture/human-verification.md`).

## 15. Security
RBAC roles (ADMIN, REGULATORY_REVIEWER, OFFICER, BUSINESS_USER, DEVELOPER, READ_ONLY),
JWT-based auth, Pydantic input validation, file-type/size validation on uploads,
parametrized queries via SQLAlchemy (no raw SQL string interpolation), secrets only via
environment variables, dependency scanning in CI (`pip-audit`/`npm audit`). See
`SECURITY.md`.

## 16. Privacy
No real personal or business data is used; synthetic data is the default and only
option shipped in this repository. Regulatory source Acts are public-domain-reproducible
statute text (see `data-licensing.md`), handled separately from any (synthetic)
business/application data.

## 17. Licensing
Apache-2.0 for code, public-domain reproduction for statute text (Copyright Act 1957
s.52(1)(q)), CC0-1.0 for synthetic data, CC-BY-4.0 for documentation. Full detail and
legal citation in `docs/research/data-licensing.md`.

## 18. Roadmap
See `docs/architecture/roadmap.md` (P0/P1/P2 breakdown mirrors the governing brief).

## 19. Limitations
- Real verified corpus is intentionally small (full MAITRI Act 2023 + representative
  sections of two other Acts) — not a complete Maharashtra regulatory corpus.
- The two older Acts were supplied to this project as scanned/image PDFs; those exact
  binary files were **not present in this build environment**. The OCR pipeline
  (`packages/document-engine`) is fully implemented and unit-tested against a
  generated scanned-style sample, and is ready to ingest the real scans when provided.
  In the interim, representative sections of those two Acts were sourced directly from
  the Government of India's official India Code repository (text, not OCR) and are
  explicitly flagged `extraction_method: official_text_mirror` rather than `ocr`,
  pending reconciliation against the original scanned source once supplied.
- The **approval catalogue is synthetic**, not a verified legal catalogue of every
  licence/consent an Indian manufacturer needs (Factories Act, Pollution Control Board
  consents, Fire NOC, etc. are outside the three supplied source Acts and were not
  fabricated — see `data/synthetic/README.md`). Only the *process* rules the three
  supplied Acts actually establish (Single Window filing, Empowered Committee
  escalation, inspection rationalisation, Wizard Module, confidentiality, etc.) are
  treated as the real/candidate regulatory corpus.
- Change-detection uses deterministic diff + heuristics, not a trained legal-NLP model;
  it is designed to be auditable and extendable, not state-of-the-art NLP accuracy.
