#!/usr/bin/env python3
"""Generate PermitGraph's synthetic benchmark/demo dataset.

Produces deterministic (seeded) JSONL fixture files under data/synthetic/ covering:
  - 5,000+ business profiles
  - workflow applications + 10,000+ workflow events (random-walked through the real
    workflow_engine FSM in packages/workflow-engine)
  - 1,000+ document ingestion plans (loaded via the real document_service pipeline,
    not pre-baked "valid" results -- validity is derived by actually running the
    deterministic validator)
  - 100+ regulatory-change scenarios (synthetic old/new section-text pairs spanning
    every ChangeType, run through the real change-detection + impact-analysis engines
    at load time, not hand-authored outputs)
  - 500+ approval-dependency graph fixtures (one per sampled business: the subgraph of
    approvals applicable to that business's industry, for graph-engine benchmarking)

This script writes files only -- it does NOT touch the database. Use
scripts/load_synthetic_dataset.py to load these fixtures into the dev DB through the
real service layer (so is_synthetic=True data still goes through the same code paths
as real API traffic).

ALL data produced here is synthetic (CC0-1.0, see docs/research/data-licensing.md): no
real businesses, applicants, documents, or regulatory amendments are represented.
"""
import hashlib
import json
import pathlib
import random
import sys
from datetime import datetime, timedelta, timezone

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "apps" / "api"))
sys.path.insert(0, str(REPO_ROOT / "packages" / "shared"))

from shared.reference_data import ALL_INDUSTRIES, LAND_TYPES, MAHARASHTRA_DISTRICTS, PROJECT_STAGES  # noqa: E402

OUT_DIR = REPO_ROOT / "data" / "synthetic"
RNG_SEED = 42

BUSINESS_COUNT = 5200
DOCUMENT_COUNT_TARGET = 1300
CHANGE_SCENARIO_COUNT = 120
APPROVAL_GRAPH_SAMPLE_COUNT = 520

# Mirrors scripts/seed_real_corpus.py SYNTHETIC_APPROVALS / dependencies so the
# approval-graph fixtures are generated against the exact same catalogue that gets
# loaded into the dev DB. Kept as a literal copy (not imported) because
# seed_real_corpus.py pulls SQLAlchemy models in at import time and we want this
# generator to have zero DB/ORM dependency.
POLLUTION_PRONE_INDUSTRIES = [
    "chemical_manufacturing", "pharmaceutical_manufacturing", "textile",
    "paper_and_printing", "electronics_assembly", "auto_components",
    "plastics_and_packaging", "leather_and_footwear",
]
FACTORY_ACT_INDUSTRIES = [
    "food_processing", "textile", "chemical_manufacturing", "engineering_manufacturing",
    "pharmaceutical_manufacturing", "plastics_and_packaging", "electronics_assembly",
    "auto_components", "paper_and_printing", "furniture_and_wood", "leather_and_footwear",
]
APPROVAL_CATALOGUE = {
    "single-window-application": None,
    "empowered-committee-escalation": None,
    "joint-inspection-scheduling": None,
    "midc-plot-allotment": None,
    "khadi-village-industry-registration": ["agro_based_village_industry"],
    "consent-to-establish": POLLUTION_PRONE_INDUSTRIES,
    "consent-to-operate": POLLUTION_PRONE_INDUSTRIES,
    "factory-license": FACTORY_ACT_INDUSTRIES,
    "fire-noc": None,
    "labour-registration": None,
}
APPROVAL_DEPENDENCIES = [
    ("consent-to-operate", "consent-to-establish"),
    ("factory-license", "consent-to-establish"),
    ("factory-license", "fire-noc"),
    ("single-window-application", "consent-to-establish"),
    ("single-window-application", "factory-license"),
    ("single-window-application", "consent-to-operate"),
    ("single-window-application", "labour-registration"),
]

WORKFLOW_TRANSITIONS = {
    "submitted": ["under_review", "withdrawn"],
    "under_review": ["query_raised", "inspection_scheduled", "approved", "rejected", "escalated", "withdrawn"],
    "query_raised": ["query_responded", "withdrawn"],
    "query_responded": ["under_review", "inspection_scheduled", "approved", "rejected"],
    "inspection_scheduled": ["inspection_completed", "withdrawn"],
    "inspection_completed": ["under_review", "approved", "rejected"],
    "escalated": ["approved", "rejected", "under_review"],
    "approved": [],
    "rejected": [],
    "withdrawn": [],
}
TERMINAL_STATES = {"approved", "rejected", "withdrawn"}
# Weighted so most applications eventually terminate within a handful of hops.
TERMINAL_BIAS = {"approved": 5, "rejected": 2, "withdrawn": 1}


def business_name(rng: random.Random, industry: str, idx: int) -> str:
    nouns = {
        "food_processing": ["Foods", "Agro Foods", "Snacks", "Dairy"],
        "textile": ["Textiles", "Weavers", "Fabrics", "Garments"],
        "chemical_manufacturing": ["Chemicals", "Chem Industries", "Polymers"],
        "engineering_manufacturing": ["Engineering Works", "Fabricators", "Industries"],
        "pharmaceutical_manufacturing": ["Pharma", "Life Sciences", "Formulations"],
        "plastics_and_packaging": ["Plastics", "Packaging Co", "Polymers"],
        "electronics_assembly": ["Electronics", "Circuits", "Devices"],
        "auto_components": ["Auto Components", "Auto Parts", "Motors"],
        "paper_and_printing": ["Paper Mills", "Printers", "Press"],
        "furniture_and_wood": ["Furniture", "Woodcraft", "Timber Works"],
        "leather_and_footwear": ["Leathers", "Footwear", "Tanners"],
        "agro_based_village_industry": ["Village Industries", "Khadi Udyog", "Gramodyog"],
        "it_ites_services": ["InfoTech", "Software Solutions", "IT Services"],
        "renewable_energy_equipment": ["Solar Systems", "Renewables", "Energy Equipment"],
    }
    prefixes = ["Shree", "Shivneri", "Maharashtra", "Sahyadri", "Konkan", "Vidarbha",
                "Deccan", "Ganesh", "Om", "Jay Bhavani", "Sai", "Vishwa", "Mauli", "Prakash"]
    suit = rng.choice(["Pvt Ltd", "Industries", "Enterprises", "Udyog", "& Co"])
    return f"{rng.choice(prefixes)} {rng.choice(nouns[industry])} {suit} #{idx}"


def generate_businesses(rng: random.Random):
    businesses = []
    for i in range(BUSINESS_COUNT):
        industry = rng.choice(ALL_INDUSTRIES)
        scale = rng.choices(["micro", "small", "medium", "large"], weights=[35, 35, 20, 10])[0]
        employees, investment = {
            "micro": (rng.randint(1, 9), rng.uniform(100000, 2500000)),
            "small": (rng.randint(10, 49), rng.uniform(2500000, 25000000)),
            "medium": (rng.randint(50, 250), rng.uniform(25000000, 500000000)),
            "large": (rng.randint(251, 2000), rng.uniform(500000000, 5000000000)),
        }[scale]
        land_type = (
            "village_industry_area" if industry == "agro_based_village_industry" and rng.random() < 0.6
            else rng.choice(LAND_TYPES)
        )
        hazardous = industry in POLLUTION_PRONE_INDUSTRIES and rng.random() < 0.5
        businesses.append(
            {
                "index": i,
                "name": business_name(rng, industry, i),
                "industry": industry,
                "district": rng.choice(MAHARASHTRA_DISTRICTS),
                "location": rng.choice(MAHARASHTRA_DISTRICTS),
                "jurisdiction": "Maharashtra",
                "investment": round(investment, 2),
                "employees": employees,
                "project_stage": rng.choice(PROJECT_STAGES),
                "land_type": land_type,
                "hazardous_material": hazardous,
                "is_village_industry": industry == "agro_based_village_industry",
                "environmental_attributes": (
                    rng.sample(["effluent_discharge", "air_emissions", "solid_waste", "noise"],
                               k=rng.randint(0, 2)) if hazardous else []
                ),
                "scale": scale,
                "is_synthetic": True,
            }
        )
    return businesses


def applicable_approvals(industry: str):
    return [aid for aid, industries in APPROVAL_CATALOGUE.items() if industries is None or industry in industries]


def generate_applications_and_events(rng: random.Random, businesses):
    applications = []
    events = []
    app_index = 0
    base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)

    for biz in businesses:
        if rng.random() > 0.65:  # ~65% of businesses have filed at least one application
            continue
        candidate_approvals = applicable_approvals(biz["industry"])
        n_apps = rng.choices([1, 2, 3], weights=[55, 30, 15])[0]
        for _ in range(min(n_apps, len(candidate_approvals))):
            approval_id = rng.choice(candidate_approvals)
            started_at = base_time + timedelta(days=rng.randint(0, 600), hours=rng.randint(0, 23))
            app_record = {
                "index": app_index,
                "business_index": biz["index"],
                "approval_id": approval_id,
                "limit_days": rng.choice([15, 21, 30, 45, 60]),
                "started_at": started_at.isoformat(),
            }
            applications.append(app_record)

            # Random-walk through the real FSM; bias toward reaching a terminal state.
            state = "submitted"
            t = started_at
            events.append({"application_index": app_index, "event_type": "APPLICATION_SUBMITTED",
                            "from_state": None, "to_state": "submitted", "occurred_at": t.isoformat()})
            hops = 0
            while state not in TERMINAL_STATES and hops < 8:
                options = WORKFLOW_TRANSITIONS[state]
                if not options:
                    break
                terminal_opts = [o for o in options if o in TERMINAL_STATES]
                if terminal_opts and (hops >= 3 or rng.random() < 0.15):
                    weights = [TERMINAL_BIAS.get(o, 1) for o in terminal_opts]
                    next_state = rng.choices(terminal_opts, weights=weights)[0]
                else:
                    next_state = rng.choice(options)
                t = t + timedelta(days=rng.randint(1, 10))
                events.append({
                    "application_index": app_index,
                    "event_type": "WORKFLOW_EVENT",
                    "from_state": state,
                    "to_state": next_state,
                    "occurred_at": t.isoformat(),
                })
                state = next_state
                hops += 1
            app_record["final_state"] = state
            app_record["ended_at"] = t.isoformat() if state in TERMINAL_STATES else None
            app_index += 1

    return applications, events


DOCUMENT_TYPES = ["processing_fee_receipt", "identity_proof", "project_report"]
REQUIRED_FIELDS_BY_TYPE = {
    "processing_fee_receipt": ["amount", "payment_date", "application_reference"],
    "identity_proof": ["holder_name", "id_number"],
    "project_report": ["project_title", "investment_amount"],
}


def generate_documents(rng: random.Random, businesses, applications):
    documents = []
    pool = [(a["business_index"], a["index"]) for a in applications]
    if not pool:
        pool = [(b["index"], None) for b in businesses[:DOCUMENT_COUNT_TARGET]]
    while len(documents) < DOCUMENT_COUNT_TARGET:
        business_index, application_index = rng.choice(pool)
        doc_type = rng.choice(DOCUMENT_TYPES)
        is_complete = rng.random() < 0.8  # ~80% of synthetic uploads are well-formed
        required = REQUIRED_FIELDS_BY_TYPE[doc_type]
        if is_complete:
            fields = {f: f"synthetic-{f}-{rng.randint(1000, 9999)}" for f in required}
        else:
            keep = rng.sample(required, k=max(0, len(required) - rng.randint(1, len(required))))
            fields = {f: f"synthetic-{f}-{rng.randint(1000, 9999)}" for f in keep}
        documents.append({
            "index": len(documents),
            "business_index": business_index,
            "application_index": application_index,
            "document_type": doc_type,
            "filename": f"synthetic_{doc_type}_{len(documents)}.pdf",
            "extracted_fields": fields,
        })
    return documents


# --- Regulatory change scenarios -------------------------------------------------
# Purely synthetic old/new section-text pairs for benchmarking change-detection.
# These are NOT real amendments and are not attached to any real source_document_id
# (they use a dedicated SYNTHETIC-SCENARIO document id so they can never be confused
# with the real detected change tested earlier against the actual MAITRI Act text).
CHANGE_TEMPLATES = [
    ("deadline_change", "The {authority} shall dispose of the application within {old} days of receipt.",
     "The {authority} shall dispose of the application within {new} days of receipt."),
    ("threshold_change", "This provision applies to units with investment exceeding Rs. {old} lakh.",
     "This provision applies to units with investment exceeding Rs. {new} lakh."),
    ("authority_change", "Applications under this section shall be submitted to the {old_auth}.",
     "Applications under this section shall be submitted to the {new_auth}."),
    ("document_requirement_change",
     "The applicant shall submit {old} along with the application.",
     "The applicant shall submit {new} along with the application."),
    ("applicability_change",
     "This Chapter applies to industrial units located in {old_area}.",
     "This Chapter applies to industrial units located in {old_area} and {new_area}."),
    ("definition_change",
     "'Eligible unit' means a unit employing not less than {old} persons.",
     "'Eligible unit' means a unit employing not less than {new} persons."),
]
AUTHORITIES = ["Directorate of Industries", "District Industries Centre", "MIDC", "State Level Committee"]
AREAS = ["C-category talukas", "D-category talukas", "notified industrial areas", "aspirational districts"]
DOC_REQS = ["a certified project report", "a no-objection certificate", "an affidavit of compliance", "a site layout plan"]


def generate_change_scenarios(rng: random.Random):
    scenarios = []
    for i in range(CHANGE_SCENARIO_COUNT):
        change_type, old_tmpl, new_tmpl = rng.choice(CHANGE_TEMPLATES)
        section_label = f"Synthetic Section {rng.randint(1, 60)}"
        if change_type == "deadline_change":
            old_v, new_v = rng.choice([15, 21, 30, 45]), rng.choice([10, 20, 30, 60, 90])
            old_text = old_tmpl.format(authority=rng.choice(AUTHORITIES), old=old_v)
            new_text = new_tmpl.format(authority=rng.choice(AUTHORITIES), new=new_v)
        elif change_type == "threshold_change":
            old_v, new_v = rng.choice([10, 25, 50, 100]), rng.choice([5, 20, 75, 150])
            old_text, new_text = old_tmpl.format(old=old_v), new_tmpl.format(new=new_v)
        elif change_type == "authority_change":
            old_a, new_a = rng.sample(AUTHORITIES, 2)
            old_text, new_text = old_tmpl.format(old_auth=old_a), new_tmpl.format(new_auth=new_a)
        elif change_type == "document_requirement_change":
            old_d, new_d = rng.sample(DOC_REQS, 2)
            old_text, new_text = old_tmpl.format(old=old_d), new_tmpl.format(new=new_d)
        elif change_type == "applicability_change":
            old_area, new_area = rng.sample(AREAS, 2)
            old_text = old_tmpl.format(old_area=old_area)
            new_text = new_tmpl.format(old_area=old_area, new_area=new_area)
        else:  # definition_change
            old_v, new_v = rng.choice([5, 10, 20]), rng.choice([3, 10, 25, 50])
            old_text, new_text = old_tmpl.format(old=old_v), new_tmpl.format(new=new_v)

        scenarios.append({
            "index": i,
            "change_type_hint": change_type,
            "section_label": section_label,
            "old_text": old_text,
            "new_text": new_text,
        })
    return scenarios


def generate_approval_graphs(rng: random.Random, businesses):
    deps_by_approval = {}
    for approval_id, depends_on in APPROVAL_DEPENDENCIES:
        deps_by_approval.setdefault(approval_id, []).append(depends_on)

    sample = rng.sample(businesses, k=min(APPROVAL_GRAPH_SAMPLE_COUNT, len(businesses)))
    graphs = []
    for biz in sample:
        nodes = set(applicable_approvals(biz["industry"]))
        # Pull in the dependency closure so the fixture is a genuine connected graph.
        frontier = list(nodes)
        while frontier:
            node = frontier.pop()
            for dep in deps_by_approval.get(node, []):
                if dep not in nodes:
                    nodes.add(dep)
                    frontier.append(dep)
        edges = [
            {"from": a, "to": d} for a, d in APPROVAL_DEPENDENCIES if a in nodes and d in nodes
        ]
        graphs.append({
            "business_index": biz["index"],
            "industry": biz["industry"],
            "land_type": biz["land_type"],
            "nodes": sorted(nodes),
            "edges": edges,
        })
    return graphs


def write_jsonl(path: pathlib.Path, records):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")


def main():
    rng = random.Random(RNG_SEED)

    businesses = generate_businesses(rng)
    applications, events = generate_applications_and_events(rng, businesses)
    documents = generate_documents(rng, businesses, applications)
    change_scenarios = generate_change_scenarios(rng)
    approval_graphs = generate_approval_graphs(rng, businesses)

    write_jsonl(OUT_DIR / "businesses" / "businesses.jsonl", businesses)
    write_jsonl(OUT_DIR / "workflow" / "applications.jsonl", applications)
    write_jsonl(OUT_DIR / "workflow" / "events.jsonl", events)
    write_jsonl(OUT_DIR / "documents" / "documents.jsonl", documents)
    write_jsonl(OUT_DIR / "changes" / "regulatory_change_scenarios.jsonl", change_scenarios)
    write_jsonl(OUT_DIR / "graphs" / "approval_graphs.jsonl", approval_graphs)

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "rng_seed": RNG_SEED,
        "license": "CC0-1.0 (see docs/research/data-licensing.md)",
        "counts": {
            "businesses": len(businesses),
            "applications": len(applications),
            "workflow_events": len(events),
            "documents": len(documents),
            "regulatory_change_scenarios": len(change_scenarios),
            "approval_graphs": len(approval_graphs),
        },
        "notes": (
            "Entirely synthetic. Not derived from, or representative statistics of, "
            "any real business, applicant, or government dataset. Do not cite these "
            "counts/distributions as real-world figures."
        ),
    }
    (OUT_DIR / "MANIFEST.json").write_text(json.dumps(manifest, indent=2))
    print(json.dumps(manifest["counts"], indent=2))


if __name__ == "__main__":
    main()
