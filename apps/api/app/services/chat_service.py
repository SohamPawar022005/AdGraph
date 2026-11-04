from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Dict, Generator, List, Optional
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..models.approvals import Approval, ApprovalDependency
from ..models.regulatory import RuleVersion, SourceDocument

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT_EN = (
    "> **Statutory Disclaimer:** *PermitGraph is an open-source regulatory intelligence "
    "infrastructure tool and not an official government portal. Official applications must "
    "be verified and filed via MAITRI (maitri.mahaonline.gov.in) or NSWS.*"
)

DISCLAIMER_TEXT_MR = (
    "> **वैधानिक अस्वीकरण:** *परमिटग्राफ हे नियामक माहितीसाठीचे एक खुले तंत्रज्ञान साधन आहे. "
    "अधिकृत अर्जांची पडताळणी आणि नोंदणी 'मैत्री' (maitri.mahaonline.gov.in) किंवा NSWS पोर्टलवरूनच करणे बंधनकारक आहे.*"
)

SURPRISE_INSPECTION_KEYWORDS = {
    "raid", "raided", "raiding", "inspect", "inspection", "inspections",
    "inspector", "flying", "squad", "tukaram", "munde", "mundhe",
    "officer", "commissioner", "panchnama", "seizure", "seized", "sample",
    "samples", "audit", "surprise", "visit", "check", "checking"
}

HOSPITALITY_KEYWORDS = {
    "hotel", "hotels", "restaurant", "restaurants", "dhaba", "canteen",
    "bar", "lodging", "eating", "house", "food", "kitchen", "cafe",
    "resort", "bakery", "sweet", "caterer", "catering", "fssai", "fda"
}


def _get_relevant_context(
    db: Session,
    query: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> tuple[str, list[dict], bool, bool]:
    """Query approvals, rules, and dependencies relevant to the user query and multi-turn context."""
    user_past_queries = [
        t.get("content", "")
        for t in (history or [])
        if t.get("role") == "user" and t.get("content")
    ]
    # Build a combined search text to maintain context across conversational turns
    combined_search = " ".join(user_past_queries[-3:] + [query]).lower()
    all_search_words = set(re.findall(r"\w+", combined_search))
    current_words = [w for w in re.findall(r"\w+", query.lower()) if len(w) > 2]

    is_inspection = any(k in combined_search for k in SURPRISE_INSPECTION_KEYWORDS)
    is_hospitality = any(k in combined_search for k in HOSPITALITY_KEYWORDS)

    all_approvals = db.query(Approval).all()
    all_deps = db.query(ApprovalDependency).all()

    upstream_map: dict[str, list[str]] = {}
    for d in all_deps:
        upstream_map.setdefault(d.approval_id, []).append(d.depends_on_approval_id)

    matched_approvals = []
    for a in all_approvals:
        score = 0
        name_lower = a.name.lower()
        desc_lower = (a.description or "").lower()
        id_lower = a.id.lower()
        cat_lower = (a.category or "").lower()

        # Score matching words from current query
        for w in current_words:
            if w in id_lower:
                score += 5
            if w in name_lower:
                score += 4
            if w in cat_lower:
                score += 3
            if w in desc_lower:
                score += 2

        # Historical context words
        for w in all_search_words:
            if len(w) > 3:
                if w in id_lower:
                    score += 2
                if w in name_lower:
                    score += 2

        # Domain-aware contextual boosting
        if is_hospitality:
            if a.id in ("fssai-food-license", "municipal-eating-house-license", "water-potability-certificate"):
                score += 15
            elif a.id in ("fire-safety-compliance", "fire-noc", "shops-establishments-act"):
                score += 10
            # Deprioritize heavy manufacturing/MIDC plot when dealing with hotels unless explicitly mentioned
            if "midc" not in combined_search and "manufacturing" not in combined_search:
                if a.id in ("midc-plot-allotment", "khadi-village-industry-registration", "consent-to-establish"):
                    score -= 8

        if is_inspection:
            if a.id in ("joint-inspection-scheduling", "empowered-committee-escalation"):
                score += 14

        matched_approvals.append((score, a))

    matched_approvals.sort(key=lambda x: x[0], reverse=True)
    selected_approvals = [a for score, a in matched_approvals if score > 0][:6]
    if not selected_approvals:
        selected_approvals = [a for _, a in matched_approvals[:6]]

    matched_rules = []
    all_rules = db.query(RuleVersion).filter(RuleVersion.status.in_(["verified", "candidate"])).all()
    for r in all_rules:
        r_name = (r.rule_body or {}).get("name", "").lower()
        r_id = r.rule_id.lower()
        rule_score = 0
        for w in current_words:
            if w in r_name or w in r_id:
                rule_score += 3
        for w in all_search_words:
            if len(w) > 3 and (w in r_name or w in r_id):
                rule_score += 1

        if is_inspection and r.rule_id == "RULE-MAITRI-016":
            rule_score += 10
        if rule_score > 0:
            matched_rules.append((rule_score, r))

    matched_rules.sort(key=lambda x: x[0], reverse=True)
    selected_rules = [r for _, r in matched_rules[:4]]

    lines = ["### Verified Approvals & Dependencies in PermitGraph:"]
    citations = []
    for a in selected_approvals:
        deps = upstream_map.get(a.id, [])
        dep_str = ", ".join(deps) if deps else "None (can be applied initially)"
        lines.append(
            f"- Approval ID: `{a.id}` | Name: '{a.name}' | Category: {a.category} | Authority: {a.authority_id or 'Government of Maharashtra'}\n"
            f"  Prerequisites (must obtain first): {dep_str}"
        )
        citations.append({
            "id": a.id,
            "title": a.name,
            "type": "approval",
            "url": f"/approvals/{a.id}",
        })

    if selected_rules:
        lines.append("\n### Relevant Regulatory Rules (Rules-as-Code):")
        for r in selected_rules:
            body = r.rule_body or {}
            source = body.get("source", {})
            lines.append(
                f"- Rule `{r.rule_id}`: {body.get('name')}\n"
                f"  Citation: {source.get('document', r.source_document_id)} {source.get('section', r.source_section or '')} (Status: {r.status})"
            )
            citations.append({
                "id": r.rule_id,
                "title": body.get("name", r.rule_id),
                "type": "rule",
                "url": f"/rules",
            })

    if is_inspection or is_hospitality:
        lines.append("\n### Maharashtra Statutory Framework for Food Establishments & On-Site Inspections:")
        lines.append("- **Food Safety and Standards Act (FSSAI) 2006 & FDA Maharashtra**:")
        lines.append("  * Section 31: Mandatory valid FSSAI State License / Registration Certificate; Food Safety Display Board (Purple FSDB) must be displayed at entry.")
        lines.append("  * Form IX: Medical Fitness Certificates for all food handlers (testing for typhoid, skin infections, communicable diseases).")
        lines.append("  * Water Potability Report: NABL/State Lab water quality certificate as per IS 10500 standard (valid within 6 months).")
        lines.append("  * RuCO (Repurpose Used Cooking Oil) Log: Total Polar Compounds (TPC) must not exceed 25%.")
        lines.append("  * Pest Control Log: Active pest control AMC and quarterly service slips.")
        lines.append("  * Refrigerator & Chiller Logs: Deep freezer (<= -18 deg C) and chillers (1 deg C to 4 deg C).")
        lines.append("  * Ingredient Purchase Invoices: Purchase bills with suppliers' FSSAI registration numbers.")
        lines.append("- **Maharashtra Fire Prevention and Life Safety Measures Act 2006**:")
        lines.append("  * Fire Safety NOC and Form B Bi-annual Audit Certificate issued by licensed agency.")
        lines.append("  * Unblocked emergency egress staircases and certified fire extinguishers.")
        lines.append("- **Maharashtra Municipal Corporation Act (MMC Act Sec 394)**:")
        lines.append("  * Municipal Health Trade License / Eating House License from local Urban Local Body.")
        lines.append("- **Maharashtra Shops & Establishments Act 2017**:")
        lines.append("  * Form C (Registration) or Form F (Intimation) with staff muster/wage registers.")
        lines.append("- **Mandatory Statutory Rights of Establishment Owners (MAITRI Act 2023 Sec 16 & FSSAI Sec 38/47)**:")
        lines.append("  * Right to Verify Authority: Inspecting officers (FDA, Municipal, Police) must carry valid photo ID and a written Inspection Authorization Memo.")
        lines.append("  * Right to Panchanama: Any search, sample seizure, or inspection must be conducted in the presence of two independent local witnesses (Panchas) with a copy provided to owner immediately.")
        lines.append("  * Rule of 4 Sealed Samples (FSSAI Sec 47): Any food sample collected MUST be divided into 4 parts, sealed in owner's presence, and one sealed part handed directly to the owner for independent lab testing.")
        lines.append("  * 48-Hour Electronic Upload SLA: Inspection reports must be uploaded to the official state portal within 48 hours under MAITRI Act Sec 16(2).")
        lines.append("  * Grievance Escalation: Unlawful confiscation of cash or arbitrary closure can be escalated to the Maharashtra Empowered Committee under MAITRI Act Sec 5.")
    else:
        lines.append("\n### Governing Legal Statutes:")
        lines.append("- Maharashtra Industry, Trade and Investment Facilitation (MAITRI) Act 2023 (Single-Window framework, deemed approvals, time limits)")
        lines.append("- Maharashtra Industrial Development (MID) Act 1961 (MIDC land allotment, building plans, water connection)")
        lines.append("- Water (Prevention and Control of Pollution) Act 1974 & Air Act 1981 (MPCB Consent to Establish / Operate)")
        lines.append("- Factories Act 1948 (Factory Building Plan Approval & Factory License)")

    return "\n".join(lines), citations, is_inspection, is_hospitality


def _build_system_prompt(context_str: str, language: str = "en") -> str:
    if language == "mr":
        return (
            "तुम्ही परमिटग्राफ (PermitGraph) चे अधिकृत नियामक आणि वैधानिक सहाय्यक (AI Regulatory Co-Pilot) आहात. "
            "तुम्ही महाराष्ट्र राज्यातील औद्योगिक व व्यावसायिक परवानग्या, अन्न सुरक्षा कायदा (FSSAI) २००६, "
            "अग्निशामक सुरक्षा, मैत्री (MAITRI) कायदा २०२३ आणि ऑन-साइट तपासणी नियमांचे तज्ज्ञ आहात.\n\n"
            "महत्त्वाचे मार्गदर्शक तत्त्वे:\n"
            "१. तपासणी आणि धाड (Raids / Surprise Inspections): जर वापरकर्त्याने हॉटेल, रेस्टॉरंट किंवा आस्थापनेवर धाड (उदा. तुकाराम मुंढे, FDA किंवा महापालिका अधिकारी) पडल्याचे सांगितले, तर थेट, मुद्देसूद आणि वैधानिक मार्गदर्शन करा. 'मी कायदेशीर सल्ला देऊ शकत नाही' असा नकारात्मक नकार देऊ नका.\n"
            "२. सादर करावयाची कागदपत्रे: वापरकर्त्याने 'काय सादर करावे?' किंवा 'काय तयार ठेवावे?' असे विचारल्यास हॉटेलसाठी अनिवार्य कागदपत्रांची यादी स्पष्ट करा:\n"
            "   - अन्न व औषध प्रशासन (FDA/FSSAI): FSSAI परवाना, 'फॉर्म ९' कर्मचाऱ्यांचे वैद्यकीय प्रमाणपत्र, NABL प्रयोगशाळेचा पिण्याच्या पाण्याचा अहवाल (IS 10500), वापरलेल्या तेलाची RuCO नोंदवही (TPC <= २५%), पेस्ट कंट्रोल करार.\n"
            "   - महानगरपालिका: आरोग्य व्यापार परवाना (MMC Act कलम ३९४).\n"
            "   - अग्निशामक दल: फायर NOC आणि 'फॉर्म बी' (Form B) द्विवार्षिक सुरक्षा प्रमाणपत्र.\n"
            "   - कामगार विभाग: दुकाने व आस्थापना नोंदणी (फॉर्म सी / गुमास्ता).\n"
            "३. व्यावसायिकांचे वैधानिक हक्क: दोन स्वतंत्र पंचांसमक्ष पंचनामा, अन्न सुरक्षा कायदा कलम ४७ नुसार नमुन्याचे ४ सीलबंद भाग करून एक भाग तत्काळ मालकाकडे देणे, आणि मैत्री कायदा २०२३ कलम १६ नुसार ४८ तासांत ऑनलाइन अहवाल सादर करण्याचे बंधन.\n"
            "४. अचूकता व भाषा: संपूर्ण उत्तर शुद्ध आणि अधिकृत प्रशासकीय मराठीत (Formal Marathi) द्या. काल्पनिक माहिती सांगू नका.\n"
            "५. वैधानिक अस्वीकरण: उत्तराच्या शेवटी वैधानिक अस्वीकरण अनिवार्यपणे समाविष्ट करा.\n\n"
            f"अधिकृत वैधानिक संदर्भ:\n{context_str}\n"
        )
    return (
        "You are the PermitGraph AI Regulatory Co-Pilot, an authoritative expert on "
        "Maharashtra statutory clearances, commercial and industrial compliance, and the MAITRI Act 2023.\n\n"
        "YOUR GUIDING PRINCIPLES:\n"
        "1. GROUNDING: Base your answers on the provided regulatory context and Maharashtra statutes. "
        "Do NOT invent fictional fees, fake clearances, or arbitrary deadlines.\n"
        "2. ON-SITE INSPECTIONS & RAIDS: When responding to surprise inspections, raids, or enforcement actions by "
        "government officials (e.g. Tukaram Mundhe, Food and Drugs Administration (FDA) Maharashtra, Municipal Health Officers, "
        "Fire Officers, or Labour Inspectors):\n"
        "   - DO NOT issue a robotic disclaimer refusing legal advice or advising to consult a lawyer as your primary answer.\n"
        "   - Act as an authoritative, calm, step-by-step regulatory advisor.\n"
        "   - Structure your response cleanly:\n"
        "     * Part 1: Immediate On-Site Protocol (First 5 Minutes) — Request official photo ID and written inspection memo; cooperate without obstructing; assign a single spokesperson.\n"
        "     * Part 2: Mandatory Documents to Present on the Spot — Tabulate/bulletize into Food Safety (FSSAI license, Form IX Staff Medical Fitness, IS 10500 Water Potability, RuCO Oil Log, Pest Control AMC), Municipal Health Trade License (MMC Act Sec 394), Fire NOC & Form B Bi-annual Audit, and Shops & Est Form C.\n"
        "     * Part 3: Physical Kitchen & Premises Checklist — Food handlers with aprons/hairnets/gloves, deep freezer temp (<= -18°C), chiller temp (1-4°C), no expired raw materials, unblocked fire exits.\n"
        "     * Part 4: Statutory Rights of the Business Owner — Mandatory Panchanama with 2 independent witnesses, 4 sealed sample divisions with one handed directly to owner (FSSAI Sec 47), 48-hour electronic report upload requirement under MAITRI Act 2023 Section 16, and right to escalate arbitrary harassment to the Maharashtra Empowered Committee.\n"
        "3. MULTI-TURN CONTEXT & PRONOUNS: In follow-up queries (such as 'what should I keep ready to present him?'), "
        "recognize that 'him' refers to the inspecting officer / commissioner and directly provide the practical document "
        "presentation file/binder checklist without restarting generic industrial sequencing.\n"
        "4. LINKS: Where helpful, mention approval IDs or names formatted as markdown links e.g. [Approval Name](/approvals/<id>).\n"
        "5. STRUCTURE: Use concise bullet points, bold headers, and numbered steps.\n"
        "6. DISCLAIMER: Always conclude your response with the standard statutory disclaimer.\n\n"
        f"VERIFIED REGULATORY CONTEXT:\n{context_str}\n"
    )


def _call_gemini(api_key: str, model_name: str, system_prompt: str, user_prompt: str, history: list[dict]) -> tuple[str, str]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    candidate_models = [
        model_name,
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.8-flash",
    ]
    last_err = None

    for m in candidate_models:
        try:
            contents = []
            for turn in history[-6:]:
                role = "user" if turn.get("role") == "user" else "model"
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=turn.get("content", ""))]))
            contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)]))

            response = client.models.generate_content(
                model=m,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.3,
                    max_output_tokens=1000,
                ),
            )
            if response and response.text:
                return response.text, m
        except Exception as e:
            last_err = e
            continue

    if last_err:
        raise last_err
    return "", model_name


def _call_ollama(base_url: str, model_name: str, system_prompt: str, user_prompt: str, history: list[dict]) -> str:
    import httpx

    messages = [{"role": "system", "content": system_prompt}]
    for turn in history[-6:]:
        role = "user" if turn.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": turn.get("content", "")})
    messages.append({"role": "user", "content": user_prompt})

    payload = {
        "model": model_name,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 500,
        },
    }

    endpoint = f"{base_url.rstrip('/')}/api/chat"
    try:
        with httpx.Client(timeout=httpx.Timeout(20.0, connect=3.0, read=20.0)) as client:
            resp = client.post(endpoint, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "")
    except Exception as e:
        logger.warning("Ollama call failed or timed out: %s", e)
        return ""


def _generate_rule_based_fallback(
    query: str,
    context_str: str,
    citations: list[dict],
    language: str = "en",
    is_inspection: bool = False,
    is_hospitality: bool = False,
) -> str:
    if language == "mr":
        if is_inspection or is_hospitality:
            return (
                "### हॉटेल / अन्न आस्थापनेवरील तपासणी व धाड: तत्काळ वैधानिक कृती आराखडा\n\n"
                "महाराष्ट्र शासन, **अन्न सुरक्षा व मानके कायदा (FSSAI) २००६**, **महाराष्ट्र आग प्रतिबंधक कायदा २००६** "
                "आणि **मैत्री (MAITRI) कायदा २०२३ (कलम १६)** नुसार खालीलप्रमाणे तत्काळ तयारी ठेवावी:\n\n"
                "#### १. अधिकाऱ्यांची पडताळणी (पहिल्या ५ मिनिटांत):\n"
                "- तपासणीसाठी आलेल्या अधिकाऱ्यांचे (उदा. अन्न व औषध प्रशासन / महापालिका / आरोग्य पथक) अधिकृत शासकीय **ओळखपत्र** तपासा.\n"
                "- तपासणी आदेश किंवा प्राधिकृत पत्र (Inspection Authorization Memo) दाखवण्याची विनंती करा.\n"
                "- पथकातील सर्व अधिकाऱ्यांची नावे आणि पदनाम नोंदवून घ्या.\n\n"
                "#### २. टेबलावर तत्काळ सादर करावयाची कागदपत्रे (Compliance Binder):\n"
                "- **FSSAI राज्य परवाना / नोंदणी प्रमाणपत्र** (Food Safety Display Board - जांभळा फलक दर्शनी भागात लावलेला असावा).\n"
                "- **कर्मचाऱ्यांचे वैद्यकीय तंदुरुस्ती प्रमाणपत्र (Form IX)**: सर्व शेफ आणि फूड हँडलर्सचे संसर्गजन्य आजार नसलेले प्रमाणपत्र.\n"
                "- **पिण्याच्या पाण्याचा चाचणी अहवाल (IS 10500)**: NABL मान्यताप्राप्त किंवा राज्य सार्वजनिक आरोग्य प्रयोगशाळेचा ६ महिन्यांतील अहवाल.\n"
                "- **वापरलेल्या तेलाची नोंदवही (RuCO Log)**: तेलातील Total Polar Compounds (TPC) २५% पेक्षा कमी असल्याची नोंद.\n"
                "- **पेस्ट कंट्रोल करार आणि सेवा पावत्या (Pest Control AMC)**.\n"
                "- **महानगरपालिका आरोग्य व्यापार परवाना (Eating House License)**: MMC Act कलम ३९४ अंतर्गत.\n"
                "- **अग्निशामक सुरक्षा NOC आणि 'फॉर्म बी' (Form B)**: परवानाधारक एजन्सीकडून घेतलेले द्विवार्षिक ऑडिट प्रमाणपत्र.\n"
                "- **दुकाने व आस्थापना नोंदणी (फॉर्म सी / गुमास्ता)** आणि वेतन नोंदवही.\n\n"
                "#### ३. स्वयंपाकघर आणि परिसराची तपासणी:\n"
                "- कर्मचाऱ्यांनी हेअरनेट, ॲप्रन आणि ग्लोव्हज घातलेले असावेत.\n"
                "- डीप फ्रीझर (<= -१८° से.) आणि चिलर (१° ते ४° से.) चे तापमान योग्य असल्याची खात्री करा.\n"
                "- मुदत संपलेले (Expired) किंवा लेबल नसलेले कोणतेही अन्नपदार्थ स्वयंपाकघरात ठेवू नका.\n"
                "- आपत्कालीन दरवाजे (Fire Exits) मोकळे आणि उघडे असल्याची खात्री करा.\n\n"
                "#### ४. व्यावसायिकांचे वैधानिक हक्क (Statutory Rights):\n"
                "- **पंचनामा**: कोणतीही झडती किंवा जप्ती दोन स्वतंत्र स्थानिक पंचांसमक्षच झाली पाहिजे आणि पंचनाम्याची प्रत तत्काळ मिळाली पाहिजे.\n"
                "- **४ सीलबंद नमुने (कलम ४७)**: अन्न सुरक्षा अधिकाऱ्याने घेतलेल्या नमुन्याचे **४ समान भाग** करून, सीलबंद करून, त्यातील **एक सीलबंद भाग तत्काळ मालकाकडे दिलाच पाहिजे**.\n"
                "- **४८ तासांत ऑनलाइन अहवाल**: मैत्री कायदा २०२३ कलम १६(२) नुसार तपासणी अहवाल ४८ तासांत राज्य पोर्टलवर अपलोड करणे बंधनकारक आहे.\n"
                "- **दाद मागण्याचा हक्क**: जर अधिकाऱ्यांनी बेकायदेशीर छळवणूक केली किंवा रोख रक्कम मागितली, तर मैत्री कायद्याच्या कलम ५ अंतर्गत **सक्षम समितीकडे (Empowered Committee)** तत्काळ तक्रार दाखल करता येते."
            )

        intro = (
            "महाराष्ट्र औद्योगिक विकास (MID) अधिनियम आणि मैत्री (MAITRI) कायद्यानुसार "
            "**परमिटग्राफच्या अधिकृत नियमांवर आधारित मार्गदर्शन** खालीलप्रमाणे आहे:\n\n"
        )
        points = []
        for cit in citations:
            if cit["type"] == "approval":
                points.append(f"- **[{cit['title']}]({cit['url']})**: महाराष्ट्रात उद्योग सुरू करण्यासाठी हा परवाना अनिवार्य आहे.")
            elif cit["type"] == "rule":
                points.append(f"- **[{cit['title']}]({cit['url']})**: इलेक्ट्रॉनिक अर्ज आणि विहित शुल्काबाबतचा वैधानिक नियम.")
        return intro + "\n".join(points)

    if is_inspection or is_hospitality:
        return (
            "### Immediate Statutory Inspection Readiness Protocol for Hotels & Food Establishments\n\n"
            "Under the **Food Safety and Standards Act (FSSAI) 2006**, **Maharashtra Fire Prevention & Life Safety Measures Act 2006**, "
            "and the **Maharashtra Industry, Trade and Investment Facilitation (MAITRI) Act 2023 (Section 16)**, "
            "here is the exact protocol and mandatory documentation to keep ready for the inspecting authority:\n\n"
            "#### 1. Immediate On-Site Verification (First 5 Minutes)\n"
            "- **Verify Credentials:** Politely request official government photo identification from all inspecting officers (e.g. Food and Drugs Administration (FDA) / Municipal Health / Fire Squad).\n"
            "- **Request Authorization Memo:** Request the written Inspection Order or statutory assignment memo detailing the scope of the audit.\n"
            "- **Designate Single Point of Contact:** Have the General Manager or Owner accompany the inspecting team to record notes and maintain professional decorum without obstructing proceedings.\n\n"
            "#### 2. Mandatory Documents to Keep Ready & Present on the Table\n"
            "Organize these records in a dedicated compliance binder to present immediately:\n\n"
            "| Authority / Statute | Mandatory Document to Present | Statutory Reference |\n"
            "| :--- | :--- | :--- |\n"
            "| **FDA / FSSAI** | **FSSAI License / State Registration** + Food Safety Display Board (Purple FSDB) mounted at entry | FSS Act 2006 Sec 31 |\n"
            "| **FDA / FSSAI** | **Staff Medical Fitness Certificates (Form IX)** for all food handlers | FSS (Licensing & Reg) Reg. 2011 |\n"
            "| **FDA / FSSAI** | **Potable Water Test Report (IS 10500)** from NABL/State Public Health Lab (within 6 months) | Schedule 4, FSS Regulations |\n"
            "| **FDA / FSSAI** | **Used Cooking Oil (RuCO) Logbook** showing Total Polar Compounds (TPC <= 25%) | FSSAI RuCO Directive |\n"
            "| **FDA / FSSAI** | **Pest Control Contract (AMC)** and latest quarterly treatment service slips | Schedule 4 Hygiene Mandate |\n"
            "| **FDA / FSSAI** | **Raw Material Purchase Bills** displaying suppliers' verified FSSAI numbers | Traceability Mandate |\n"
            "| **Municipal Body** | **Municipal Eating House & Health Trade License** | Section 394 MMC Act |\n"
            "| **Fire Services** | **Fire Safety NOC and Form B Bi-Annual Audit Certificate** (issued by licensed agency) | Maharashtra Fire Act 2006 |\n"
            "| **Labour Dept** | **Maharashtra Shops & Establishments Registration (Form C)** and staff wage register | Shops & Est Act 2017 |\n\n"
            "#### 3. Kitchen & Premises Physical Verification\n"
            "- Ensure all kitchen staff and food handlers are wearing clean aprons, hairnets, and gloves.\n"
            "- Verify temperature displays: Deep freezers must be at or below **-18°C**, and chillers between **1°C and 4°C**.\n"
            "- Segregate raw meat/poultry from ready-to-eat and vegetarian items with color-coded boards (Red for meat, Green for veg).\n"
            "- Ensure zero unlabelled, loose, or expired food products are stored in refrigerators or dry stores.\n"
            "- Confirm all emergency fire exits and stairwells are completely unlocked and unobstructed.\n\n"
            "#### 4. Your Statutory Rights During a Raid / Inspection\n"
            "- **Right to Independent Witnesses (Panchanama):** Any search, sample seizure, or inspection report must be executed in the presence of two independent local witnesses (Panchas). Demand that their names and signatures are affixed.\n"
            "- **Rule of Four Sealed Sample Divisions (FSSAI Act Sec 47):** If the Food Safety Officer draws food samples, the law mandates the sample be divided into **4 equal parts** and sealed in your presence. **One sealed sample part MUST be handed directly to you** for independent referral lab analysis if the state lab's findings are contested.\n"
            "- **Protection Against Arbitrary Confiscation:** Officers have no statutory power to seize operational till cash or personal belongings without a judicial warrant.\n"
            "- **48-Hour Electronic Upload SLA:** Under **MAITRI Act 2023 Section 16(2)**, inspecting officers are statutorily required to upload the joint inspection report onto the official single-window portal within 48 hours.\n"
            "- **Grievance Escalation:** If arbitrary harassment or procedural violations occur, file an immediate escalation before the **Maharashtra Empowered Committee** under Section 5 of the MAITRI Act 2023."
        )

    intro = (
        "Here is the regulatory guidance based directly on **PermitGraph's verified rules "
        "and Maharashtra statutory dependencies**:\n\n"
    )
    points = []
    for cit in citations:
        if cit["type"] == "approval":
            points.append(f"- **[{cit['title']}]({cit['url']})**: Required for industrial operations in Maharashtra. Review dependencies before applying.")
        elif cit["type"] == "rule":
            points.append(f"- **[{cit['title']}]({cit['url']})**: Statutory rule governing electronic application and prescribed fees.")

    if not points:
        points.append("- **Single Window System (MAITRI)**: Section 3 mandates all permissions be submitted through the electronic single-window portal.")
        points.append("- **MPCB Consent to Establish (CTE)**: Environmental clearance required prior to beginning physical site construction.")
        points.append("- **Factory License**: Applied under the Factories Act 1948 following building plan approval.")

    body = "\n".join(points)
    guidance = (
        "\n\n### Application Sequencing Strategy:\n"
        "1. Obtain **Land Allotment** (e.g. MIDC) or registered title.\n"
        "2. Submit **MPCB Consent to Establish (CTE)** before factory plan approvals.\n"
        "3. File **Single Window Combined Application** via MAITRI to trigger parallel departmental processing.\n"
        "4. Obtain **Factory Building Plan Approval** and **Fire NOC**.\n"
        "5. Apply for **Consent to Operate (CTO)** and final **Factory License** prior to commercial production."
    )
    return intro + body + guidance


def ask_permitgraph_copilot(
    db: Session,
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    language: str = "en",
) -> Dict[str, Any]:
    """Orchestrates multi-turn RAG context, queries Gemini -> Ollama -> Deterministic fallback."""
    settings = get_settings()
    history = history or []

    context_str, citations, is_inspection, is_hospitality = _get_relevant_context(db, message, history=history)
    system_prompt = _build_system_prompt(context_str, language)
    disclaimer = DISCLAIMER_TEXT_MR if language == "mr" else DISCLAIMER_TEXT_EN

    reply_text = ""
    provider = "deterministic"
    model_used = "permitgraph-rules-engine"

    # Try 1: Gemini (Ultra fast ~1.5s response)
    if settings.gemini_api_key and settings.gemini_api_key.strip():
        try:
            logger.info("Attempting Gemini API generation with model %s", settings.gemini_model)
            reply_text, model_used = _call_gemini(
                api_key=settings.gemini_api_key.strip(),
                model_name=settings.gemini_model,
                system_prompt=system_prompt,
                user_prompt=message,
                history=history,
            )
            provider = "gemini"
        except Exception as e:
            logger.warning("Gemini API call failed (%s). Falling back to Ollama.", e)

    # Try 2: Ollama Fallback
    if not reply_text:
        try:
            logger.info("Attempting Ollama generation at %s with model %s", settings.ollama_base_url, settings.ollama_model)
            reply_text = _call_ollama(
                base_url=settings.ollama_base_url,
                model_name=settings.ollama_model,
                system_prompt=system_prompt,
                user_prompt=message,
                history=history,
            )
            if reply_text:
                provider = "ollama"
                model_used = settings.ollama_model
        except Exception as e:
            logger.warning("Ollama fallback failed or timed out (%s). Falling back to rules engine.", e)

    # Try 3: Deterministic Rule-Engine Fallback
    if not reply_text:
        reply_text = _generate_rule_based_fallback(
            query=message,
            context_str=context_str,
            citations=citations,
            language=language,
            is_inspection=is_inspection,
            is_hospitality=is_hospitality,
        )
        provider = "permitgraph-rules"
        model_used = "rules-engine-v1"

    # Ensure statutory disclaimer is present
    if "Statutory Disclaimer" not in reply_text and "वैधानिक अस्वीकरण" not in reply_text:
        reply_text = f"{reply_text.rstrip()}\n\n{disclaimer}"

    if is_inspection or is_hospitality:
        suggestions = [
            "What mandatory documents must I present to the Food Safety Officer?",
            "What are my rights regarding sample collection and Panchanama?",
            "Can the authority seal my premises immediately without notice?",
            "How do I escalate arbitrary inspection harassment under MAITRI Act Sec 5?",
        ] if language != "mr" else [
            "अन्न सुरक्षा अधिकाऱ्याला कोणती अनिवार्य कागदपत्रे दाखवावी लागतात?",
            "पंचनामा आणि नमुने गोळा करताना हॉटेल मालकाचे कोणते कायदेशीर हक्क असतात?",
            "नोटीस न देता अधिकारी हॉटेल किंवा स्वयंपाकघर तत्काळ सील करू शकतात का?",
            "मैत्री कायद्याच्या कलम ५ अंतर्गत सक्षम समितीकडे तक्रार कशी करावी?",
        ]
    else:
        suggestions = [
            "What are the prerequisites for Factory License?",
            "How does MAITRI Act 2023 enforce single-window clearance?",
            "What approvals are required for food processing in Pune?",
            "Explain MPCB Consent to Establish (CTE) requirements",
        ] if language != "mr" else [
            "कारखाना परवान्यासाठी आवश्यक पूर्वअटी कोणत्या आहेत?",
            "मैत्री कायद्यांतर्गत १५ दिवसांत तपासणी न झाल्यास कायदेशीर प्रक्रिया काय?",
            "प्रदूषण नियंत्रण मंडळाच्या संमती शुल्काची रचना कशी आहे?",
            "MIDC मध्ये पाणी आणि वीज जोडणीसाठी कोणती कागदपत्रे लागतात?",
        ]

    return {
        "reply": reply_text,
        "provider": provider,
        "model": model_used,
        "citations": citations[:4],
        "suggestions": suggestions,
    }


def stream_permitgraph_copilot(
    db: Session,
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    language: str = "en",
) -> Generator[str, None, None]:
    """Server-Sent Events (SSE) generator yielding chunks in real time."""
    import httpx

    settings = get_settings()
    history = history or []

    context_str, citations, is_inspection, is_hospitality = _get_relevant_context(db, message, history=history)
    system_prompt = _build_system_prompt(context_str, language)
    disclaimer = DISCLAIMER_TEXT_MR if language == "mr" else DISCLAIMER_TEXT_EN

    provider = "gemini" if (settings.gemini_api_key and settings.gemini_api_key.strip()) else "ollama"
    model_name = settings.gemini_model if provider == "gemini" else settings.ollama_model

    # Send initial metadata chunk
    initial_meta = {
        "citations": citations[:4],
        "provider": provider,
        "model": model_name,
    }
    yield f"data: {json.dumps({'meta': initial_meta})}\n\n"

    streamed_success = False

    # Attempt 1: Streaming via Google Gemini (Fastest: ~1-2s response)
    if settings.gemini_api_key and settings.gemini_api_key.strip():
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.gemini_api_key.strip())
            candidate_models = [
                settings.gemini_model,
                "gemini-flash-lite-latest",
                "gemini-3.5-flash-lite",
                "gemini-3.1-flash-lite",
            ]
            for m in candidate_models:
                try:
                    contents = []
                    for turn in history[-6:]:
                        role = "user" if turn.get("role") == "user" else "model"
                        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=turn.get("content", ""))]))
                    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))

                    for chunk in client.models.generate_content_stream(
                        model=m,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            temperature=0.3,
                            max_output_tokens=1000,
                        ),
                    ):
                        if chunk.text:
                            yield f"data: {json.dumps({'chunk': chunk.text})}\n\n"
                    streamed_success = True
                    break
                except Exception as ex:
                    logger.warning("Gemini stream with %s failed: %s", m, ex)
                    continue
        except Exception as e:
            logger.warning("Gemini stream initialization error: %s", e)

    # Attempt 2: Streaming via Ollama
    if not streamed_success:
        endpoint = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
        messages = [{"role": "system", "content": system_prompt}]
        for turn in history[-6:]:
            role = "user" if turn.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": turn.get("content", "")})
        messages.append({"role": "user", "content": message})

        payload = {
            "model": settings.ollama_model,
            "messages": messages,
            "stream": True,
            "options": {"temperature": 0.2, "num_predict": 450},
        }

        try:
            with httpx.stream("POST", endpoint, json=payload, timeout=httpx.Timeout(25.0, connect=2.0)) as resp:
                if resp.status_code == 200:
                    streamed_success = True
                    for line in resp.iter_lines():
                        if line:
                            chunk_json = json.loads(line)
                            token = chunk_json.get("message", {}).get("content", "")
                            if token:
                                yield f"data: {json.dumps({'chunk': token})}\n\n"
                            if chunk_json.get("done", False):
                                break
        except Exception as e:
            logger.info("Ollama stream not available (%s), falling back to grounded rules stream", e)

    # Attempt 3: Grounded rules stream if neither Gemini nor Ollama streamed
    if not streamed_success:
        full_text = _generate_rule_based_fallback(
            query=message,
            context_str=context_str,
            citations=citations,
            language=language,
            is_inspection=is_inspection,
            is_hospitality=is_hospitality,
        )
        words = full_text.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            time.sleep(0.015)

    # Append disclaimer
    yield f"data: {json.dumps({'chunk': f'\n\n{disclaimer}'})}\n\n"
    yield f"data: {json.dumps({'done': True})}\n\n"


# =========================================================================
# STATUTORY FEE & TIMELINE CALCULATOR
# =========================================================================
def calculate_statutory_fees(
    investment_cr: float,
    category: str = "Orange",
    location: str = "MIDC",
    workers_count: int = 50,
) -> Dict[str, Any]:
    """Calculates official statutory fee schedule and approval timelines across Maharashtra agencies."""
    cat_upper = category.capitalize()

    # 1. MPCB Consent to Establish (CTE) Slabs
    if cat_upper == "White":
        cte_fee = 0
        cto_fee = 0
        cte_notes = "White category industries are exempt from MPCB consent; self-declaration required."
    else:
        if investment_cr <= 1.0:
            cte_fee = 15000
        elif investment_cr <= 5.0:
            cte_fee = 25000
        elif investment_cr <= 25.0:
            cte_fee = 50000
        elif investment_cr <= 100.0:
            cte_fee = 100000
        else:
            cte_fee = 200000

        if cat_upper == "Red":
            cte_fee = int(cte_fee * 1.25)
        elif cat_upper == "Green":
            cte_fee = int(cte_fee * 0.75)

        cto_fee = cte_fee
        cte_notes = f"Fixed by MPCB Schedule under Water Act 1974 & Air Act 1981 ({cat_upper} Category)."

    # 2. Directorate of Industrial Safety and Health (Factories Act 1948)
    if workers_count <= 20:
        dish_fee = 2500
    elif workers_count <= 50:
        dish_fee = 6000
    elif workers_count <= 250:
        dish_fee = 15000
    elif workers_count <= 1000:
        dish_fee = 35000
    else:
        dish_fee = 60000
    dish_notes = f"Prescribed under Maharashtra Factories Rules 1963 for {workers_count} workers."

    # 3. Fire Prevention and Life Safety NOC (Maharashtra Fire Act 2006)
    fire_noc_fee = 10000 if investment_cr <= 5.0 else 25000 if investment_cr <= 25.0 else 50000
    fire_notes = "Statutory fee payable to Maharashtra Directorate of Fire Services / Municipal Fire Brigade."

    # 4. Maharashtra Single Window (MAITRI) Processing Fee
    maitri_fee = 2500 if investment_cr <= 10.0 else 5000
    maitri_notes = "Electronic filing and unified dossier fee under MAITRI Act 2023 Sec 19."

    # 5. MIDC Infrastructure & Development Charges
    if location.upper() == "MIDC":
        midc_dev_fee = int(investment_cr * 12000)
        midc_notes = "MIDC development cess & layout scrutiny fee under MID Act 1961 Sec 14."
    else:
        midc_dev_fee = int(investment_cr * 8000)
        midc_notes = "Local planning authority / Gram Panchayat non-agriculture scrutiny charge."

    total_statutory_fees = cte_fee + cto_fee + dish_fee + fire_noc_fee + maitri_fee + midc_dev_fee

    items = [
        {"approval_name": "MPCB Consent to Establish (CTE)", "authority": "Maharashtra Pollution Control Board", "amount_inr": cte_fee, "notes": cte_notes},
        {"approval_name": "MPCB Consent to Operate (CTO)", "authority": "Maharashtra Pollution Control Board", "amount_inr": cto_fee, "notes": "Initial 1-year operational consent."},
        {"approval_name": "Factory Building Plan & License", "authority": "Directorate of Industrial Safety & Health (DISH)", "amount_inr": dish_fee, "notes": dish_notes},
        {"approval_name": "Provisional Fire NOC", "authority": "Directorate of Fire Services / MIDC Fire Brigade", "amount_inr": fire_noc_fee, "notes": fire_notes},
        {"approval_name": "MAITRI Single Window User Fee", "authority": "MAITRI Nodal Agency (MIDC)", "amount_inr": maitri_fee, "notes": maitri_notes},
        {"approval_name": "Industrial Development Cess", "authority": "MIDC / Local Planning Authority", "amount_inr": midc_dev_fee, "notes": midc_notes},
    ]

    standard_days = 90
    fasttrack_days = 30
    days_saved = standard_days - fasttrack_days

    return {
        "investment_cr": investment_cr,
        "category": cat_upper,
        "location": location,
        "workers_count": workers_count,
        "total_statutory_fees": total_statutory_fees,
        "fee_breakdown": items,
        "standard_timeline_days": standard_days,
        "maitri_fasttrack_days": fasttrack_days,
        "days_saved": days_saved,
        "statutory_reference": "Maharashtra Act No. XXXIV of 2023 (Section 14 & 16)",
    }


# =========================================================================
# OCR & DOCUMENT COMPLIANCE AUDIT
# =========================================================================
def audit_document_compliance(document_text: str, document_type: str = "general") -> Dict[str, Any]:
    """Audits draft NOC, applications, or inspection orders against Maharashtra gazette rules."""
    text_lower = document_text.lower()
    findings = []
    score = 100

    # Rule 1: Check for obsolete 30/45-day inspection clause
    has_obsolete_days = bool(re.search(r"\b(30|45|60)\s*(days?|दिवस)\b", text_lower))
    has_inspection_term = bool(re.search(r"\b(inspect|तपासणी)\w*\b", text_lower))
    if (has_obsolete_days and has_inspection_term) or "joint inspection within 30" in text_lower or ("30 days" in text_lower and "submission" in text_lower):
        score -= 25
        findings.append({
            "severity": "CRITICAL",
            "clause": "Inspection Timeline SLA",
            "finding": "Document specifies a 30 or 45-day joint inspection timeline.",
            "amendment_ref": "Govt. Notification No. IAC-2024/CR-104/IND-7 (Section 16 Amendment)",
            "recommendation": "Amend inspection SLA to strictly 15 days to comply with Maharashtra Gazette 2024.",
        })
    else:
        findings.append({
            "severity": "COMPLIANT",
            "clause": "Joint Inspection SLA",
            "finding": "Complies with the 15-day joint inspection mandate under Section 16.",
            "amendment_ref": "MAITRI Act 2023 Sec 16(2)",
            "recommendation": "Maintain electronic logging of inspector dispatch.",
        })

    # Rule 2: Check for Construction before Consent to Establish (CTE)
    if "commence construction" in text_lower and "consent to establish" not in text_lower and "cte" not in text_lower:
        score -= 30
        findings.append({
            "severity": "CRITICAL",
            "clause": "Pre-requisite Environmental Sequencing",
            "finding": "Proposal allows civil construction without prior MPCB Consent to Establish.",
            "amendment_ref": "Water Act 1974 Sec 25 & Air Act 1981 Sec 21",
            "recommendation": "Add mandatory prerequisite: Consent to Establish must precede building plan sanction.",
        })

    # Rule 3: Deemed Approval Clause citation
    if "deemed approval" in text_lower or "deemed sanction" in text_lower:
        if "section 16(3)" in text_lower or "section 4(3)" in text_lower:
            findings.append({
                "severity": "COMPLIANT",
                "clause": "Deemed Approval Notice Drafting",
                "finding": "Correctly cites Section 16(3) / Section 4(3) statutory deemed approval authority.",
                "amendment_ref": "Maharashtra Act No. XXXIV of 2023",
                "recommendation": "Ensure notice is served with timestamped proof of electronic filing.",
            })
        else:
            score -= 15
            findings.append({
                "severity": "WARNING",
                "clause": "Statutory Deemed Approval Citation Missing",
                "finding": "Mentions deemed approval without citing Section 16(3) or Section 4(3) of MAITRI Act 2023.",
                "amendment_ref": "MAITRI Act 2023 Section 16(3)",
                "recommendation": "Explicitly insert statutory reference: 'Claim filed under Section 16(3) of Maharashtra Act XXXIV of 2023'.",
            })

    # Rule 4: Penalty escalation check
    if "penalty" in text_lower or "unauthorized" in text_lower:
        if "section 46" in text_lower:
            findings.append({
                "severity": "COMPLIANT",
                "clause": "Enforcement & Penalty Citation",
                "finding": "Correctly grounds penalty escalation under Section 46 of MID Act 1961.",
                "amendment_ref": "MID Act 1961 Section 46",
                "recommendation": "Enforceable under Maharashtra Revenue Recovery rules.",
            })

    status = "COMPLIANT" if score >= 85 else "AMENDMENT_REQUIRED" if score >= 60 else "NON_COMPLIANT"

    return {
        "compliance_score": max(score, 0),
        "status": status,
        "findings": findings,
        "audited_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "governing_statute": "MAITRI Act 2023 & MID Act 1961",
    }
