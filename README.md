# PermitGraph

**Open-source regulatory intelligence & compliance automation infrastructure for
Maharashtra industrial approvals.**

PermitGraph turns regulatory text (Acts, sections, amendments) into versioned,
provenance-tracked, machine-readable rules — and keeps a dependency graph of
approvals, a change-detection pipeline that flags when a statute changes, and an
impact-analysis engine that says *who and what is affected* when it does.

> **PermitGraph is NOT a government portal.** It does not accept permit applications
> on behalf of any authority, is not government-approved, is not legally binding, and
> does **not** replace [NSWS](https://www.nsws.gov.in/), MAITRI, or MIDC's own
> systems. See [Scope & non-goals](#scope--non-goals) below.

## Origin

This project originates from **Smart India Hackathon Problem Statement 26130**
(Government of Maharashtra / Maharashtra State Innovation Society), which asks for a
single-window industrial-approval experience. Rather than build *another* applicant
wizard (several strong open-source attempts at that already exist — see
[`docs/research/india-open-source-gap.md`](docs/research/india-open-source-gap.md)),
PermitGraph builds the layer underneath: the part that turns a Gazette PDF into a
structured, versioned, auditable rule that any such wizard, any officer console, or
any compliance tool could consume via a documented API.

## Why this is useful (the USP)

```
regulation → OCR/extraction → AI candidate rule → human verification →
verified rule → rules-as-code → approval dependency graph → change detection →
impact analysis → REST API / CLI / web UI
```

Every other piece (a nicer application form, a mobile app, an officer dashboard) can
be built *on top of* this layer by someone else. PermitGraph deliberately does not
try to be that layer too.

## Scope & non-goals

- **Does:** structured regulatory data model, Rules-as-Code engine with mandatory
  source provenance, approval dependency graph, regulatory-change detection +
  semantic diff, impact analysis, a human-in-the-loop verification workflow, a
  document ingestion/OCR pipeline, synthetic data generation for load-testing the
  above, a REST API, a web UI, and a CLI.
- **Does not:** accept or route real permit applications to any government
  authority, claim legal force for any output, claim to be "government-approved" or
  "official", or silently present AI-extracted content as verified fact. See the
  [legal/provenance safety rules](#legalsafety-rules) below — they are enforced in
  code, not just policy.

## Quick start

### Docker Compose (recommended)

```bash
docker compose up --build
# once postgres is healthy:
docker compose --profile seed run --rm seed
```

- API: http://localhost:8000 (docs at `/docs`)
- Web UI: http://localhost:8080

### Manual / local development

```bash
# Python packages + API
for pkg in shared rules-engine graph-engine change-detection impact-analysis \
           document-engine regulatory-parser workflow-engine; do
  pip install -e "packages/$pkg"
done
pip install -r apps/api/requirements.txt -r apps/api/requirements-dev.txt
pip install -e cli

python scripts/seed_real_corpus.py              # real + candidate regulatory corpus, demo users
python scripts/demo_apply_reviewer_approvals.py # promotes a documented subset to VERIFIED (simulated reviewer)
python scripts/load_synthetic_dataset.py        # ~5k synthetic businesses/applications/documents

cd apps/api && uvicorn app.main:app --reload --port 8000
```

```bash
# Web UI (separate terminal)
cd apps/web && npm install && npm run dev
```

```bash
# CLI (separate terminal)
permitgraph status
permitgraph auth login --email reviewer@permitgraph.dev --password permitgraph-dev-only
permitgraph discover --industry food_processing --district Pune --employees 80 \
  --investment 50000000 --land-type midc_industrial_area
```

See [`cli/README.md`](cli/README.md) for the full CLI command tree.

> Demo accounts (dev-only, see `scripts/seed_real_corpus.py`): `admin@`,
> `reviewer@`, `officer@`, `business@`, `developer@`, `readonly@permitgraph.dev`,
> password `permitgraph-dev-only` for all. **Never reuse these in a real
> deployment** — see [`SECURITY.md`](SECURITY.md).

## Repository layout

```
apps/api        FastAPI service: routers, models, services (the public API)
apps/web        React + TypeScript + Vite + Tailwind UI (19 pages)
packages/*      8 installable Python packages, each with its own unit tests:
                  shared, rules-engine, graph-engine, change-detection,
                  impact-analysis, document-engine, regulatory-parser, workflow-engine
cli/            `permitgraph` developer CLI (Typer) — a pure REST client
data/real/      Transcribed text of the 3 source Acts + provenance registry
data/candidate/ AI-extracted candidate rules, pending/partial human review
data/synthetic/ ~5.2k synthetic businesses, applications, documents, change
                scenarios, approval graphs — all explicitly is_synthetic=true
docs/           Research, architecture, and this project's own acceptance report
scripts/        Seed scripts + synthetic data generators
docker/         Dockerfiles; docker-compose.yml lives at the repo root
.github/        CI workflow
```

See [`docs/architecture/overview.md`](docs/architecture/overview.md) for the full
pipeline diagram and the reasoning behind each package boundary, and
[`docs/architecture/data-model.md`](docs/architecture/data-model.md) for the schema.

## The three real source Acts

1. The Maharashtra Industrial Development Act, 1961
2. The Maharashtra Industry, Trade and Investment Facilitation Act, 2023 (MAITRI)
3. The Maharashtra Khadi and Village Industries Act, 1960

Full provenance (source URL, retrieval date, extraction method, content hash) for
each is recorded in `data/real/source_documents/registry.json`. **Important:** the
specific PDFs referenced in the original project brief were not present in this build
environment; section text was instead sourced from official India Code text mirrors
of the same Acts and cross-checked against PRS Legislative Research. The OCR pipeline
(`packages/document-engine`) is implemented and unit-tested and ready to ingest the
original PDFs directly if/when supplied — see
[`docs/PROJECT-RESEARCH.md`](docs/PROJECT-RESEARCH.md) §19 for full detail on this
limitation.

## Legal/safety rules

These are enforced in code, not just stated as policy:

- **No fabrication.** PermitGraph never invents an approval, fee, deadline,
  subsidy, eligibility rule, threshold, dependency, authority, validity period, or
  penalty and stores it as authoritative. Unverified/AI-derived content is always
  tagged `CANDIDATE`; purely illustrative content is tagged `SYNTHETIC`.
- **Human verification gate.** The only code path that can set
  `verification_status = VERIFIED` is `verification_service.review_entity(...)`,
  which requires an authenticated `REGULATORY_REVIEWER` or `ADMIN` user and writes an
  audit record. See [`docs/architecture/human-verification.md`](docs/architecture/human-verification.md).
  No AI output is ever auto-promoted to verified status.
- **Data categories never mix.** `data/real/`, `data/candidate/`, and
  `data/synthetic/` are kept in separate directories and separate seed scripts; every
  API response for regulatory content includes `source` and `verification_status`.
- **No fake features.** No dead buttons, no "live government data" that isn't
  real/labelled, no claimed government API integration that doesn't exist.

## Testing & CI

```bash
python -m pytest packages/*/tests -q      # 44 cases
cd apps/api && python -m pytest -q        # 46 cases, against a real seeded DB
cd apps/web && npm run lint && npm run build
ruff check packages apps/api cli scripts
```

`.github/workflows/ci.yml` runs all of the above plus a Docker image build on every
push/PR.

## License

Source code is Apache License 2.0 (see [`LICENSE`](LICENSE)). This repository
deliberately uses **four different license regimes** for four different kinds of
content (code, government source-document text, AI-candidate data, synthetic data) —
see [`NOTICE`](NOTICE) and [`docs/research/data-licensing.md`](docs/research/data-licensing.md)
for the full breakdown. Contributions welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## More documentation

- [`docs/PROJECT-RESEARCH.md`](docs/PROJECT-RESEARCH.md) — project research notes,
  including a full Limitations section (§19) that should be read before relying on
  any output of this system.
- [`docs/research/`](docs/research) — government landscape, open-source landscape,
  India-specific gap analysis, product-gap analysis, technical-landscape survey,
  data-licensing research.
- [`docs/architecture/`](docs/architecture) — system overview, data model,
  human-verification design, roadmap.
- [`apps/web/README.md`](apps/web/README.md) — frontend page-by-page guide.
- [`cli/README.md`](cli/README.md) — CLI command reference.
- [`SECURITY.md`](SECURITY.md), [`CONTRIBUTING.md`](CONTRIBUTING.md),
  [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), [`CHANGELOG.md`](CHANGELOG.md).
