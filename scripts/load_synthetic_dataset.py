#!/usr/bin/env python3
"""Load the fixtures produced by scripts/generate_synthetic_dataset.py into the DB.

Businesses/applications/workflow-events are bulk-inserted directly (they are plain
synthetic facts, is_synthetic=True throughout). Documents and regulatory-change
scenarios are instead routed through the *real* service-layer functions
(document_service, change_service, impact_service) so this script also doubles as an
integration exercise of those pipelines against realistic volumes of data, rather than
writing pre-computed "fake" results straight into the database.

Run after scripts/seed_real_corpus.py (+ optionally
scripts/demo_apply_reviewer_approvals.py). Safe to re-run against an empty/fresh DB;
not idempotent against a DB that already has synthetic data loaded (it will add a
second copy) -- intended for fresh dev/demo databases.
"""
import json
import pathlib
import sys
from datetime import datetime, timezone

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "apps" / "api"))

from app.db import SessionLocal  # noqa: E402
from app.models.business import BusinessProfile  # noqa: E402
from app.models.regulatory import SourceDocument  # noqa: E402
from app.models.workflow import SLA, Application, WorkflowEvent  # noqa: E402
from app.services import change_service, document_service, impact_service  # noqa: E402

DATA_DIR = REPO_ROOT / "data" / "synthetic"
SYNTHETIC_SCENARIO_DOC_ID = "synthetic-scenario-corpus"


def read_jsonl(path: pathlib.Path):
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def load_businesses(db):
    records = read_jsonl(DATA_DIR / "businesses" / "businesses.jsonl")
    index_to_id = {}
    for r in records:
        biz = BusinessProfile(
            name=r["name"],
            industry=r["industry"],
            district=r["district"],
            location=r["location"],
            jurisdiction=r["jurisdiction"],
            investment=r["investment"],
            employees=r["employees"],
            project_stage=r["project_stage"],
            land_type=r["land_type"],
            hazardous_material=r["hazardous_material"],
            is_village_industry=r["is_village_industry"],
            environmental_attributes=r["environmental_attributes"],
            is_synthetic=True,
            extra_attributes={"scale": r.get("scale")},
        )
        db.add(biz)
        db.flush()
        index_to_id[r["index"]] = biz.id
    db.commit()
    print(f"  Loaded {len(records)} business profiles")
    return index_to_id


def load_applications_and_events(db, business_index_to_id):
    app_records = read_jsonl(DATA_DIR / "workflow" / "applications.jsonl")
    event_records = read_jsonl(DATA_DIR / "workflow" / "events.jsonl")

    app_index_to_id = {}
    for r in app_records:
        business_id = business_index_to_id.get(r["business_index"])
        if business_id is None:
            continue
        app = Application(
            business_profile_id=business_id,
            approval_id=r["approval_id"],
            state=r["final_state"],
            is_synthetic=True,
        )
        db.add(app)
        db.flush()
        app_index_to_id[r["index"]] = app.id

        started_at = datetime.fromisoformat(r["started_at"])
        ended_at = datetime.fromisoformat(r["ended_at"]) if r.get("ended_at") else None
        db.add(
            SLA(
                application_id=app.id,
                limit_days=r["limit_days"],
                started_at=started_at,
                completed_at=ended_at if r["final_state"] in ("approved", "rejected", "withdrawn") else None,
                escalated=(r["final_state"] == "escalated"),
                is_synthetic=True,
                source_note="Synthetic SLA limit for benchmark/demo data; not a verified statutory deadline.",
            )
        )
    db.commit()

    event_count = 0
    batch = []
    for r in event_records:
        app_id = app_index_to_id.get(r["application_index"])
        if app_id is None:
            continue
        batch.append(
            WorkflowEvent(
                application_id=app_id,
                event_type=r["event_type"],
                from_state=r["from_state"],
                to_state=r["to_state"],
                occurred_at=datetime.fromisoformat(r["occurred_at"]),
                actor="synthetic-data-generator",
                is_synthetic=True,
            )
        )
        event_count += 1
        if len(batch) >= 1000:
            db.add_all(batch)
            db.commit()
            batch = []
    if batch:
        db.add_all(batch)
        db.commit()

    print(f"  Loaded {len(app_index_to_id)} applications + SLAs, {event_count} workflow events")
    return app_index_to_id


def load_documents(db, business_index_to_id, app_index_to_id):
    records = read_jsonl(DATA_DIR / "documents" / "documents.jsonl")
    valid, invalid = 0, 0
    for r in records:
        business_id = business_index_to_id.get(r["business_index"])
        app_id = app_index_to_id.get(r["application_index"]) if r.get("application_index") is not None else None
        content = json.dumps({"synthetic_document": True, "fields": r["extracted_fields"]}).encode("utf-8")
        doc = document_service.ingest_document(
            db,
            filename=r["filename"],
            content=content,
            document_type=r["document_type"],
            business_profile_id=business_id,
            application_id=app_id,
            is_synthetic=True,
        )
        doc = document_service.validate_document(db, doc.id, r["extracted_fields"])
        if doc.validation_status == "valid":
            valid += 1
        else:
            invalid += 1
    print(f"  Loaded {len(records)} documents (validated via real pipeline: {valid} valid, {invalid} invalid)")


def load_regulatory_change_scenarios(db):
    if db.get(SourceDocument, SYNTHETIC_SCENARIO_DOC_ID) is None:
        db.add(
            SourceDocument(
                id=SYNTHETIC_SCENARIO_DOC_ID,
                title="Synthetic Change-Detection Benchmark Corpus",
                jurisdiction="N/A",
                authority="N/A (synthetic)",
                document_type="synthetic_benchmark_corpus",
                version_label="n/a",
                content_hash="0" * 64,
                retrieved_at=datetime.now(timezone.utc).isoformat(),
                source_url=None,
                file_type="n/a",
                ocr_status="not_applicable",
                notes=(
                    "Placeholder source-document row for synthetic regulatory-change-detection "
                    "benchmark scenarios. Does not represent any real Act or amendment."
                ),
            )
        )
        db.commit()

    records = read_jsonl(DATA_DIR / "changes" / "regulatory_change_scenarios.jsonl")
    total_changes, total_assessments = 0, 0
    for r in records:
        changes = change_service.analyze_and_persist(
            db,
            old_sections={r["section_label"]: r["old_text"]},
            new_sections={r["section_label"]: r["new_text"]},
            old_source_document_id=SYNTHETIC_SCENARIO_DOC_ID,
            new_source_document_id=SYNTHETIC_SCENARIO_DOC_ID,
            is_synthetic=True,
        )
        total_changes += len(changes)
        for change in changes:
            impact_service.run_impact_analysis(db, change.id)
            total_assessments += 1
    print(
        f"  Processed {len(records)} change scenarios -> {total_changes} detected changes, "
        f"{total_assessments} impact assessments (via real change-detection + impact-analysis engines)"
    )


def main():
    db = SessionLocal()
    try:
        print("Loading synthetic dataset...")
        business_index_to_id = load_businesses(db)
        app_index_to_id = load_applications_and_events(db, business_index_to_id)
        load_documents(db, business_index_to_id, app_index_to_id)
        load_regulatory_change_scenarios(db)
        print("Synthetic dataset load complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
