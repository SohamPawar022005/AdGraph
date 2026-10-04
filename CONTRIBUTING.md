# Contributing to PermitGraph

Thanks for considering a contribution. PermitGraph is a regulatory-intelligence and
compliance-automation **infrastructure** prototype (ingestion -> candidate rule ->
human verification -> executable rule -> dependency graph -> change detection ->
impact analysis -> API), not an applicant-facing portal and not a replacement for
NSWS/MAITRI/MIDC. Please read `README.md` and `docs/architecture/overview.md` first
to understand the scope before proposing new features.

## The one rule that matters more than any other

**Never let AI-extracted or OCR-extracted regulatory content (approvals, fees,
deadlines, eligibility, thresholds, authority, penalties, dates) reach
`verification_status = VERIFIED` without going through a real human reviewer.**

The enforced pipeline is:

```
AUTHORITATIVE SOURCE -> EXTRACTION -> AI CANDIDATE -> HUMAN VERIFICATION -> VERIFIED -> RULES-AS-CODE -> TESTS -> PRODUCTION
```

Concretely:

- The **only** code path allowed to set `verification_status = VERIFIED` is
  `verification_service.review_entity(...)` in `apps/api/app/services/verification_service.py`,
  and it requires an authenticated `REGULATORY_REVIEWER` or `ADMIN` user
  (see `docs/architecture/human-verification.md`).
- Seed/demo scripts that promote content for demo convenience
  (`scripts/demo_apply_reviewer_approvals.py`) must call that same function with an
  explicitly-labelled `demo_reviewer (simulated review...)` identity -- never write
  `VERIFIED` directly to the database, and never silently promote content inside a
  generic seed fixture.
- A PR that adds a new way to set `verification_status = VERIFIED` (or
  `status = approved`/similar) outside `verification_service.review_entity` will be
  rejected regardless of how useful the feature is otherwise.
- Never claim "government-approved", "legally compliant", "official government
  system", "replaces MAITRI", or "replaces NSWS" anywhere in code, docs, or UI copy.

## Data categories must never mix

`data/real/` (authoritative statute text + direct transcriptions), `data/candidate/`
(AI-extracted, unverified rules), `data/synthetic/` (generated, clearly fake), and
`data/benchmarks/` (evaluation scenarios) are kept in separate directories on purpose.
Do not write code that could cause one category's content to be silently promoted
into or presented as another. Every API response that returns rule/approval content
must include its `source` (document + section) and `verification_status` fields --
don't strip them "for a cleaner response".

## Development setup

```bash
# Python side (repo root)
for pkg in shared rules-engine graph-engine change-detection impact-analysis \
           document-engine regulatory-parser workflow-engine; do
  pip install -e "packages/$pkg"
done
pip install -r apps/api/requirements.txt -r apps/api/requirements-dev.txt
pip install -e cli

# Seed a local dev database (SQLite by default)
python scripts/seed_real_corpus.py
python scripts/demo_apply_reviewer_approvals.py   # optional: promotes a documented subset to VERIFIED
python scripts/load_synthetic_dataset.py          # optional: ~5k synthetic businesses/applications

cd apps/api && uvicorn app.main:app --reload --port 8000

# Frontend
cd apps/web && npm install && npm run dev

# CLI
permitgraph status
```

Or via Docker Compose: `docker compose up --build`, then
`docker compose --profile seed run --rm seed` once Postgres is healthy.

## Running tests

```bash
python -m pytest packages/*/tests -q      # 44 cases, package-level unit tests
cd apps/api && python -m pytest -q        # 46 cases, integration tests against a real seeded DB
cd apps/web && npm run lint && npm run build
ruff check packages apps/api cli scripts  # pyflakes + syntax errors
```

All four must pass before a PR is merged; CI (`.github/workflows/ci.yml`) runs all of
them plus a Docker image build.

## Pull request process

1. Open an issue first for anything beyond a small fix/typo, especially anything
   touching the regulatory data model, verification workflow, or licensing.
2. Keep PRs focused -- one concern per PR.
3. Add/update tests for any behavior change. A PR that changes API response shapes
   without updating `apps/api/tests/` will be asked to add coverage.
4. If your change touches `data/real/` or `data/candidate/`, explain your source
   (link to the specific Gazette/India Code page, section, and retrieval date) in the
   PR description -- see `docs/PROJECT-RESEARCH.md` for the sourcing standard already
   used in this repository.
5. By submitting a contribution, you agree it is licensed under the terms in
   `LICENSE` (Apache-2.0) for code, or the applicable license described in `NOTICE`
   for non-code content (docs, data).

## Coding conventions

- Python: type hints where practical, `ruff` clean (see `ruff.toml` for the current,
  intentionally narrow rule set).
- TypeScript/React: `oxlint` clean, components kept small and colocated under
  `apps/web/src/pages` / `apps/web/src/components`.
- Every new rule/approval/regulatory-change record must carry `source` (document +
  section/page) and `verification_status`; never add a field that lets that
  provenance be omitted.
- Prefer extending an existing package (`packages/*`) over adding a new one unless
  the new concern is genuinely orthogonal (see `docs/architecture/overview.md` for the
  current package boundaries and why they were drawn that way).

## Reporting bugs / requesting features

Use GitHub Issues. For anything touching regulatory correctness (a rule that doesn't
match the actual statute text, a wrong deadline, etc.), please also flag it as a data
issue, not just a code bug -- those get routed through the human-verification review
queue (`permitgraph review queue <entity_type>` / the Review Queue page in the web UI)
rather than a direct code fix.

## Security issues

Do not open a public issue for a security vulnerability -- see `SECURITY.md`.
