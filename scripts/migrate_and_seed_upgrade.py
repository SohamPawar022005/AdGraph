#!/usr/bin/env python3
"""Migration and seed script for PermitGraph Smart Compliance Checklist and Regulatory Alerts upgrade.

Usage:
    python scripts/migrate_and_seed_upgrade.py
"""

import os
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
API_ROOT = REPO_ROOT / "apps" / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.db import Base, SessionLocal, engine
from app import models
from app.services.regulatory_alerts_service import ensure_default_sources
from app.services.checklist_service import generate_checklist_for_business
from app.models.business import BusinessProfile


def main():
    print("Applying schema migrations...")
    Base.metadata.create_all(bind=engine)
    print("Schema synchronized successfully.")

    db = SessionLocal()
    try:
        print("Ensuring default trusted regulatory sources...")
        sources = ensure_default_sources(db)
        print(f"Registered {len(sources)} regulatory sources.")

        # Seed sample checklist for the first business if available
        first_biz = db.query(BusinessProfile).first()
        if first_biz:
            print(f"Generating initial Smart Compliance Checklist for sample business: {first_biz.name} ({first_biz.id})...")
            checklist = generate_checklist_for_business(db, first_biz.id)
            print(f"Checklist created with {len(checklist.tasks)} tasks. Readiness: {checklist.readiness_status}")

        print("Upgrade migration and seeding completed successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
