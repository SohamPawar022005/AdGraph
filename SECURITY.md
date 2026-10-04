# Security Policy

PermitGraph is an open-source **research/demonstration prototype**. It is **not** a
production government system, has not been through a security audit, and should not
be deployed with real applicant data, real credentials, or real regulatory authority
without a hardening review first. Please read this document before reporting an issue
or deploying beyond a local/dev environment.

## Reporting a vulnerability

If you discover a security vulnerability (including but not limited to: auth bypass,
injection, insecure deserialization, secrets exposure, or a way to make unverified
regulatory content appear as `VERIFIED` without going through
`docs/architecture/human-verification.md`'s reviewer workflow):

1. **Do not open a public GitHub issue for it.**
2. Open a private report via GitHub's "Report a vulnerability" feature on this
   repository (Security tab -> "Report a vulnerability"), which reaches maintainers
   privately.
3. Include: a description of the issue, steps to reproduce, affected
   component/endpoint, and (if known) suggested remediation.

We aim to acknowledge reports within 7 days. As a volunteer-maintained prototype
there is no formal SLA, but security reports are prioritized over feature work.

## Known, intentional, documented weaknesses (not "vulnerabilities" to report)

These are already known and tracked; please don't file duplicate reports for them,
though pull requests fixing them are welcome:

- **Dev-only secrets.** `PERMITGRAPH_SECRET_KEY` defaults to
  `dev-only-insecure-secret-change-me` and the seed scripts create demo accounts with
  the password `permitgraph-dev-only` for every RBAC role (see `scripts/seed_real_corpus.py`).
  **Never** use these in a deployment reachable outside your own machine. Set
  `PERMITGRAPH_SECRET_KEY` to a real secret and do not run the seed scripts (or rotate
  all demo account passwords immediately) in any shared environment.
- **Open-read catalogue endpoints.** By design, most read endpoints (`/api/v1/regulations`,
  `/rules`, `/approvals`, `/businesses`, `/applications`, `/documents`, `/audit-events`,
  `/regulatory-changes`, `/impact`, `/permissions/discover`) do not require
  authentication in this MVP -- only the human-verification write path
  (`POST /api/v1/review/...`) is role-gated. This matches the project's current scope
  (a public regulatory-intelligence API), but if you deploy with sensitive synthetic
  business data you consider non-public, put an authenticating reverse proxy in front
  of the API rather than assuming the API itself restricts read access.
- **SQLite by default.** The default `DATABASE_URL` is a local SQLite file, fine for
  development but not for concurrent production load; use the Postgres service in
  `docker-compose.yml` for anything beyond a single-user demo.
- **No TLS termination included.** `docker-compose.yml` and the dev servers serve
  plain HTTP; put a TLS-terminating reverse proxy in front for any non-localhost use.
- **CORS is wide open** (`cors_allow_origins: ["*"]` by default in
  `apps/api/app/core/config.py`) -- tighten this via the `CORS_ALLOW_ORIGINS`-equivalent
  setting before any non-local deployment.

## Supported versions

This project has not yet made a `1.0` release. Security fixes land on the default
branch; there is no separate maintenance branch at this stage (see `CHANGELOG.md`).

## Scope

In scope: `apps/`, `packages/`, `cli/`, `docker/`, `scripts/`.

Out of scope: vulnerabilities in third-party dependencies themselves (report those
upstream; a PR bumping a pinned version here is still welcome), and the synthetic/
candidate regulatory *data* being factually wrong in a way that is **not** a security
issue -- that's a data-quality issue, please open a normal GitHub issue referencing
`docs/architecture/human-verification.md` instead.
