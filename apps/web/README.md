# PermitGraph Web (React + TypeScript + Vite + Tailwind)

Frontend for the PermitGraph regulatory-intelligence API (`apps/api`). No framework
beyond React Router for routing; plain `fetch` wrapper (`src/lib/api.ts`) instead of a
data-fetching library, to keep the dependency surface small and auditable.

## Running locally

```bash
# Terminal 1: API (see apps/api/README or docs/architecture)
cd apps/api && uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2: frontend dev server
cd apps/web && npm install && npm run dev
```

The Vite dev server proxies `/api`, `/health`, `/ready` to `http://127.0.0.1:8000` (see
`vite.config.ts`) — the browser only ever talks to the Vite dev server's own origin,
never to `localhost:8000` directly. This matters for any proxied/sandboxed preview
environment where the browser and the Node process are not the same network context.

## Pages (19)

| Route | Page | Notes |
|---|---|---|
| `/` | Home | USP explanation, non-fabrication disclaimer, live API health check, quick links |
| `/login` | Login | JWT auth against `/api/v1/auth/login`; demo account picker |
| `/discover` | Permission Discovery | The core applicant-facing feature: business profile → source-cited permissions/documents/dependencies |
| `/regulations` | Regulations list | The 3 source Acts |
| `/regulations/:id` | Regulation detail | Versions + sections (collapsible) |
| `/rules` | Rules list | Filterable by status (verified/candidate/deprecated/…) |
| `/rules/:id` | Rule detail | Full version history, source citation, raw rule body JSON |
| `/approvals` | Approval catalogue | Real + synthetic approvals (clearly labelled) |
| `/approvals/:id` | Approval detail | Dependency graph scoped to this approval, applicable industries |
| `/approvals-graph` | Full dependency graph | All approvals/edges, SVG layered graph view |
| `/businesses` | Businesses list | Paginated (5,200+ synthetic + any created via UI); create-business form |
| `/businesses/:id` | Business detail | Profile, its applications, its documents; file a new application |
| `/applications` | Applications list | Paginated, filterable by workflow state |
| `/applications/:id` | Application detail | SLA clock, workflow timeline, valid-transition buttons |
| `/regulatory-changes` | Regulatory changes list | Run the change-detection engine on an old/new text pair |
| `/regulatory-changes/:id` | Regulatory change detail | Old vs. new text diff view, affected rules/approvals, on-demand impact analysis |
| `/documents` | Documents list | Paginated; real file upload + deterministic structural validation |
| `/audit` | Audit log | Filterable by entity type — the system's single source of truth for "what happened" |
| `/review` | Human review queue | REGULATORY_REVIEWER/ADMIN-gated: approve/reject CANDIDATE rules, approvals, dependencies, regulatory changes |

Every "VERIFIED"/"CANDIDATE"/"SYNTHETIC" label shown anywhere in the UI is read
directly from the API's `verification_status` field — the frontend never invents its
own confidence or compliance scoring.
