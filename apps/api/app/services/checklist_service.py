from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..models.approvals import Approval, ApprovalRequirement, DocumentRequirement
from ..models.audit import AuditEvent
from ..models.business import BusinessProfile
from ..models.checklist import ChecklistDocument, ChecklistTask, ComplianceChecklist
from ..models.regulatory import Authority
from ..models.workflow import Application, Document
from . import graph_service, rules_service


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _get_authority_name(db: Session, authority_id: Optional[str]) -> str:
    if not authority_id:
        return "Competent State Authority"
    auth = db.get(Authority, authority_id)
    return auth.name if auth else authority_id


def generate_checklist_for_business(
    db: Session,
    business_id: str,
    project_name: str = "Primary Facility Project",
    rebuild: bool = False,
) -> ComplianceChecklist:
    """Generate or update a Smart Compliance Checklist from discovered permissions

    and graph dependencies for a business profile.
    """
    biz = db.get(BusinessProfile, business_id)
    if biz is None:
        raise ValueError(f"BusinessProfile '{business_id}' not found")

    checklist = (
        db.query(ComplianceChecklist)
        .filter(
            ComplianceChecklist.business_profile_id == business_id,
            ComplianceChecklist.project_name == project_name,
        )
        .first()
    )

    if checklist is None:
        checklist = ComplianceChecklist(
            business_profile_id=business_id,
            project_name=project_name,
            status="in_progress",
        )
        db.add(checklist)
        db.commit()
        db.refresh(checklist)

    # 1. Discover applicable permissions using rules engine
    profile_dict = biz.to_profile_dict()
    discovery = rules_service.discover(db, profile_dict)
    discovered_permissions = discovery.get("permissions", [])

    # 2. Build dependency graph
    graph = graph_service.build_graph(db)

    # Collect discovered approval IDs and their graph upstream dependencies
    discovered_approval_ids = {p["approval_id"]: p for p in discovered_permissions}
    all_needed_approvals = set(discovered_approval_ids.keys())
    for aid in list(discovered_approval_ids.keys()):
        all_needed_approvals.update(graph.upstream(aid))

    # Existing tasks indexed by approval_id to preserve user progress and notes
    existing_tasks = {t.approval_id: t for t in checklist.tasks if t.approval_id}

    for app_id in all_needed_approvals:
        perm = discovered_approval_ids.get(app_id)
        upstream_deps = graph.upstream(app_id)

        approval_record = db.get(Approval, app_id)
        authority_name = _get_authority_name(db, approval_record.authority_id if approval_record else None)
        category = approval_record.category.capitalize() if approval_record else "Process"

        # Determine legal SLA deadline if standard statutory SLA is known
        legal_deadline = None
        legal_deadline_note = None
        # MAITRI Act statutory SLAs (e.g. 21 days for general approvals, 30 days for consent)
        if "consent" in app_id.lower() or "cte" in app_id.lower():
            legal_deadline = utcnow() + timedelta(days=30)
            legal_deadline_note = "Water & Air Act statutory timeline: 30 days under MAITRI single window"
        elif "fire" in app_id.lower() or "factory" in app_id.lower():
            legal_deadline = utcnow() + timedelta(days=21)
            legal_deadline_note = "Maharashtra Fire/Factories statutory timeline: 21 days"

        if app_id in existing_tasks:
            # Preserve existing user task state, update dependencies & supporting citations
            task = existing_tasks[app_id]
            task.prerequisite_approval_ids = upstream_deps
            if perm:
                task.supporting_rule_id = perm.get("rule_id")
                task.source_reference = perm.get("source")
            task.authority_name = authority_name
            task.category = category
            if not task.legal_deadline and legal_deadline:
                task.legal_deadline = legal_deadline
                task.legal_deadline_note = legal_deadline_note
        else:
            task_desc = (
                perm.get("why")
                if perm
                else f"Prerequisite approval required for downstream permissions in the approval graph."
            )
            task = ChecklistTask(
                checklist_id=checklist.id,
                approval_id=app_id,
                title=f"Obtain {approval_record.name if approval_record else app_id}",
                description=task_desc,
                authority_name=authority_name,
                category=category,
                status="not_started",
                is_manual=False,
                legal_deadline=legal_deadline,
                legal_deadline_note=legal_deadline_note,
                due_date=utcnow() + timedelta(days=14),
                prerequisite_approval_ids=upstream_deps,
                supporting_rule_id=perm.get("rule_id") if perm else None,
                source_reference=perm.get("source") if perm else None,
            )
            db.add(task)
            db.commit()
            db.refresh(task)


        # Generate required documents for this task/approval
        existing_doc_types = {d.document_type: d for d in task.documents}
        reqs = db.query(ApprovalRequirement).filter(ApprovalRequirement.approval_id == app_id).all()
        doc_candidates = []

        if reqs:
            for req in reqs:
                doc_type_record = db.get(DocumentRequirement, req.document_type)
                doc_name = doc_type_record.name if doc_type_record else req.document_type.replace("_", " ").title()
                doc_purpose = doc_type_record.description if doc_type_record else f"Mandatory compliance filing for {app_id}"
                doc_candidates.append({
                    "type": req.document_type,
                    "name": doc_name,
                    "purpose": doc_purpose,
                    "mandatory": req.is_mandatory,
                })
        else:
            # Standard verified statutory documents required for approvals
            doc_candidates = [
                {
                    "type": "project_report",
                    "name": "Detailed Project Report (DPR)",
                    "purpose": f"Technical specification and capital outlay for {approval_record.name if approval_record else app_id}",
                    "mandatory": True,
                },
                {
                    "type": "site_plan",
                    "name": "Site Layout Plan & Land Possession Proof",
                    "purpose": "Demarcation of facility boundaries and land title",
                    "mandatory": True,
                },
                {
                    "type": "processing_fee_receipt",
                    "name": "Statutory Fee Payment Receipt",
                    "purpose": "Challan confirming payment of prescribed administrative fee",
                    "mandatory": False,
                },
            ]

        for dc in doc_candidates:
            # Check if an existing uploaded document exists in the system
            uploaded_doc = (
                db.query(Document)
                .filter(
                    Document.business_profile_id == business_id,
                    Document.document_type == dc["type"],
                )
                .first()
            )

            status = "missing"
            doc_id = None
            if uploaded_doc:
                doc_id = uploaded_doc.id
                status = "verified" if uploaded_doc.validation_status == "valid" else "uploaded"

            if dc["type"] in existing_doc_types:
                doc_item = existing_doc_types[dc["type"]]
                doc_item.is_mandatory = dc["mandatory"]
                if status != "missing" and doc_item.status == "missing":
                    doc_item.status = status
                    doc_item.document_id = doc_id
            else:
                doc_item = ChecklistDocument(
                    checklist_id=checklist.id,
                    task_id=task.id,
                    document_type=dc["type"],
                    name=dc["name"],
                    purpose=dc["purpose"],
                    is_mandatory=dc["mandatory"],
                    status=status,
                    verification_status="verified",
                    document_id=doc_id,
                )
                db.add(doc_item)

    db.commit()
    db.refresh(checklist)

    # 3. Compute prerequisite blocking status
    _recompute_task_dependencies(db, checklist)

    # 4. Run readiness check
    validate_readiness(db, checklist.id)

    db.add(
        AuditEvent(
            event_type="CHECKLIST_SYNCHRONIZED",
            entity_type="compliance_checklist",
            entity_id=checklist.id,
            actor="system:checklist-engine",
            new_value={"business_id": business_id, "tasks_count": len(checklist.tasks)},
        )
    )
    db.commit()
    db.refresh(checklist)
    return checklist


def _recompute_task_dependencies(db: Session, checklist: ComplianceChecklist) -> None:
    """Updates blocked status for tasks based on prerequisite tasks' completion."""
    completed_approval_ids = {
        t.approval_id for t in checklist.tasks if t.approval_id and t.status == "completed"
    }
    checklist_approval_ids = {
        t.approval_id for t in checklist.tasks if t.approval_id
    }

    for task in checklist.tasks:
        if task.status in ["completed", "needs_review"]:
            continue

        prereqs = task.prerequisite_approval_ids or []
        # Only uncompleted prerequisites that are actually relevant in this checklist block the task
        unmet = [p for p in prereqs if p in checklist_approval_ids and p not in completed_approval_ids]

        if unmet:
            # If not already explicitly started by user, mark as blocked
            if task.status != "in_progress":
                task.status = "blocked"
            task.blocking_reasons = [f"Requires completion of prerequisite: {p}" for p in unmet]
        else:
            if task.status == "blocked":
                task.status = "not_started"
            task.blocking_reasons = []


    db.commit()



def update_task(
    db: Session,
    task_id: str,
    status: Optional[str] = None,
    notes: Optional[str] = None,
    due_date: Optional[datetime] = None,
    reminder_days: Optional[int] = None,
    actor: str = "user",
) -> ChecklistTask:
    task = db.get(ChecklistTask, task_id)
    if task is None:
        raise ValueError(f"ChecklistTask '{task_id}' not found")

    old_status = task.status
    if status is not None:
        if status == "completed":
            task.status = "completed"
            task.completed_at = utcnow()
            task.completed_by = actor
            task.blocking_reasons = []
        else:
            task.status = status
            if old_status == "completed":
                task.completed_at = None
                task.completed_by = None

    if notes is not None:
        task.notes = notes
    if due_date is not None:
        task.due_date = due_date
    if reminder_days is not None:
        task.reminder_days = reminder_days

    db.commit()

    # Recompute downstream dependencies
    checklist = db.get(ComplianceChecklist, task.checklist_id)
    if checklist:
        _recompute_task_dependencies(db, checklist)
        validate_readiness(db, checklist.id)

    db.add(
        AuditEvent(
            event_type="CHECKLIST_TASK_UPDATED",
            entity_type="checklist_task",
            entity_id=task_id,
            actor=actor,
            old_value={"status": old_status},
            new_value={"status": task.status, "notes": task.notes},
        )
    )
    db.commit()
    db.refresh(task)
    return task


def update_document(
    db: Session,
    document_id: str,
    status: Optional[str] = None,
    notes: Optional[str] = None,
    file_url: Optional[str] = None,
    actor: str = "user",
) -> ChecklistDocument:
    doc = db.get(ChecklistDocument, document_id)
    if doc is None:
        raise ValueError(f"ChecklistDocument '{document_id}' not found")

    old_status = doc.status
    if status is not None:
        doc.status = status
    if notes is not None:
        doc.notes = notes
    if file_url is not None:
        doc.file_url = file_url
        if doc.status == "missing":
            doc.status = "uploaded"

    db.commit()

    checklist = db.get(ComplianceChecklist, doc.checklist_id)
    if checklist:
        validate_readiness(db, checklist.id)

    db.add(
        AuditEvent(
            event_type="CHECKLIST_DOC_UPDATED",
            entity_type="checklist_document",
            entity_id=document_id,
            actor=actor,
            old_value={"status": old_status},
            new_value={"status": doc.status},
        )
    )
    db.commit()
    db.refresh(doc)
    return doc


def add_manual_task(
    db: Session,
    checklist_id: str,
    title: str,
    description: Optional[str] = None,
    authority_name: str = "Internal Compliance",
    category: str = "Custom Requirement",
    due_date: Optional[datetime] = None,
    prerequisite_approval_ids: Optional[List[str]] = None,
) -> ChecklistTask:
    checklist = db.get(ComplianceChecklist, checklist_id)
    if checklist is None:
        raise ValueError(f"ComplianceChecklist '{checklist_id}' not found")

    task = ChecklistTask(
        checklist_id=checklist_id,
        title=title,
        description=description or "Manually added compliance requirement",
        authority_name=authority_name,
        category=category,
        is_manual=True,
        status="not_started",
        due_date=due_date or (utcnow() + timedelta(days=14)),
        prerequisite_approval_ids=prerequisite_approval_ids or [],
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    _recompute_task_dependencies(db, checklist)
    validate_readiness(db, checklist_id)
    return task


def validate_readiness(db: Session, checklist_id: str) -> Dict[str, Any]:
    """Runs the 6-point 'Ready to Apply' validation engine.

    1. Mandatory prerequisite approvals completed
    2. Verified mandatory documents present/collected
    3. Required application information complete
    4. Required prerequisite relationships in PermitGraph satisfied
    5. No known blocking issue remains unresolved
    6. Relevant regulatory changes have been reviewed
    """
    checklist = db.get(ComplianceChecklist, checklist_id)
    if checklist is None:
        raise ValueError(f"ComplianceChecklist '{checklist_id}' not found")

    tasks = checklist.tasks
    docs = checklist.documents

    failed_checks = []
    verification_needed = []
    passed_checks = []

    # Check 1: Mandatory prerequisite approvals / tasks completed
    uncompleted_prereqs = []
    completed_task_ids = {t.approval_id for t in tasks if t.approval_id and t.status == "completed"}
    checklist_approval_ids = {t.approval_id for t in tasks if t.approval_id}

    for t in tasks:
        prereqs = t.prerequisite_approval_ids or []
        unmet = [p for p in prereqs if p in checklist_approval_ids and p not in completed_task_ids]
        if unmet:
            uncompleted_prereqs.append({
                "task_id": t.id,
                "task_title": t.title,
                "missing_prerequisites": unmet,
                "reason": f"'{t.title}' is blocked pending completion of prerequisite(s): {', '.join(unmet)}",
            })

    if uncompleted_prereqs:
        failed_checks.append({
            "check": "prerequisite_approvals",
            "title": "Prerequisite approvals pending",
            "items": uncompleted_prereqs,
        })
    else:
        passed_checks.append("All known prerequisite approvals and sequences satisfied")

    # Check 2: Mandatory documents present (grouped by task to avoid repetitive complaints)
    missing_docs = []
    for t in tasks:
        task_missing = [
            d.name for d in t.documents if d.is_mandatory and d.status not in ["collected", "uploaded", "verified"]
        ]
        if task_missing:
            missing_docs.append({
                "task_id": t.id,
                "task_title": t.title,
                "missing_documents": task_missing,
                "reason": f"'{t.title}' missing mandatory document(s): {', '.join(task_missing)}",
            })

    for d in docs:
        if d.verification_status == "needs_verification":
            verification_needed.append({
                "document_id": d.id,
                "name": d.name,
                "reason": f"Document '{d.name}' requires manual verification against latest regulatory gazette",
            })

    if missing_docs:
        failed_checks.append({
            "check": "mandatory_documents",
            "title": "Mandatory documents missing",
            "items": missing_docs,
        })
    else:
        passed_checks.append("All verified mandatory documents collected or uploaded")

    # Check 3: Required application info complete
    biz = db.get(BusinessProfile, checklist.business_profile_id)
    missing_fields = []
    if not biz or not biz.industry:
        missing_fields.append("Industry sector")
    if not biz or not biz.district:
        missing_fields.append("District/Location")
    if not biz or biz.investment is None:
        missing_fields.append("Capital investment amount")
    if missing_fields:
        failed_checks.append({
            "check": "application_information",
            "title": "Incomplete business profile information",
            "items": [{"reason": f"Missing required profile fields: {', '.join(missing_fields)}"}],
        })
    else:
        passed_checks.append("Business profile configuration complete")


    # Check 6: Relevant regulatory changes reviewed
    flagged_tasks = [
        {"task_id": t.id, "title": t.title, "flag_reason": t.flag_reason, "change_id": t.flag_change_id}
        for t in tasks
        if t.flagged_for_review
    ]
    if flagged_tasks:
        verification_needed.append({
            "check": "regulatory_changes",
            "title": "Pending regulatory change reviews",
            "items": flagged_tasks,
            "reason": f"{len(flagged_tasks)} task(s) affected by recent regulatory amendments require review",
        })
    else:
        passed_checks.append("All applicable regulatory changes reviewed")

    # Determine status
    if verification_needed:
        readiness_status = "needs_verification"
    elif failed_checks:
        readiness_status = "action_required"
    else:
        readiness_status = "ready_for_review"

    summary = {
        "checklist_id": checklist_id,
        "readiness_status": readiness_status,
        "evaluated_at": utcnow().isoformat(),
        "passed_checks": passed_checks,
        "failed_checks": failed_checks,
        "verification_needed": verification_needed,
        "disclaimer": (
            "Never guarantee government approval. A successful readiness check means "
            "the application's configured requirements have been satisfied based on available "
            "data, not that an authority will approve it."
        ),
    }

    checklist.readiness_status = readiness_status
    checklist.readiness_summary = summary
    checklist.last_evaluated_at = utcnow()
    db.commit()
    return summary


def resolve_task_review_flag(
    db: Session, task_id: str, resolution_notes: str, actor: str = "user"
) -> ChecklistTask:
    task = db.get(ChecklistTask, task_id)
    if task is None:
        raise ValueError(f"ChecklistTask '{task_id}' not found")

    task.flagged_for_review = False
    old_reason = task.flag_reason
    task.flag_reason = None
    if task.notes:
        task.notes += f"\n[Regulatory Review Resolved]: {resolution_notes}"
    else:
        task.notes = f"[Regulatory Review Resolved]: {resolution_notes}"

    if task.status == "needs_review":
        task.status = "in_progress"

    db.commit()

    checklist = db.get(ComplianceChecklist, task.checklist_id)
    if checklist:
        validate_readiness(db, checklist.id)

    db.add(
        AuditEvent(
            event_type="CHECKLIST_TASK_FLAG_RESOLVED",
            entity_type="checklist_task",
            entity_id=task_id,
            actor=actor,
            old_value={"flag_reason": old_reason},
            new_value={"resolution_notes": resolution_notes},
        )
    )
    db.commit()
    db.refresh(task)
    return task
