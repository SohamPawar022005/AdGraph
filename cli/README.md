# `permitgraph` CLI

A thin, auditable REST client for the PermitGraph API — not a reimplementation of the
business logic. Every command maps directly to a documented API endpoint (see
`apps/api`'s `/docs`), so anything the CLI can do, any other API consumer can do too.

## Install

```bash
pip install -e packages/shared -e packages/rules-engine   # dependency of `permitgraph validate`
pip install -e cli
```

## Quick start

```bash
permitgraph status                                   # health/readiness check
permitgraph auth login --email reviewer@permitgraph.dev --password permitgraph-dev-only
permitgraph discover --industry food_processing --district Pune --employees 80 \
  --investment 50000000 --land-type midc_industrial_area
permitgraph regulations list
permitgraph rules list --status verified
permitgraph approvals graph
permitgraph businesses list
permitgraph applications create --business-profile-id <id> --approval-id single-window-application
permitgraph applications transition <application-id> under_review
permitgraph changes analyze --section "Section 16" --old-file old.txt --new-file new.txt
permitgraph changes impact <change-id>
permitgraph documents upload invoice.pdf --document-type processing_fee_receipt
permitgraph audit list --entity-type regulatory_change
permitgraph review queue rule_version
permitgraph review approve rule_version <id> --reason "Direct transcription, cross-checked against Gazette"
permitgraph validate rules-dir data/candidate/rules   # local, no API/DB -- used in CI
```

Session (API URL + bearer token) is stored at `~/.permitgraph/session.json`
(override with `PERMITGRAPH_HOME` / `PERMITGRAPH_API_URL` env vars). This is a
developer convenience file, not a credential vault — do not point it at a
production deployment with long-lived tokens.

Role-gated commands (`review approve/reject/flag`) will return a clear `403` from the
API (not a silent no-op) if the logged-in user isn't `REGULATORY_REVIEWER` or `ADMIN` —
verified in practice: logging in as `BUSINESS_USER` and attempting `review approve`
fails loudly with the server's exact error message.
