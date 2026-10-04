# Changelog

All notable changes to this project are documented in this file. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). PermitGraph has not
yet made a tagged `1.0.0` (or any tagged) release; everything below is accumulated
under `[Unreleased]` on the `arena/01a1054f-permitgraph` working branch.

## [Unreleased]

### Added

- **Research & governance docs** (`docs/PROJECT-RESEARCH.md`, `docs/research/*`):
  government-landscape survey (NSWS/MAITRI/MIDC and why PermitGraph is deliberately
  not a duplicate portal), open-source landscape survey, India-specific gap analysis,
  product-gap analysis, technical-landscape survey, and a dedicated data-licensing
  research doc resolving code vs. statute-text vs. candidate-data vs. synthetic-data
  licensing.
- **Architecture docs** (`docs/architecture/*`): system overview, data model,
  human-verification workflow design, and roadmap.
- **Regulatory data model + Rules-as-Code engine** (`packages/rules-engine`,
  `packages/shared`): YAML-defined rules with mandatory `source` provenance
  (document + section) and `verification_status` (`CANDIDATE`/`VERIFIED`/`SYNTHETIC`/
  etc.), a deterministic evaluator, and a human-verification state machine.
- **Approval dependency graph engine** (`packages/graph-engine`): directed graph over
  approvals with cycle detection, upstream/downstream closure, and a
  JSON-serialisable representation for the frontend graph view.
- **Regulatory change detection** (`packages/change-detection`): section-level diff +
  classification (deadline change, fee change, eligibility change, etc.) between two
  versions of statute text.
- **Impact analysis** (`packages/impact-analysis`): maps a detected regulatory change
  to directly/downstream-affected approvals, business types, and in-flight
  applications, with an explicit methodology + disclaimer in every result.
- **Document ingestion & OCR pipeline** (`packages/document-engine`): hashing,
  pluggable OCR backend (Tesseract-based, with a graceful in-memory fallback),
  PDF/image text extraction, and document validation rules.
- **Regulatory-text parsing** (`packages/regulatory-parser`): section/clause
  segmentation for statute text.
- **Workflow engine** (`packages/workflow-engine`): permit-application state machine
  (submitted -> under_review -> ... -> approved/rejected/withdrawn/escalated) plus an
  SLA clock.
- **Real regulatory corpus** (`data/real/`): transcribed sections from three
  Maharashtra Acts (Maharashtra Industrial Development Act 1961, Maharashtra
  Industry Trade and Investment Facilitation Act 2023, Maharashtra Khadi and Village
  Industries Act 1960), sourced from official India Code text mirrors with full
  provenance records (`data/real/source_documents/registry.json`) -- see
  `docs/PROJECT-RESEARCH.md` Limitations for why these are text-mirror sourced rather
  than OCR'd from the originally-referenced PDFs (which were not present in this
  build environment).
- **Candidate rules corpus** (`data/candidate/rules/`): 20 AI-extracted candidate
  rules derived from the real corpus, explicitly held at `CANDIDATE` status pending
  human review; 18 promoted to `VERIFIED` via the documented reviewer workflow
  (2 deliberately left `CANDIDATE` below a 0.8 confidence threshold, demonstrating
  the review step is a real editorial decision).
- **Synthetic dataset generators** (`scripts/generate_synthetic_dataset.py` +
  `data/synthetic/`): 5,200 synthetic business profiles, 5,341 applications +
  14,357 workflow events + SLA records, 1,300 documents (routed through the real
  document-validation service), 120 regulatory-change scenarios (routed through the
  real change-detection + impact-analysis services), and 520 synthetic approval
  dependency graphs -- all explicitly `is_synthetic=True`, never mixed with the real
  corpus.
- **REST API** (`apps/api`, FastAPI): auth (JWT), regulations, rules (list/evaluate),
  permission discovery (`POST /api/v1/permissions/discover`), approvals + dependency
  graph, businesses, applications (+ SLA/workflow), documents (upload/validate),
  regulatory-change analysis, impact analysis, audit log, and the role-gated human
  verification review queue.
- **Web frontend** (`apps/web`, React + TypeScript + Vite + Tailwind): 19 pages
  covering discovery, regulations, rules, approvals/graph view, businesses,
  applications/SLA tracking, document upload/validation, regulatory changes +
  impact, the human-verification review queue, and audit log viewing. See
  `apps/web/README.md` for the full page list and design rationale.
- **Developer CLI** (`cli/`, Typer): a thin REST client mirroring the full API
  surface (`permitgraph status|discover|auth|regulations|rules|approvals|businesses|
  applications|changes|documents|audit|review`) plus one local/API-free command
  (`permitgraph validate rules-dir`) usable in CI without a running server.
- **Automated test suite**: 44 package-level unit tests
  (`packages/*/tests`) + 46 API integration tests (`apps/api/tests`, run against a
  database seeded by the real seed scripts) = 90 passing tests.
- **Docker Compose deployment** (`docker-compose.yml`, `docker/Dockerfile.api`,
  `docker/Dockerfile.web`): Postgres + API + Nginx-served frontend, plus an opt-in
  `seed` profile.
- **CI** (`.github/workflows/ci.yml`): Python lint (ruff) + tests, web lint (oxlint)
  + typecheck + build, and Docker image builds.
- **Open-source project governance docs**: this file, `LICENSE` (Apache-2.0),
  `NOTICE` (multi-license-regime explanation), `CONTRIBUTING.md`, `SECURITY.md`,
  `CODE_OF_CONDUCT.md`.

### Fixed

- `rules_service.discover()`'s `insufficient_input` field is a list of
  `{rule_id, rule_name, reasons}` objects, not bare strings; both the web
  `DiscoverPage` and the CLI's `discover` command were initially written assuming
  `string[]` (web: silently rendered `[object Object]`; CLI: raised `TypeError`).
  Fixed both call sites and added a regression test
  (`apps/api/tests/test_discover.py::test_discover_insufficient_input_has_documented_shape`).
- The five real (non-synthetic) process-level approvals
  (`single-window-application`, `empowered-committee-escalation`,
  `joint-inspection-scheduling`, `midc-plot-allotment`,
  `khadi-village-industry-registration`) were seeded with `source_document_id` /
  `source_section` left as `None`, despite their own notes field claiming to be
  "directly established by the real source Acts" -- a provenance gap caught by
  `apps/api/tests/test_approvals_graph.py`. Fixed in `scripts/seed_real_corpus.py`.
- Pinned `bcrypt==4.0.1` in `apps/api/requirements.txt`: `passlib` 1.7.x probes
  `bcrypt.__about__.__version__`, which `bcrypt>=4.1` removed, silently breaking
  password hashing on a fresh install.

### Known limitations (see `docs/PROJECT-RESEARCH.md` and the final acceptance
report for the complete list)

- The three source Acts were sourced from official India Code text mirrors, not
  OCR'd from the specific PDFs referenced in the original project brief (which were
  not present in this build environment) -- the OCR pipeline itself
  (`packages/document-engine`) is implemented and unit-tested and ready to ingest
  those PDFs if/when supplied.
- `data/synthetic/` holds both the bulk synthetic dataset *and* the regulatory-change
  "benchmark" scenarios in one tree, rather than a fully separate `data/benchmarks/`
  directory as originally envisioned; everything in it is uniformly
  `is_synthetic=True` and never mixed with `data/real/` or `data/candidate/`, but the
  four-way directory split is not pixel-perfect against the original spec.
- Most catalogue/read API endpoints are intentionally unauthenticated in this MVP
  (see `SECURITY.md`); only the human-verification write path is role-gated.
- No background job worker (e.g. RQ, referenced as a dependency in
  `apps/api/requirements.txt` for forward compatibility) is implemented yet -- all
  processing in this release is synchronous/request-time.
- The `docker` CI job (and the Dockerfiles themselves) could not be executed inside
  this development sandbox (no Docker daemon available); the exact dependency
  install sequence was verified manually in an equivalent directory layout instead.
