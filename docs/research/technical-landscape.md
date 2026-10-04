# Technical Landscape & Stack Decisions

This note records *why* each technology was chosen, so the decision is reviewable
rather than assumed. Per the governing brief: "Do not over-engineer."

## OCR

**Options considered:** Tesseract OCR (open source, pytesseract bindings), Google
Vision API (closed, paid), AWS Textract (closed, paid), PaddleOCR (open source, strong
on complex layouts), docTR (open source, deep-learning based).

**Decision:** Use **Tesseract OCR via `pytesseract` + `pdf2image`** as the default,
offline, dependency-light OCR backend (`packages/document-engine`). Rationale:
permissive license (Apache-2.0), no network dependency (important for a tool that may
process sensitive/regulatory documents offline), good-enough accuracy for printed
Government-of-Maharashtra Gazette scans, and a simple CLI/Python binding. The engine is
implemented behind an `OcrBackend` interface so PaddleOCR or a cloud OCR vendor can be
swapped in later (documented as a P2 roadmap item) without touching callers.

## Embeddings / semantic comparison

**Decision:** Ship the MVP **change-detection** engine using deterministic,
dependency-light techniques — Python's `difflib` for sequence alignment plus
rule-based clause/number/date extraction — rather than requiring a large embedding
model. This keeps the core differentiator (change → impact) runnable with zero GPU/
network dependency and fully reproducible test fixtures. An optional
sentence-embedding backend (permissively licensed, e.g. a small `sentence-transformers`
model) is documented as a pluggable `SemanticComparator` strategy for higher-recall
paraphrase detection in production, but is **not required** to run the MVP or its tests.

## Graph representation

**Decision:** Represent the approval dependency graph and regulatory knowledge graph
as **relational tables in PostgreSQL** (`approvals`, `approval_dependencies`, etc.),
with traversal implemented in Python (`packages/graph-engine`, using `networkx` for
in-memory algorithms: cycle detection, shortest path, upstream/downstream closure).
This matches the brief's guidance ("Prefer PostgreSQL graph-like relational
representation initially... Neo4j may be supported as an optional adapter"). A Neo4j
adapter interface is sketched in `packages/graph-engine/graph_engine/adapters/` but not
required for the MVP — our graphs (tens of approvals, hundreds of dependencies) do not
yet justify a dedicated graph database.

## Search

**Decision:** PostgreSQL full-text search (`tsvector`/`tsquery`) for regulatory/approval
search in the MVP; no vector database is introduced. Justification: corpus size is
small (tens of rules, hundreds of sections) and provenance/source-citation correctness
matters more than fuzzy semantic recall at this stage.

## Async processing

**Decision:** Use **Redis + RQ** (Redis Queue) rather than Celery or Arq. RQ has the
smallest operational footprint of the three (no separate message broker beyond Redis,
simple worker process, pure Python), which matches "do not introduce excessive
infrastructure unless justified" — document OCR and change-detection jobs are the only
background tasks in this MVP, and RQ handles that cleanly. Celery remains a documented
upgrade path if job volume/complexity grows.

## Workflow orchestration

**Decision:** Implement SLA/escalation/workflow state machines as **deterministic
Python services backed by Postgres rows + an audit-event table**, not Temporal/Camunda.
At this scale (per-application linear state transitions with timers), a dedicated
workflow engine is unjustified infrastructure; see `open-source-landscape.md` for the
explicit Temporal/Camunda evaluation and the roadmap note that this may change if the
project adds multi-actor, long-running, cross-service choreography.

## Backend framework

**Decision:** FastAPI + Pydantic v2 + SQLAlchemy 2.0 (Python). Rationale: async-capable,
automatic OpenAPI generation (direct requirement — "Provide OpenAPI documentation"),
strong typing story that pairs well with a provenance-heavy data model, and the
dominant choice in the Python RegTech/rules-as-code ecosystem referenced above
(OpenFisca, Catala tooling).

## Frontend framework

**Decision:** React + TypeScript + Vite + Tailwind CSS, no heavyweight meta-framework
(no Next.js) — this is a developer/admin tool, not a marketing site or an SSR-sensitive
public portal, so client-side rendering with Vite's fast dev loop is sufficient and
keeps the Docker image small.

## Database

**Decision:** PostgreSQL, accessed through SQLAlchemy so the same models also run
against SQLite for fast local/unit testing without Docker. `DATABASE_URL` is the single
environment switch.

## Object storage

**Decision:** MinIO locally via Docker Compose (S3-compatible), with the storage client
written against the S3 API so any S3-compatible bucket (AWS S3, Azure Blob via
S3-gateway, GCS via interoperability mode) works in production without code changes.

## Summary of explicitly rejected / deferred infrastructure (and why)

| Technology | Status | Reason |
|---|---|---|
| Neo4j | Deferred (adapter stubbed) | Graph is small; Postgres+networkx sufficient |
| Celery | Deferred | RQ is lighter for current job volume |
| Temporal / Camunda | Deferred | Workflow complexity doesn't yet justify a dedicated orchestrator |
| Vector DB / pgvector | Deferred | Full-text search sufficient at current corpus size; revisit once corpus > ~1000 verified rules |
| PaddleOCR / cloud OCR | Deferred (interface ready) | Tesseract sufficient for printed Gazette scans; interface allows swap-in |
| Next.js / SSR | Rejected for this use case | Internal/developer tool, not a public SSR-sensitive site |
