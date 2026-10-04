# Human-in-the-Loop Verification Workflow

This is the single most important safety mechanism in PermitGraph. It exists to
guarantee the instruction from the project owner: **"Research → extract → candidate →
human review → verified → executable rule"** — an AI must never turn an OCR artefact or
an LLM inference into a fact silently.

## State machine

```
            extraction (AI-assisted or manual transcription)
                         │
                         ▼
                 CANDIDATE  ───────────────┐
                    │        │              │
          reviewer approves │ reviewer edits│ reviewer rejects
                    ▼        ▼              ▼
                 VERIFIED  CANDIDATE     REJECTED
                    │     (re-queued)        │
          new version supersedes             │ (terminal; visible for audit only)
                    ▼
                DEPRECATED / SUPERSEDED
```

## Enforcement points

1. **Database constraint-by-convention**: every regulatory table defaults
   `verification_status = CANDIDATE` and `status = candidate` at creation. Nothing in
   the seed scripts or extraction pipeline writes `VERIFIED` directly — it is only ever
   set by `apps/api/app/services/verification_service.review_entity(...)`, which:
   - requires an authenticated principal with role `REGULATORY_REVIEWER` or `ADMIN`,
   - writes a `VerificationRecord` (old value, new value, reviewer, reason, timestamp),
   - writes an `AuditEvent` (`RULE_VERIFIED`, `RULE_REJECTED`, etc.),
   - is the **only** function in the codebase allowed to flip `verification_status`.
2. **API surface**: `POST /api/v1/review/{entity_type}/{entity_id}` with
   `action: approve|reject|edit|flag|deprecate|supersede` is the only mutation path;
   there is no endpoint that accepts an arbitrary `verification_status` value directly
   on create/update of a Rule/Approval/Dependency.
3. **CLI**: `permitgraph review list` / `permitgraph review decide RULE_ID approve` call
   the identical service function — no separate, weaker code path.
4. **Seeding reality check**: `scripts/seed_real_corpus.py` loads the MAITRI Act /
   MID Act / Khadi Act candidate rules extracted in `data/candidate/rules/*.yaml` as
   `CANDIDATE`. A second, clearly-named script,
   `scripts/demo_apply_reviewer_approvals.py`, then calls the same
   `verification_service.review_entity` function **as an explicitly-labelled
   `demo_reviewer` principal** to promote a defined subset to `VERIFIED` so the demo
   scenario in §49 of the brief can run end-to-end. Every such action is logged with
   reviewer identity `"demo_reviewer (simulated review for demo purposes — NOT a
   qualified legal/regulatory review; re-verify before production use)"`. This keeps
   the promotion to "verified" fully transparent, auditable, and reversible, rather than
   silently hard-coding verified rows in a fixture.

## Reviewer UI contract (`apps/web`, Human Verification Queue page)

A reviewer sees, for every candidate item: source document name + hash, section label,
original source excerpt, the AI/transcription candidate text, the structured candidate
rule, which approvals/industries it would affect if approved, confidence, and any prior
notes. They can Approve / Reject / Edit / Flag-ambiguous / Deprecate / Supersede. Every
action requires a `reason` field (free text) which is stored on the `VerificationRecord`.
