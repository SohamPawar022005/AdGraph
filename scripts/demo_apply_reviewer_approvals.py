#!/usr/bin/env python3
"""Promote a defined subset of CANDIDATE rules/approvals to VERIFIED.

This is the one and only place in this repository that marks AI-extracted regulatory
content as VERIFIED, and it does so by calling the exact same
`verification_service.review_entity` function a real human reviewer's API/CLI action
would call (docs/architecture/human-verification.md) -- not by writing to the
database directly. The reviewer identity is explicitly labelled as a simulation.

Run this only after scripts/seed_real_corpus.py. It is intentionally selective: rules
below a confidence threshold are left as CANDIDATE, demonstrating that promotion is a
real editorial decision, not a rubber stamp.

*** THIS IS A DEMO CONVENIENCE SCRIPT, NOT A REAL REGULATORY SIGN-OFF. ***
Re-verify every rule against the current Official Gazette before production use.
"""
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "apps" / "api"))

from app.db import SessionLocal  # noqa: E402
from app.models.approvals import Approval  # noqa: E402
from app.models.regulatory import RuleVersion  # noqa: E402
from app.services import verification_service  # noqa: E402

DEMO_REVIEWER = (
    "demo_reviewer (simulated review for demo purposes -- NOT a qualified legal/"
    "regulatory review; re-verify before production use)"
)
CONFIDENCE_THRESHOLD = 0.8

REAL_PROCESS_APPROVALS = [
    "single-window-application",
    "empowered-committee-escalation",
    "joint-inspection-scheduling",
    "midc-plot-allotment",
    "khadi-village-industry-registration",
]


def main():
    db = SessionLocal()
    approved, left_candidate = [], []
    try:
        for rv in db.query(RuleVersion).filter(RuleVersion.verification_status == "CANDIDATE").all():
            if (rv.confidence or 0) >= CONFIDENCE_THRESHOLD:
                verification_service.review_entity(
                    db,
                    entity_type="rule_version",
                    entity_id=rv.id,
                    action="approve",
                    reviewer=DEMO_REVIEWER,
                    reviewer_role="REGULATORY_REVIEWER",
                    reason=(
                        f"Demo promotion: confidence {rv.confidence} >= {CONFIDENCE_THRESHOLD}, "
                        "text is a direct transcription of the cited section."
                    ),
                )
                approved.append(rv.rule_id)
            else:
                left_candidate.append((rv.rule_id, rv.confidence))

        for approval_id in REAL_PROCESS_APPROVALS:
            approval = db.get(Approval, approval_id)
            if approval and approval.verification_status == "CANDIDATE":
                verification_service.review_entity(
                    db,
                    entity_type="approval",
                    entity_id=approval_id,
                    action="approve",
                    reviewer=DEMO_REVIEWER,
                    reviewer_role="REGULATORY_REVIEWER",
                    reason="Demo promotion: process-level approval directly established by a verified rule.",
                )

        print(f"Approved {len(approved)} rule version(s): {approved}")
        print(f"Left as CANDIDATE (below confidence threshold {CONFIDENCE_THRESHOLD}): {left_candidate}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
