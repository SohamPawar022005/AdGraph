# Roadmap

## P0 (shipped in this release)
Repository scaffold; Postgres-backed regulatory data model with provenance; rules-as-code
format + rule engine; approval model + dependency graph (cycle detection, traversal);
business profile + permission discovery; human verification workflow (API + CLI);
MAITRI Act 2023 full real corpus (29 sections) + representative MID Act 1961 / Khadi Act
sections; OCR pipeline (Tesseract-backed, tested against a generated scanned sample);
synthetic datasets (businesses, documents, workflows, regulatory-change scenarios,
approval graph topologies); versioned REST API with OpenAPI docs; developer CLI; React
admin/developer frontend covering the highest-priority pages; pytest unit/integration
tests; Docker Compose; GitHub Actions CI.

## P1 (implemented at MVP depth in this release)
Regulatory change detection (deterministic diff + clause classification); impact
analysis engine (graph-traversal based, with explanation + non-legal-advice disclaimer);
SLA engine (configurable timers, escalation candidate detection, audit trail); workflow
engine (submission → review → query → inspection → decision state machine); document
validation (structural + rule-based checks on synthetic documents); benchmark harness
skeleton with initial metrics for OCR/section-extraction/graph-traversal.

## P2 (explicitly deferred, documented, not faked)
Neo4j graph-database adapter (interface stubbed only); Temporal/Camunda-based workflow
orchestration; additional jurisdictions beyond Maharashtra; advanced developer SDKs
beyond the Python CLI/REST client; production-grade semantic/embedding-based change
detection; virus/malware scanning integration for uploads (documented hook point only);
real-time government portal connectors (none exist publicly — see
`docs/research/government-landscape.md`).
