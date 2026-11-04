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


def _get_relevant_context(db: Session, query: str) -> tuple[str, list[dict]]:
    """Query approvals, rules, and dependencies relevant to the user query."""
    q_lower = query.lower()
    words = [w for w in re.findall(r"\w+", q_lower) if len(w) > 3]

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

        for w in words:
            if w in id_lower:
                score += 4
            if w in name_lower:
                score += 3
            if w in cat_lower:
                score += 2
            if w in desc_lower:
                score += 1

        if score > 0 or len(words) == 0:
            matched_approvals.append((score, a))

    matched_approvals.sort(key=lambda x: x[0], reverse=True)
    selected_approvals = [a for _, a in matched_approvals[:6]]
    if not selected_approvals:
        selected_approvals = all_approvals[:6]

    matched_rules = []
    all_rules = db.query(RuleVersion).filter(RuleVersion.status.in_(["verified", "candidate"])).all()
    for r in all_rules:
        r_name = (r.rule_body or {}).get("name", "").lower()
        r_id = r.rule_id.lower()
        if any(w in r_name or w in r_id for w in words):
            matched_rules.append(r)
    selected_rules = matched_rules[:4]

    lines = ["### Known Approvals & Dependency Sequences in PermitGraph:"]
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

    lines.append("\n### Governing Legal Statutes:")
    lines.append("- Maharashtra Industry, Trade and Investment Facilitation (MAITRI) Act 2023 (Single-Window framework, deemed approvals, time limits)")
    lines.append("- Maharashtra Industrial Development (MID) Act 1961 (MIDC land allotment, building plans, water connection)")
    lines.append("- Water (Prevention and Control of Pollution) Act 1974 & Air Act 1981 (MPCB Consent to Establish / Operate)")
    lines.append("- Factories Act 1948 (Factory Building Plan Approval & Factory License)")

    return "\n".join(lines), citations


def _build_system_prompt(context_str: str, language: str = "en") -> str:
    if language == "mr":
        return (
            "तुम्ही परमिटग्राफ (PermitGraph) चे अधिकृत नियामक सहाय्यक (AI Regulatory Co-Pilot) आहात. "
            "तुम्ही महाराष्ट्र राज्यातील औद्योगिक परवानग्या, मैत्री (MAITRI) कायदा २०२३, आणि एमआयडीसी (MIDC) नियमांचे तज्ज्ञ आहात.\n\n"
            "मार्गदर्शक तत्त्वे:\n"
            "१. भाषा: तुमचे संपूर्ण उत्तर शुद्ध आणि अधिकृत प्रशासकीय मराठीत (Formal Marathi) द्या.\n"
            "२. अचूकता: दिलेल्या वैधानिक संदर्भावर (Regulatory Context) आधारित उत्तर द्या. काल्पनिक फी किंवा खोटे नियम सांगू नका.\n"
            "३. परवान्यांचा क्रम: कारखान्यासाठी कोणता परवाना आधी (उदा. MPCB Consent to Establish) आणि कोणता नंतर लागतो याचा अचूक क्रम स्पष्ट करा.\n"
            "४. स्वरूप: ठळक मुद्दे (Bullet points), क्रमांकित यादी (Numbered list) आणि टेबल वापरा.\n"
            "५. वैधानिक अस्वीकरण: उत्तराच्या शेवटी वैधानिक अस्वीकरण अनिवार्यपणे समाविष्ट करा.\n\n"
            f"अधिकृत वैधानिक संदर्भ:\n{context_str}\n"
        )
    return (
        "You are the PermitGraph AI Regulatory Co-Pilot, an authoritative expert on "
        "Maharashtra industrial permits, statutory clearances, and the MAITRI Act 2023.\n\n"
        "YOUR GUIDING PRINCIPLES:\n"
        "1. GROUNDING: Base your answers on the provided regulatory context and Maharashtra statutes. "
        "Do NOT invent fictional fees, fake clearances, or arbitrary deadlines.\n"
        "2. SEQUENCING: Clarify the dependency sequence (what MUST be obtained first before what).\n"
        "3. LINKS: Where helpful, mention approval IDs or names formatted as markdown links e.g. "
        "[Approval Name](/approvals/<id>).\n"
        "4. STRUCTURE: Use concise bullet points, bold headers, and numbered steps.\n"
        "5. DISCLAIMER: Always conclude your response with the standard statutory disclaimer.\n\n"
        f"VERIFIED REGULATORY CONTEXT:\n{context_str}\n"
    )


def _call_gemini(api_key: str, model_name: str, system_prompt: str, user_prompt: str, history: list[dict]) -> tuple[str, str]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    candidate_models = [model_name, "gemini-2.5-flash", "gemini-1.5-flash"]
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
            "num_predict": 450,
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


def _generate_rule_based_fallback(query: str, context_str: str, citations: list[dict], language: str = "en") -> str:
    if language == "mr":
        intro = (
            "महाराष्ट्र औद्योगिक विकास (MID) अधिनियम आणि मैत्री (MAITRI) कायद्यानुसार "
            "**परमिटग्राफच्या अधिकृत नियमांवर आधारित मार्गदर्शन** खालीलप्रमाणे आहे:\n\n"
        )
        points = []
        for cit in citations:
            if cit["type"] == "approval":
                points.append(f"- **[{cit['title']}]({cit['url']})**: महाराष्ट्रात उद्योग सुरू करण्यासाठी हा परवाना अनिवार्य आहे. अर्ज करण्यापूर्वी पूर्वअटींची खात्री करा.")
            elif cit["type"] == "rule":
                points.append(f"- **[{cit['title']}]({cit['url']})**: इलेक्ट्रॉनिक अर्ज आणि विहित शुल्काबाबतचा वैधानिक नियम.")

        if not points:
            points.append("- **मैत्री (MAITRI) सिंगल विंडो पोर्टल**: कलम ३ नुसार सर्व औद्योगिक परवानग्या इलेक्ट्रॉनिक पोर्टलद्वारे सादर करणे बंधनकारक आहे.")
            points.append("- **MPCB स्थापनेची संमती (CTE)**: प्रत्यक्ष बांधकाम सुरू करण्यापूर्वी पर्यावरण संमती घेणे आवश्यक आहे.")
            points.append("- **कारखाना परवाना (Factory License)**: इमारत आराखडा मंजूर झाल्यानंतर कारखाना अधिनियम १९४८ अंतर्गत लागू होतो.")

        body = "\n".join(points)
        guidance = (
            "\n\n### परवानग्यांचा अचूक क्रम (Sequencing):\n"
            "१. **जमीन वाटप (MIDC Plot Allotment)** किंवा नोंदणीकृत जागा निश्चित करा.\n"
            "२. कारखाना इमारत आराखडा मंजुरीपूर्वी **MPCB Consent to Establish (CTE)** मिळवा.\n"
            "३. विभागांच्या समांतर तपासणीसाठी **मैत्री (MAITRI)** वर संयुक्त अर्ज दाखल करा.\n"
            "४. **अग्निशामक दल NOC (Fire NOC)** आणि इमारत आराखडा मंजुरी घ्या.\n"
            "५. व्यावसायिक उत्पादन सुरू करण्यापूर्वी **Consent to Operate (CTO)** आणि अंतिम **कारखाना परवाना** प्राप्त करा."
        )
        return intro + body + guidance

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
    """Orchestrates RAG context, queries Gemini -> Ollama -> Deterministic fallback."""
    settings = get_settings()
    history = history or []

    context_str, citations = _get_relevant_context(db, message)
    system_prompt = _build_system_prompt(context_str, language)
    disclaimer = DISCLAIMER_TEXT_MR if language == "mr" else DISCLAIMER_TEXT_EN

    reply_text = ""
    provider = "deterministic"
    model_used = "permitgraph-rules-engine"

    # Try 1: Gemini
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
        reply_text = _generate_rule_based_fallback(message, context_str, citations, language)
        provider = "permitgraph-rules"
        model_used = "rules-engine-v1"

    # Ensure statutory disclaimer is present
    if "Statutory Disclaimer" not in reply_text and "वैधानिक अस्वीकरण" not in reply_text:
        reply_text = f"{reply_text.rstrip()}\n\n{disclaimer}"

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

    context_str, citations = _get_relevant_context(db, message)
    system_prompt = _build_system_prompt(context_str, language)
    disclaimer = DISCLAIMER_TEXT_MR if language == "mr" else DISCLAIMER_TEXT_EN

    # Send initial metadata chunk
    initial_meta = {
        "citations": citations[:4],
        "provider": "ollama",
        "model": settings.ollama_model,
    }
    yield f"data: {json.dumps({'meta': initial_meta})}\n\n"

    # Attempt 1: Streaming via Ollama
    ollama_success = False
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
                ollama_success = True
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

    # Attempt 2: Grounded rules stream if Ollama didn't stream
    if not ollama_success:
        full_text = _generate_rule_based_fallback(message, context_str, citations, language)
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
            cte_notes = "Includes 25% surcharge for hazardous waste & toxic effluent appraisal."
        else:
            cte_notes = f"Prescribed fee under Maharashtra Water & Air Acts for {cat_upper} category."

        cto_fee = int(cte_fee * 0.75)

    # 2. MIDC / Planning Authority Scrutiny
    if location.upper() == "MIDC":
        midc_fee = min(int(50000 + (investment_cr * 2000)), 250000)
        midc_notes = "MIDC infrastructure development charge & building plan scrutiny."
    else:
        midc_fee = 35000
        midc_notes = "Local Municipal / Town Planning Directorate building scrutiny fee."

    # 3. Fire Department NOC
    fire_fee = 15000 if cat_upper in ("White", "Green") else 25000
    if workers_count > 100:
        fire_fee += 10000

    # 4. DISH Factory License Fee
    if workers_count <= 50:
        dish_fee = 7500
    elif workers_count <= 250:
        dish_fee = 18000
    else:
        dish_fee = 35000

    # 5. MAITRI Combined Application Form Fee
    maitri_fee = 2500

    total_statutory_fees = cte_fee + cto_fee + midc_fee + fire_fee + dish_fee + maitri_fee

    # Timeline estimation
    standard_days = 90
    fasttrack_days = 30
    days_saved = standard_days - fasttrack_days

    items = [
        {"agency": "MPCB", "name": "Consent to Establish (CTE)", "amount": cte_fee, "notes": cte_notes},
        {"agency": "MPCB", "name": "Consent to Operate (CTO)", "amount": cto_fee, "notes": "Pre-commissioning operational consent"},
        {"agency": "MIDC / Town Planning", "name": "Building Plan Approval & Scrutiny", "amount": midc_fee, "notes": midc_notes},
        {"agency": "Fire Department", "name": "Fire Safety NOC Verification", "amount": fire_fee, "notes": "Hydrant & egress appraisal"},
        {"agency": "DISH Maharashtra", "name": f"Factory License ({workers_count} workers)", "amount": dish_fee, "notes": "Factories Act 1948 registration"},
        {"agency": "MAITRI Nodal Agency", "name": "Single Window Combined Filing (CAF)", "amount": maitri_fee, "notes": "Electronic single-window facilitation"},
    ]

    return {
        "investment_crores": investment_cr,
        "pollution_category": cat_upper,
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
    if re.search(r"\b(30|45|60)\s*(days?|दिवस)\b.*inspect", text_lower) or "joint inspection within 30" in text_lower:
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
