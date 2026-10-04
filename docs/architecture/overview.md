# Architecture Overview

```
            OFFICIAL SOURCES (Acts, Gazette notifications)
                           │
                           ▼
                 SOURCE INGESTION  (SourceDocument + hash + provenance)
                           │
                           ▼
              OCR / TEXT EXTRACTION  (packages/document-engine)
                           │
                           ▼
              DOCUMENT VERSIONING  (RegulationVersion)
                           │
                           ▼
              REGULATORY PARSER  (packages/regulatory-parser → Section/Clause)
                           │
                           ▼
              CANDIDATE RULES  (status=candidate, AI-assisted extraction)
                           │
                           ▼
              HUMAN VERIFICATION  (VerificationRecord + audit event)
                           │
                           ▼
              RULES-AS-CODE  (YAML, packages/rules-engine)
          ┌────────────────┼─────────────────┐
          ▼                ▼                 ▼
    RULE ENGINE     KNOWLEDGE GRAPH     RULE VERSIONING
  (evaluate/evaluate_all)  (Regulation→Section→Rule→Approval)  (RuleVersion supersedes)
          │                │                 │
          └────────────────┼─────────────────┘
                           ▼
             APPROVAL DEPENDENCY GRAPH  (packages/graph-engine)
                           │
                           ▼
              IMPACT ANALYSIS ENGINE  (packages/impact-analysis)
          ┌────────────────┼───────────────────┐
          ▼                ▼                   ▼
      BUSINESS         APPLICATION         REGULATORY
      PROFILES          WORKFLOWS           CHANGES (packages/change-detection)
          │                │                   │
          └────────────────┼───────────────────┘
                           ▼
                     API / UI / CLI
```

## Monorepo layout

```
apps/api        FastAPI service: routers, models, schemas, services, migrations
apps/web        React + TypeScript + Vite + Tailwind admin/developer UI
apps/worker     RQ background worker (OCR jobs, change-detection jobs)
packages/*      Installable Python packages with their own unit tests
cli/            `permitgraph` developer CLI (Typer)
data/           real | candidate | synthetic | benchmarks | schemas
sources/        source document registry (hash manifests, not raw binaries)
docs/           research, architecture, regulatory, api, contribution docs
tests/          cross-package integration + end-to-end tests
scripts/        seed & data-generation scripts
infra/          deployment notes (cloud-agnostic)
docker/         Dockerfiles; docker-compose.yml at repo root
.github/        CI workflows, issue/PR templates
```

**As-built note (see `CHANGELOG.md` / the final acceptance report for the full
list):** the layout above was the original plan. In the actual build, `apps/worker`
(a queued OCR/change-detection worker) was not implemented — all processing in this
release is synchronous/request-time, though `redis`/`rq` are already declared as
`apps/api` dependencies for forward compatibility. Package-level tests live under
each package's own `tests/` directory plus `apps/api/tests/` rather than a single
top-level `tests/`. `infra/` and a separate `sources/` directory were not created;
deployment notes live in `docker/` + `docker-compose.yml`, and source-document
provenance lives in `data/real/source_documents/registry.json` instead.

## Why relational-graph over a dedicated graph database
See `docs/research/technical-landscape.md` — the dependency/knowledge graph is small
enough (tens of approvals, hundreds of dependencies in the real+synthetic combined
corpus) that PostgreSQL tables + `networkx`-based traversal in
`packages/graph-engine` meet every required capability (cycle detection, up/downstream
traversal, confidence/provenance per edge) without adding a second database to operate.

## Data flow guarantee: REAL / CANDIDATE / SYNTHETIC never mix
Every table that stores a regulatory fact carries a `status` and `verification_status`
column (see `docs/architecture/data-model.md`). API responses always surface these
fields; the UI always renders a provenance/verification badge next to any regulatory
claim. Synthetic business/workflow data carries `synthetic: true` at the row level, and
seed scripts for synthetic data live in a separate module from the regulatory-corpus
seed script so they can never be accidentally merged into "real".
