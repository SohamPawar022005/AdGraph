from __future__ import annotations

import json
import logging
import re
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..models.approvals import Approval, ApprovalDependency
from ..models.regulatory import RuleVersion, SourceDocument
from ..services import graph_service

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = (
    "> **Statutory Disclaimer:** *PermitGraph is an open-source regulatory intelligence "
    "infrastructure tool and not an official government portal. Official applications must "
    "be verified and filed via MAITRI (maitri.mahaonline.gov.in) or NSWS.*"
)


def _get_relevant_context(db: Session, query: str) -> tuple[str, list[dict]]:
    """Query approvals, rules, and dependencies relevant to the user query."""
    q_lower = query.lower()
    words = [w for w in re.findall(r"\w+", q_lower) if len(w) > 3]

    all_approvals = db.query(Approval).all()
    all_deps = db.query(ApprovalDependency).all()
    
    # Map upstream dependencies
    upstream_map: dict[str, list[str]] = {}
    for d in all_deps:
        upstream_map.setdefault(d.approval_id, []).append(d.depends_on_approval_id)

    # Score approvals
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
    # Pick top 6 matches or top 6 general if no direct keyword match
    selected_approvals = [a for _, a in matched_approvals[:6]]
    if not selected_approvals:
        selected_approvals = all_approvals[:6]

    # Query rules matching keywords
    matched_rules = []
    all_rules = db.query(RuleVersion).filter(RuleVersion.status.in_(["verified", "candidate"])).all()
    for r in all_rules:
        r_name = (r.rule_body or {}).get("name", "").lower()
        r_id = r.rule_id.lower()
        if any(w in r_name or w in r_id for w in words):
            matched_rules.append(r)
    selected_rules = matched_rules[:4]

    # Build context string
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

    # Available Acts
    lines.append("\n### Governing Legal Statutes:")
    lines.append("- Maharashtra Industry, Trade and Investment Facilitation (MAITRI) Act 2023 (Single-Window framework, deemed approvals, time limits)")
    lines.append("- Maharashtra Industrial Development (MID) Act 1961 (MIDC land allotment, building plans, water connection)")
    lines.append("- Water (Prevention and Control of Pollution) Act 1974 & Air Act 1981 (MPCB Consent to Establish / Operate)")
    lines.append("- Factories Act 1948 (Factory Building Plan Approval & Factory License)")

    return "\n".join(lines), citations


def _call_gemini(api_key: str, model_name: str, system_prompt: str, user_prompt: str, history: list[dict]) -> str:
    """Call Google Gemini API via official google.genai SDK."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    
    # Format contents with system instruction and history
    contents = []
    for turn in history[-6:]:
        role = "user" if turn.get("role") == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=turn.get("content", ""))]))
    
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)]))

    response = client.models.generate_content(
        model=model_name,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.3,
            max_output_tokens=1000,
        ),
    )
    return response.text or ""


def _call_ollama(base_url: str, model_name: str, system_prompt: str, user_prompt: str, history: list[dict]) -> str:
    """Call local Ollama instance via HTTP API with fast timeout."""
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


def _generate_rule_based_fallback(query: str, context_str: str, citations: list[dict]) -> str:
    """Deterministic fallback if neither Gemini nor Ollama is accessible."""
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
) -> Dict[str, Any]:
    """Orchestrates RAG context, queries Gemini -> Ollama -> Deterministic fallback."""
    settings = get_settings()
    history = history or []

    # 1. Retrieve grounded regulatory context
    context_str, citations = _get_relevant_context(db, message)

    # 2. System prompt
    system_prompt = (
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

    reply_text = ""
    provider = "deterministic"
    model_used = "permitgraph-rules-engine"

    # Try 1: Gemini
    if settings.gemini_api_key and settings.gemini_api_key.strip():
        try:
            logger.info("Attempting Gemini API generation with model %s", settings.gemini_model)
            reply_text = _call_gemini(
                api_key=settings.gemini_api_key.strip(),
                model_name=settings.gemini_model,
                system_prompt=system_prompt,
                user_prompt=message,
                history=history,
            )
            provider = "gemini"
            model_used = settings.gemini_model
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
        reply_text = _generate_rule_based_fallback(message, context_str, citations)
        provider = "permitgraph-rules"
        model_used = "rules-engine-v1"

    # Ensure statutory disclaimer is present
    if "Statutory Disclaimer" not in reply_text and "not an official government portal" not in reply_text:
        reply_text = f"{reply_text.rstrip()}\n\n{DISCLAIMER_TEXT}"

    # Suggested follow-ups
    suggestions = [
        "What are the prerequisites for Factory License?",
        "How does MAITRI Act 2023 enforce single-window clearance?",
        "What approvals are required for food processing in Pune?",
        "Explain MPCB Consent to Establish (CTE) requirements",
    ]

    return {
        "reply": reply_text,
        "provider": provider,
        "model": model_used,
        "citations": citations[:4],
        "suggestions": suggestions,
    }
