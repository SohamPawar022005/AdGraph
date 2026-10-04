#!/usr/bin/env python3
"""Generate the initial CANDIDATE rules-as-code corpus from the three primary source
Acts (brief §4, §19, §26).

IMPORTANT: every rule written here is a structural/process rule or a *directly
quoted* numeric fact from the fetched statute text (see `source.url` + `notes` on
each rule for the exact citation). Nothing here invents an approval fee, deadline
day-count, subsidy, or eligibility threshold that is not literally present in the
source text. Where the Act defers a number to "prescribed rules" not included in our
three source documents (e.g. MAITRI Act s.18 "specified time limit"), the rule says
so explicitly instead of guessing a number.

Output: data/candidate/rules/*.yaml -- all status: candidate. These are promoted to
verified only via docs/architecture/human-verification.md's reviewer workflow
(see scripts/seed_real_corpus.py and scripts/demo_apply_reviewer_approvals.py).
"""
import pathlib

import yaml

OUT_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "candidate" / "rules"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MAITRI_URL = "https://www.indiacode.nic.in/bitstream/123456789/20544/1/the_maharashtra_industry,_trade_and_investment_facilitation_act,_2023.pdf"
MID_URL = "https://www.indiacode.nic.in/bitstream/123456789/19820/1/the_maharashtra_industrial_development_act,_1961..pdf"
KHADI_URL = "https://cdnbbsr.s3waas.gov.in/s36a4cbdaedcbda0fa8ddc7ea32073c475/uploads/2025/11/20251107623670327.pdf"

MAHARASHTRA_ALWAYS = {"field": "jurisdiction", "operator": "equals", "value": "Maharashtra"}

RULES = [
    dict(
        id="RULE-MAITRI-003",
        name="Permission applications must be filed through the Single Window System",
        source=dict(document="maitri-act-2023", document_version="Text as on 11 December 2024",
                    section="Section 3", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        requires=[dict(approval="single-window-application", documents=["processing_fee_receipt"])],
        actions=[dict(type="inform", metadata=dict(message=(
            "According to the configured source rule (Section 3, MAITRI Act 2023), an "
            "entrepreneur or investor setting up a new industrial undertaking, or "
            "continuing an existing one in Maharashtra, applies for the required "
            "permissions in electronic form through the Single Window System, with "
            "prescribed processing fees.")))],
        confidence=0.95,
        notes="Direct transcription of Section 3(1)-(2). Fee AMOUNT is 'as may be prescribed' "
              "in the Act and is NOT fabricated here.",
        tags=["maitri", "single-window", "filing"],
    ),
    dict(
        id="RULE-MAITRI-004",
        name="Competent Authority must decide within the specified time limit and give reasons for rejection",
        source=dict(document="maitri-act-2023", section="Section 4", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 4 of the MAITRI Act 2023, the Competent Authority must "
            "act on an application within the 'specified time limit' and must give reasons "
            "if the application is rejected. The exact day-count for the 'specified time "
            "limit' is defined under the Maharashtra Right to Public Services Act, 2015 or "
            "other relevant law, which is outside this project's supplied source corpus and "
            "is therefore NOT fabricated here.")))],
        confidence=0.9,
        notes="Direct transcription of Section 4(1)-(3). No numeric SLA day-count is invented.",
        tags=["maitri", "sla", "competent-authority"],
    ),
    dict(
        id="RULE-MAITRI-005",
        name="Applications undecided within the time limit are escalated to the Empowered Committee",
        source=dict(document="maitri-act-2023", section="Section 5", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS,
                                {"field": "sla_state", "operator": "equals", "value": "overdue"}]),
        requires=[dict(approval="empowered-committee-escalation")],
        actions=[dict(type="escalate", metadata=dict(message=(
            "According to Section 5 of the MAITRI Act 2023, if the Competent Authority "
            "fails to dispose of an application within the specified time limit, the Nodal "
            "Agency (MAITRI) transfers the application to the Empowered Committee, which "
            "then disposes of it under the relevant law.")))],
        confidence=0.9,
        notes="Direct transcription of Section 5(1)-(3).",
        tags=["maitri", "escalation", "empowered-committee"],
    ),
    dict(
        id="RULE-MAITRI-009",
        name="Empowered Committee decisions bind all parties",
        source=dict(document="maitri-act-2023", section="Section 9", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 9 of the MAITRI Act 2023, decisions of the Empowered "
            "Committee are binding on applicants, authorities and all other concerned "
            "persons, notwithstanding anything in any other relevant law.")))],
        confidence=0.95,
        notes="Direct transcription of Section 9.",
        tags=["maitri", "empowered-committee", "binding"],
    ),
    dict(
        id="RULE-MAITRI-013",
        name="Supervisory Committee decisions bind all parties",
        source=dict(document="maitri-act-2023", section="Section 13", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 13 of the MAITRI Act 2023, decisions of the Supervisory "
            "Committee are binding on applicants, authorities and all other concerned "
            "persons.")))],
        confidence=0.95,
        notes="Direct transcription of Section 13.",
        tags=["maitri", "supervisory-committee", "binding"],
    ),
    dict(
        id="RULE-MAITRI-014",
        name="MAITRI is the statutory Nodal Agency for the Single Window System",
        source=dict(document="maitri-act-2023", section="Section 14", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 14 of the MAITRI Act 2023, the Maharashtra Industry, "
            "Trade and Investment Facilitation Cell (MAITRI) is the Nodal Agency for the "
            "Single Window System in Maharashtra.")))],
        confidence=1.0,
        notes="Direct transcription of Section 14(1).",
        tags=["maitri", "nodal-agency"],
    ),
    dict(
        id="RULE-MAITRI-016",
        name="Inspections should be rationalised: conducted jointly, based on random selection",
        source=dict(document="maitri-act-2023", section="Section 16", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        requires=[dict(approval="joint-inspection-scheduling")],
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 16 of the MAITRI Act 2023, inspections under relevant "
            "law by concerned authorities shall, as far as practicable, be conducted "
            "jointly and based on random selection.")))],
        confidence=0.9,
        notes="Direct transcription of Section 16.",
        tags=["maitri", "inspection"],
    ),
    dict(
        id="RULE-MAITRI-018",
        name="Time limits for Committees and query responses are fixed by prescribed rules",
        source=dict(document="maitri-act-2023", section="Section 18", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 18 of the MAITRI Act 2023, the Supervisory Committee, "
            "Empowered Committee, Nodal Agency and Competent Authorities must exercise "
            "their powers, discharge their functions, and respond to entrepreneur/investor "
            "queries within time limits fixed by rules made under the Act. PermitGraph does "
            "not fabricate the specific day-counts because the implementing rules were not "
            "part of the supplied source corpus.")))],
        confidence=0.85,
        notes="Direct transcription of Section 18(1)-(2); no day-count invented.",
        tags=["maitri", "sla"],
    ),
    dict(
        id="RULE-MAITRI-019",
        name="Nodal Agency may levy prescribed fees for Single Window services",
        source=dict(document="maitri-act-2023", section="Section 19", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 19 of the MAITRI Act 2023, the Nodal Agency may levy "
            "such fees as may be prescribed for services availed through the Single Window "
            "System. The fee amount is not fixed in the Act itself and is therefore not "
            "fabricated here.")))],
        confidence=0.9,
        notes="Direct transcription of Section 19 ('Power to levy fees').",
        tags=["maitri", "fees"],
    ),
    dict(
        id="RULE-MAITRI-020",
        name="An Online Wizard Module must exist to help identify required permissions",
        source=dict(document="maitri-act-2023", section="Section 20", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 20 of the MAITRI Act 2023, the Nodal Agency must design "
            "and develop a comprehensive Online Wizard Module that accepts inputs such as "
            "type of industrial undertaking, number of employees and location, and provides "
            "links to relevant application forms and notifications. PermitGraph's Permission "
            "Discovery feature is explicitly NOT a replacement for this statutory Wizard; it "
            "is a complementary, source-cited rules layer (see README 'What PermitGraph is "
            "NOT').")))],
        confidence=1.0,
        notes="Direct transcription of Section 20(1)-(3).",
        tags=["maitri", "wizard"],
    ),
    dict(
        id="RULE-MAITRI-021",
        name="Draft policies/rules/regulations may be published for public consultation",
        source=dict(document="maitri-act-2023", section="Section 21", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 21 of the MAITRI Act 2023, the Nodal Agency and "
            "concerned authorities may publish drafts of policies, rules and regulations "
            "on the Single Window System and must duly consider public comments or "
            "feedback received.")))],
        confidence=0.9,
        notes="Direct transcription of Section 21.",
        tags=["maitri", "public-consultation"],
    ),
    dict(
        id="RULE-MAITRI-022",
        name="Officials owe a confidentiality duty over applicants' intellectual property",
        source=dict(document="maitri-act-2023", section="Section 22", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 22 of the MAITRI Act 2023, no government agency or "
            "authority, or functionary thereunder, may disclose to any unauthorised person "
            "any information forming the intellectual property of an entrepreneur or "
            "investor, without their consent.")))],
        confidence=0.95,
        notes="Direct transcription of Section 22.",
        tags=["maitri", "confidentiality"],
    ),
    dict(
        id="RULE-MAITRI-025",
        name="The MAITRI Act has overriding effect over other State law",
        source=dict(document="maitri-act-2023", section="Section 25", url=MAITRI_URL),
        effective=dict(**{"from": "2023-07-03"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 25 of the MAITRI Act 2023, save as otherwise provided in "
            "the Act, its provisions (and rules made under it) have overriding effect over "
            "any inconsistent State law.")))],
        confidence=0.95,
        notes="Direct transcription of Section 25.",
        tags=["maitri", "overriding-effect"],
    ),
    dict(
        id="RULE-MID-014",
        name="MIDC's statutory function includes developing industrial areas/estates and allotting them to undertakings",
        source=dict(document="maharashtra-industrial-development-act-1961", section="Section 14", url=MID_URL),
        effective=dict(**{"from": "1962-01-01"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS]),
        requires=[dict(approval="midc-plot-allotment")],
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 14 of the Maharashtra Industrial Development Act, 1961, "
            "the Corporation's functions include establishing and managing industrial "
            "estates, and developing industrial areas selected by the State Government and "
            "making them available for undertakings to establish themselves.")))],
        confidence=0.85,
        notes="Direct transcription of Section 14(i)-(ii)(a)-(b), extracted from the official "
              "India Code text mirror; original scanned PDF not present in this build "
              "environment (see docs/PROJECT-RESEARCH.md Limitations).",
        tags=["midc", "land", "industrial-area"],
    ),
    dict(
        id="RULE-MID-042A",
        name="Unutilised surplus land in MIDC industrial areas may be reacquired and reallotted",
        source=dict(document="maharashtra-industrial-development-act-1961", section="Section 42A", url=MID_URL),
        effective=dict(**{"from": "1962-01-01"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS,
                                {"field": "land_type", "operator": "equals", "value": "midc_industrial_area"}]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 42A of the Maharashtra Industrial Development Act, 1961, "
            "the State Government may direct the Corporation to ascertain whether land in an "
            "industrial area has been fully utilised for industrial purposes, as a basis for "
            "potential reacquisition of unutilised surplus land.")))],
        confidence=0.7,
        notes="Direct transcription (partial) of Section 42A(1); exact reacquisition procedure "
              "beyond this excerpt was not in the fetched source text and is not fabricated.",
        tags=["midc", "land", "compliance-risk"],
    ),
    dict(
        id="RULE-MID-046",
        name="Using MIDC land/buildings contrary to terms of holding is punishable (fine up to Rs. 5,000)",
        source=dict(document="maharashtra-industrial-development-act-1961", section="Section 46", url=MID_URL),
        effective=dict(**{"from": "1962-01-01"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS,
                                {"field": "land_type", "operator": "equals", "value": "midc_industrial_area"}]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 46 of the Maharashtra Industrial Development Act, 1961, "
            "any person who uses land or a building in an industrial estate or industrial "
            "area contrary to the terms under which they hold it, or in contravention of "
            "applicable regulations, is on conviction punishable with a fine which may "
            "extend to five thousand rupees.")))],
        confidence=0.9,
        notes="This is a DIRECT QUOTE from the fetched Section 46 text: 'punished with fine "
              "which may extend to five thousand rupees.' Included because it is an exact "
              "statutory figure, not an inference -- demonstrates PermitGraph correctly "
              "distinguishing a quoted fact from a fabricated one. Note the amount may have "
              "been amended since the 1961 Act's original enactment; verify against the "
              "current Gazette text before relying on it.",
        tags=["midc", "penalty"],
    ),
    dict(
        id="RULE-MID-048",
        name="Corporation officers have statutory powers of entry for inspection",
        source=dict(document="maharashtra-industrial-development-act-1961", section="Section 48", url=MID_URL),
        effective=dict(**{"from": "1962-01-01"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS,
                                {"field": "land_type", "operator": "equals", "value": "midc_industrial_area"}]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 48 of the Maharashtra Industrial Development Act, 1961, "
            "an officer of the State Government, a member of the Corporation, or a person "
            "authorised by the Corporation, may enter upon any land or building for "
            "purposes specified in the Act (e.g. inspection).")))],
        confidence=0.75,
        notes="Direct transcription (partial) of Section 48; full enumerated purposes beyond "
              "the fetched excerpt are not fabricated.",
        tags=["midc", "inspection"],
    ),
    dict(
        id="RULE-KHADI-001",
        name="The Maharashtra Khadi and Village Industries Act applies statewide",
        source=dict(document="maharashtra-khadi-and-village-industries-act-1960", section="Section 1", url=KHADI_URL),
        effective=dict(**{"from": "1960-04-11"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS,
                                {"field": "is_village_industry", "operator": "equals", "value": True}]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 1 of the Maharashtra Khadi and Village Industries Act "
            "(originally the Bombay Khadi and Village Industries Act, 1960; renamed by Mah. "
            "24 of 2012), the Act extends to the whole of the State of Maharashtra.")))],
        confidence=0.95,
        notes="Direct transcription of Section 1(1)-(3), sourced from the official India Code "
              "text mirror ('Text as on 4 September 2025'); original scanned PDF not present "
              "in this build environment.",
        tags=["khadi", "jurisdiction"],
    ),
    dict(
        id="RULE-KHADI-002F",
        name="A 'village industry' includes Schedule industries, cottage/small-scale/handicraft industries, or State-notified industries",
        source=dict(document="maharashtra-khadi-and-village-industries-act-1960", section="Section 2(f)", url=KHADI_URL),
        effective=dict(**{"from": "1960-04-11"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS,
                                {"field": "is_village_industry", "operator": "equals", "value": True}]),
        requires=[dict(approval="khadi-village-industry-registration")],
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 2(f) of the Maharashtra Khadi and Village Industries Act, "
            "a 'village industry' means an industry specified in the Schedule to the Khadi "
            "and Village Industries Commission Act, 1956, any cottage/small-scale/handicraft "
            "industry, or any other industry the State Government specifies by notification "
            "in consultation with the Commission and Board.")))],
        confidence=0.85,
        notes="Direct transcription of Section 2(f) (as amended).",
        tags=["khadi", "definition", "classification"],
    ),
    dict(
        id="RULE-KHADI-003",
        name="The Maharashtra State Khadi and Village Industries Board is the statutory authority for this Act",
        source=dict(document="maharashtra-khadi-and-village-industries-act-1960", section="Section 3", url=KHADI_URL),
        effective=dict(**{"from": "1960-04-11"}),
        applies_when=dict(all=[MAHARASHTRA_ALWAYS,
                                {"field": "is_village_industry", "operator": "equals", "value": True}]),
        actions=[dict(type="inform", metadata=dict(message=(
            "According to Section 3 of the Maharashtra Khadi and Village Industries Act, "
            "the State Government establishes the Maharashtra State Khadi and Village "
            "Industries Board, which administers the Act.")))],
        confidence=0.85,
        notes="Direct transcription of Section 3 heading and opening text.",
        tags=["khadi", "authority"],
    ),
]


def main():
    for rule in RULES:
        rule_copy = dict(rule)
        rule_copy.setdefault("jurisdiction", "Maharashtra")
        rule_copy.setdefault("status", "candidate")
        rule_copy.setdefault("version", "v1")
        out_path = OUT_DIR / f"{rule_copy['id'].lower()}.yaml"
        with open(out_path, "w", encoding="utf-8") as fh:
            yaml.safe_dump(rule_copy, fh, sort_keys=False, allow_unicode=True)
        print(f"wrote {out_path}")
    print(f"\nTotal candidate rules generated: {len(RULES)}")


if __name__ == "__main__":
    main()
