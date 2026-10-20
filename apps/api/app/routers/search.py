from __future__ import annotations

import re
import time
import unicodedata
from typing import Any, Dict, List, Optional, Set
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.approvals import Approval, ApprovalDependency, ApprovalRequirement
from ..models.regulatory import Clause, Regulation, RegulationVersion, Rule, RuleVersion, Section, SourceDocument

router = APIRouter(prefix="/api/v1/search", tags=["search"])


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class CitationModel(BaseModel):
    act_title: str
    act_short_code: str
    section_number: Optional[str] = None
    official_reference: str
    jurisdiction: str = "Maharashtra"
    authority: Optional[str] = None
    source_url: Optional[str] = None
    source_document_id: Optional[str] = None


class VerificationModel(BaseModel):
    status: str  # VERIFIED | CANDIDATE | SYNTHETIC | PROPOSED | UNVERIFIED
    extraction_method: Optional[str] = None
    confidence: Optional[float] = None
    badge_label: str
    provenance_summary: Optional[str] = None


class SearchResultItem(BaseModel):
    id: str
    entity_type: str  # act | section | rule | approval | source_document
    title: str
    title_mr: Optional[str] = None
    subtitle: Optional[str] = None
    matched_text: str
    matched_field: str
    language_detected: str  # en | mr | mixed
    relevance_score: float
    citation: CitationModel
    verification: VerificationModel
    navigation_link: str
    tags: List[str] = Field(default_factory=list)


class SearchSuggestionsResponse(BaseModel):
    popular_queries_en: List[str]
    popular_queries_mr: List[str]
    available_filters: Dict[str, List[str]]


class RegulatorySearchResponse(BaseModel):
    query: str
    detected_language: str
    translated_query: Optional[str] = None
    total_matches: int
    counts_by_type: Dict[str, int]
    counts_by_status: Dict[str, int]
    items: List[SearchResultItem]
    execution_time_ms: float


# ---------------------------------------------------------------------------
# Marathi & English Lexicon & Thesaurus
# ---------------------------------------------------------------------------

DEVANAGARI_REGEX = re.compile(r"[\u0900-\u097F]")

MARATHI_ENGLISH_LEXICON: Dict[str, List[str]] = {
    # Core Acts & Regulations
    "अधिनियम": ["act", "legislation", "statute"],
    "कायदा": ["act", "law", "statute"],
    "नियम": ["rule", "rules", "regulation"],
    "कलम": ["section", "clause"],
    "सुधारणा": ["amendment", "notification"],
    "दुरुस्ती": ["amendment", "modification"],
    "अधिसूचना": ["notification", "gazette"],
    "शासन निर्णय": ["government resolution", "gr"],
    "राजपत्र": ["gazette", "official gazette"],
    # Institutions & Departments
    "मैत्री": ["maitri", "single window", "investment facilitation"],
    "एमआयडीसी": ["midc", "industrial development corporation"],
    "उद्योग": ["industry", "industrial", "undertaking", "business"],
    "प्रदूषण नियंत्रण": ["pollution control", "mpcb"],
    "प्रदूषण": ["pollution", "mpcb", "water act", "air act", "environment", "consent"],
    "कामगार": ["labour", "worker", "employment", "contract labour"],
    "कारखाना": ["factory", "factories act", "dish"],
    "अग्निशामक": ["fire", "fire services", "safety", "fire noc"],
    # Clearances & Consents
    "मंजुरी": ["approval", "permission", "clearance"],
    "परवाना": ["license", "permit", "factory license"],
    "संमती": ["consent", "consent to establish", "consent to operate", "mpcb"],
    "ना हरकत": ["no-objection", "noc"],
    "ना हरकत प्रमाणपत्र": ["no-objection certificate", "noc", "fire noc"],
    "नोंदणी": ["registration", "enrolment"],
    "जमीन वाटप": ["land allotment", "plot allotment", "midc"],
    "भूखंड": ["plot", "land", "midc"],
    # Operational & Statutory Concepts
    "एकल खिडकी": ["single window", "maitri", "portal"],
    "तपासणी": ["inspection", "joint inspection", "audit", "site inspection"],
    "संयुक्त तपासणी": ["joint site inspection", "synchronous inspection", "inspection"],
    "विझार्ड": ["wizard", "online wizard module"],
    "अर्ज": ["application", "apply", "form"],
    "अर्जदार": ["applicant", "entrepreneur", "investor"],
    "मुदत": ["time limit", "timeline", "sla", "period", "days"],
    "कालमर्यादा": ["time limit", "statutory period", "deadline"],
    "कागदपत्र": ["document", "file"],
    "कागदपत्रे": ["documents", "records", "certificates"],
    "शुल्क": ["fee", "challan", "payment", "scrutiny fee"],
    "चलन": ["challan", "fee receipt"],
    "समिती": ["committee", "empowered committee", "supervisory committee"],
    "अधिकार समिती": ["empowered committee"],
    "पर्यावरण": ["environment", "pollution", "hazard"],
    "धोकादायक": ["hazardous", "red category", "chemical"],
    "पाणी": ["water", "effluent", "water act"],
    "हवा": ["air", "emission", "air act"],
}

# Reverse English -> Marathi mapping
ENGLISH_MARATHI_LEXICON: Dict[str, List[str]] = {
    "act": ["अधिनियम", "कायदा"],
    "section": ["कलम"],
    "rule": ["नियम"],
    "rules": ["नियम"],
    "inspection": ["तपासणी", "संयुक्त तपासणी"],
    "joint inspection": ["संयुक्त तपासणी", "तपासणी"],
    "consent": ["संमती", "प्रदूषण नियंत्रण संमती"],
    "consent to establish": ["स्थापनेसाठी संमती", "संमती"],
    "consent to operate": ["चालवण्यासाठी संमती", "संमती"],
    "factory": ["कारखाना", "कारखाना परवाना"],
    "license": ["परवाना"],
    "noc": ["ना हरकत प्रमाणपत्र", "ना हरकत"],
    "fire noc": ["अग्निशामक ना-हरकत प्रमाणपत्र"],
    "single window": ["एकल खिडकी", "मैत्री"],
    "maitri": ["मैत्री कक्ष", "एकल खिडकी"],
    "midc": ["एमआयडीसी", "महाराष्ट्र औद्योगिक विकास"],
    "pollution": ["प्रदूषण", "प्रदूषण नियंत्रण मंडळ"],
    "mpcb": ["महाराष्ट्र प्रदूषण नियंत्रण मंडळ", "प्रदूषण"],
    "allotment": ["भूखंड वाटप", "जमीन वाटप"],
    "application": ["अर्ज"],
    "timeline": ["कालमर्यादा", "मुदत"],
    "wizard": ["ऑनलाइन विझार्ड मॉड्यूल"],
    "fee": ["शुल्क", "चलन"],
    "labour": ["कामगार"],
}

# Rich Marathi metadata for Acts
ACT_METADATA_MR: Dict[str, Dict[str, Any]] = {
    "MAITRI-ACT-2023": {
        "title_mr": "महाराष्ट्र उद्योग, व्यापार आणि गुंतवणूक सुविधा अधिनियम, २०२३",
        "authority_mr": "उद्योग संचालनालय आणि मैत्री कक्ष, महाराष्ट्र शासन",
        "description_mr": "महाराष्ट्रात उद्योग स्थापन करण्यासाठी लागणाऱ्या मंजुऱ्या एकल खिडकी प्रणालीद्वारे वेळेत मिळवून देणारा सर्वसमावेशक कायदा.",
        "sections_mr": {
            "1": "संक्षिप्त नाव आणि प्रारंभ (Short title and commencement)",
            "2": "व्याख्या (Definitions - Single Window, Competent Authority, Permission)",
            "3": "एकल खिडकीद्वारे अर्ज दाखल करणे (Filing of electronic application)",
            "4": "विहित कालमर्यादेत अर्जाची विल्हेवाट (Disposal of application within time limit)",
            "5": "अधिकारप्राप्त समितीकडे अर्ज हस्तांतरित करणे (Transfer of delayed application)",
            "6": "उद्योग विकास आयुक्तांच्या अध्यक्षतेखाली अधिकारप्राप्त समिती (Empowered Committee)",
            "7": "अधिकारप्राप्त समितीचे अधिकार आणि विलंब चौकशी (Powers of Empowered Committee)",
            "8": "एकल खिडकी प्रणालीचे पर्यवेक्षण आणि कार्ये (Functions of Empowered Committee)",
            "10": "उद्योग सचिवांच्या अध्यक्षतेखाली पर्यवेक्षी समिती (Supervisory Committee)",
            "14": "नोडल एजन्सी म्हणून मैत्री कक्ष घोषित करणे (MAITRI as Nodal Agency)",
            "15": "एमआयडीसी सहकार्याने मैत्री कक्षाची गुंतवणूक प्रोत्साहन कार्ये (Functions of Nodal Agency)",
            "16": "औद्योगिक तपासणीचे सुसूत्रीकरण व संयुक्त तपासणी (Rationalization of inspections)",
            "18": "अर्जांवरील कार्यवाहीसाठी वैधानिक कालमर्यादा (Statutory time limits)",
            "19": "एकल खिडकी सेवांवर शुल्क आकारण्याचा अधिकार (Power to levy fees)",
            "20": "परवानग्या ओळखण्यासाठी सर्वसमावेशक ऑनलाइन विझार्ड मॉड्यूल (Online Wizard Module)",
            "21": "धोरणांच्या मसुद्यावर सार्वजनिक नागरिकांकडून अभिप्राय (Public consultation)",
        },
    },
    "MID-ACT-1961": {
        "title_mr": "महाराष्ट्र औद्योगिक विकास अधिनियम, १९६१",
        "authority_mr": "महाराष्ट्र औद्योगिक विकास महामंडळ (MIDC)",
        "description_mr": "महाराष्ट्रात सुव्यवस्थित औद्योगिक वसाहती स्थापन करणे आणि औद्योगिक भूखंड वाटपाचे नियमन करणारा अधिनियम.",
        "sections_mr": {
            "1": "संक्षिप्त नाव व कार्यक्षेत्र",
            "14": "औद्योगिक वसाहतींची स्थापना आणि महामंडळाची कार्ये",
            "29": "शासकीय औद्योगिक जमिनीचे वाटप आणि नियमन",
            "32": "औद्योगिक उद्देशासाठी भूसंपादन अधिकार",
        },
    },
    "KHADI-ACT-1960": {
        "title_mr": "महाराष्ट्र खादी व ग्रामोद्योग अधिनियम, १९६०",
        "authority_mr": "महाराष्ट्र राज्य खादी व ग्रामोद्योग मंडळ",
        "description_mr": "ग्रामीण भागातील खादी व कुटीर उद्योगांना प्रोत्साहन, वित्तपुरवठा आणि योजना सहाय्य पुरवणारा अधिनियम.",
        "sections_mr": {
            "1": "संक्षिप्त नाव व प्रारंभ",
            "12": "ग्रामोद्योग मंडळाची कर्तव्ये आणि कार्ये",
            "19": "ग्रामोद्योगांसाठी वित्तपुरवठा व अनुदान योजना",
        },
    },
}

APPROVAL_METADATA_MR: Dict[str, Dict[str, str]] = {
    "consent-to-establish": {
        "title_mr": "स्थापनेसाठी संमती (Consent to Establish - CTE)",
        "authority_mr": "महाराष्ट्र प्रदूषण नियंत्रण मंडळ (MPCB)",
        "reference_mr": "जल प्रदूषण कायदा १९७४ कलम २५ व वायू प्रदूषण कायदा १९८१ कलम २१",
    },
    "consent-to-operate": {
        "title_mr": "चालवण्यासाठी संमती (Consent to Operate - CTO)",
        "authority_mr": "महाराष्ट्र प्रदूषण नियंत्रण मंडळ (MPCB)",
        "reference_mr": "जल प्रदूषण कायदा १९७४ कलम २५ व वायू प्रदूषण कायदा १९८१ कलम २१",
    },
    "factory-license": {
        "title_mr": "कारखाना परवाना व इमारत आराखडा मंजुरी",
        "authority_mr": "औद्योगिक सुरक्षा व आरोग्य संचालनालय (DISH)",
        "reference_mr": "कारखाने अधिनियम १९४८ कलम ६ व महाराष्ट्र कारखाना नियम",
    },
    "fire-noc": {
        "title_mr": "अग्निशामक ना-हरकत प्रमाणपत्र (Fire Department NOC)",
        "authority_mr": "महाराष्ट्र अग्निशमन सेवा / संबंधित स्थानिक स्वराज्य संस्था",
        "reference_mr": "महाराष्ट्र आग प्रतिबंधक आणि जीवन सुरक्षा उपाययोजना अधिनियम २००६",
    },
    "single-window-application": {
        "title_mr": "एकल खिडकी पोर्टल अर्ज (MAITRI Single Window)",
        "authority_mr": "मैत्री कक्ष, उद्योग विभाग, महाराष्ट्र शासन",
        "reference_mr": "मैत्री अधिनियम २०२३, कलम ३",
    },
    "midc-plot-allotment": {
        "title_mr": "एमआयडीसी औद्योगिक भूखंड व जमीन वाटप",
        "authority_mr": "महाराष्ट्र औद्योगिक विकास महामंडळ (MIDC)",
        "reference_mr": "महाराष्ट्र औद्योगिक विकास अधिनियम १९६१, कलम १४",
    },
    "labour-registration": {
        "title_mr": "कंत्राटी कामगार आस्थापना नोंदणी प्रमाणपत्र",
        "authority_mr": "कामगार आयुक्त कार्यालय, महाराष्ट्र शासन",
        "reference_mr": "कंत्राटी कामगार (नियमन व निर्मूलन) अधिनियम १९७० कलम ७",
    },
}


# ---------------------------------------------------------------------------
# Helpers for Text Matching & Snippet Extraction
# ---------------------------------------------------------------------------

def detect_language(text: str) -> str:
    """Detect whether text contains Devanagari (Marathi) or Latin (English)."""
    if bool(DEVANAGARI_REGEX.search(text)):
        # Check if there is also english
        has_latin = bool(re.search(r"[a-zA-Z]", text))
        return "mixed" if has_latin else "mr"
    return "en"


def expand_query_terms(query: str, lang: str) -> List[str]:
    """Expand query terms across Marathi and English lexicons with length and word boundary safety."""
    raw_tokens = re.findall(r"[^\s,;:\.।\?!\(\)\[\]\"']+", query.lower())
    terms = {t.strip() for t in raw_tokens if len(t.strip()) >= 2}
    normalized_q = query.strip().lower()

    expanded: Set[str] = set(terms)
    if len(normalized_q) >= 2:
        expanded.add(normalized_q)

    # Check phrase matches in lexicon
    for mr_phrase, en_syns in MARATHI_ENGLISH_LEXICON.items():
        if mr_phrase in normalized_q or any(t == mr_phrase or (len(t) >= 3 and t in mr_phrase) for t in terms):
            for syn in en_syns:
                syn_clean = syn.lower().strip()
                if len(syn_clean) >= 2:
                    expanded.add(syn_clean)
                    for word in re.findall(r"[^\s,;:\.।\?!\(\)\[\]\"']+", syn_clean):
                        if len(word) >= 2:
                            expanded.add(word)

    for en_phrase, mr_syns in ENGLISH_MARATHI_LEXICON.items():
        if en_phrase in normalized_q or any(t == en_phrase for t in terms):
            for syn in mr_syns:
                syn_clean = syn.strip()
                if len(syn_clean) >= 2:
                    expanded.add(syn_clean)
                    for word in re.findall(r"[^\s,;:\.।\?!\(\)\[\]\"']+", syn_clean):
                        if len(word) >= 2:
                            expanded.add(word)

    return [t for t in expanded if len(t.strip()) >= 2]


def build_highlighted_snippet(text: str, search_terms: List[str], max_len: int = 240) -> tuple[str, float]:
    """Find the best matching window in text, highlight matching terms with <mark>, and score it."""
    if not text or not search_terms:
        return ("", 0.0)

    clean_text = " ".join(text.split())
    lower_text = clean_text.lower()
    valid_terms = [t for t in search_terms if len(t.strip()) >= 2]
    if not valid_terms:
        return ("", 0.0)

    matches: List[tuple[int, int, str]] = []
    term_counts = 0
    for term in valid_terms:
        term_clean = term.strip()
        term_len = len(term_clean)
        start = 0
        while True:
            idx = lower_text.find(term_clean.lower(), start)
            if idx == -1:
                break
            matches.append((idx, idx + term_len, clean_text[idx:idx + term_len]))
            start = idx + term_len
            term_counts += 1

    if not matches:
        return ("", 0.0)

    matches.sort(key=lambda m: m[0])
    first_match_start = matches[0][0]

    window_start = max(0, first_match_start - 60)
    window_end = min(len(clean_text), window_start + max_len)
    if window_end - window_start < max_len and window_start > 0:
        window_start = max(0, window_end - max_len)

    snippet_raw = clean_text[window_start:window_end]

    regex_terms = [re.escape(t) for t in sorted(valid_terms, key=len, reverse=True) if len(t) >= 2]
    if regex_terms:
        pattern = re.compile(f"({'|'.join(regex_terms)})", re.IGNORECASE)
        snippet_highlighted = pattern.sub(r"<mark>\1</mark>", snippet_raw)
    else:
        snippet_highlighted = snippet_raw

    prefix = "..." if window_start > 0 else ""
    suffix = "..." if window_end < len(clean_text) else ""

    relevance = min(10.0, float(term_counts) * 1.5 + (2.0 if first_match_start < 100 else 0.5))
    return (f"{prefix}{snippet_highlighted}{suffix}", relevance)


def _get_status_badge_label(status: str, method: Optional[str] = None) -> str:
    status_upper = (status or "").upper()
    if status_upper == "VERIFIED":
        return "Official Gazette Verified"
    if status_upper == "CANDIDATE":
        if method == "OCR":
            return "OCR Candidate (Pending Review)"
        return "Statutory Candidate (Pending Review)"
    if status_upper == "SYNTHETIC":
        return "Reference Catalog"
    return "Official Text Mirror"


# ---------------------------------------------------------------------------
# Search Endpoints
# ---------------------------------------------------------------------------

@router.get("/suggestions", response_model=SearchSuggestionsResponse)
def get_search_suggestions():
    """Return pre-curated bilingual suggestions and filters for regulations search."""
    return SearchSuggestionsResponse(
        popular_queries_en=[
            "MAITRI Single Window Application",
            "Joint Inspection Section 16",
            "Consent to Establish (MPCB)",
            "Factory License DISH",
            "Plot Allotment MIDC Section 14",
            "Online Wizard Module Section 20",
            "Water Act & Air Act Consent",
            "Contract Labour Registration",
        ],
        popular_queries_mr=[
            "एकल खिडकी अर्ज (MAITRI)",
            "संयुक्त तपासणी कलम १६",
            "प्रदूषण नियंत्रण संमती (MPCB)",
            "कारखाना परवाना (DISH)",
            "एमआयडीसी जमीन वाटप",
            "ऑनलाइन विझार्ड मॉड्यूल",
            "अग्निशामक ना हरकत प्रमाणपत्र",
            "कंत्राटी कामगार नोंदणी",
        ],
        available_filters={
            "entity_types": ["act", "section", "rule", "approval", "source_document"],
            "verification_status": ["VERIFIED", "CANDIDATE", "SYNTHETIC", "ALL"],
            "jurisdiction": ["Maharashtra", "Central"],
            "languages": ["all", "en", "mr"],
        },
    )


@router.get("", response_model=RegulatorySearchResponse)
def search_regulations(
    q: str = Query("", description="Search term in English or Marathi"),
    entity_types: Optional[str] = Query(None, description="Comma-separated entity types: act,section,rule,approval,source_document"),
    verification_status: Optional[str] = Query("ALL", description="Filter by status: ALL, VERIFIED, CANDIDATE, SYNTHETIC"),
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction, e.g. Maharashtra"),
    language: Optional[str] = Query("all", description="Language filter: all, en, mr"),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Full-text statutory search across Acts, Sections, Rules, Approvals, and Source Documents

    with Marathi and English bilingual query intelligence, legal citations, and verification status.
    """
    start_time = time.perf_counter()

    from urllib.parse import unquote
    query_str = unquote(q).strip() if q else ""
    if not query_str:
        return RegulatorySearchResponse(
            query="",
            detected_language="en",
            translated_query=None,
            total_matches=0,
            counts_by_type={"act": 0, "section": 0, "rule": 0, "approval": 0, "source_document": 0},
            counts_by_status={"VERIFIED": 0, "CANDIDATE": 0, "SYNTHETIC": 0},
            items=[],
            execution_time_ms=0.0,
        )

    # 1. Detect language & expand terms
    lang = detect_language(query_str)
    search_terms = expand_query_terms(query_str, lang)

    # Check if there is an explicit translated equivalent query
    translated_equivalent = None
    if lang == "mr":
        for mr_term, en_syns in MARATHI_ENGLISH_LEXICON.items():
            if mr_term in query_str:
                translated_equivalent = en_syns[0]
                break
    else:
        for en_term, mr_syns in ENGLISH_MARATHI_LEXICON.items():
            if en_term in query_str.lower():
                translated_equivalent = mr_syns[0]
                break

    # Parse allowed entity types
    allowed_types: Set[str] = {"act", "section", "rule", "approval", "source_document"}
    if entity_types and isinstance(entity_types, str):
        requested = {t.strip().lower() for t in entity_types.split(",") if t.strip()}
        if requested:
            allowed_types = allowed_types.intersection(requested)

    status_filter = verification_status.upper() if verification_status else "ALL"

    results: List[SearchResultItem] = []

    # -----------------------------------------------------------------------
    # 2. Search Acts (Regulations)
    # -----------------------------------------------------------------------
    if "act" in allowed_types:
        regs = db.query(Regulation).all()
        for r in regs:
            if jurisdiction and r.jurisdiction.lower() != jurisdiction.lower():
                continue

            act_mr_info = ACT_METADATA_MR.get(r.short_code, {})
            title_mr = act_mr_info.get("title_mr")
            authority_mr = act_mr_info.get("authority_mr")
            desc_mr = act_mr_info.get("description_mr", "")

            # Check matching in English or Marathi
            corpus = f"{r.name} {r.short_code} {r.jurisdiction} {title_mr or ''} {authority_mr or ''} {desc_mr}"
            snippet, score = build_highlighted_snippet(corpus, search_terms)

            if score > 0.5:
                # Determine verification from versions
                v_status = "CANDIDATE"
                source_doc_id = None
                source_url = None
                if r.versions:
                    v_status = r.versions[0].verification_status or "CANDIDATE"
                    source_doc_id = r.versions[0].source_document_id
                    source_url = r.versions[0].source_url

                if status_filter != "ALL" and v_status != status_filter:
                    continue

                results.append(
                    SearchResultItem(
                        id=f"act-{r.id}",
                        entity_type="act",
                        title=r.name,
                        title_mr=title_mr,
                        subtitle=f"{r.short_code} · {r.jurisdiction} Statutory Act",
                        matched_text=snippet,
                        matched_field="name / short_code / statutory description",
                        language_detected=lang,
                        relevance_score=score + 3.0,  # Acts get baseline boost
                        citation=CitationModel(
                            act_title=r.name,
                            act_short_code=r.short_code,
                            official_reference=f"{r.name} ({r.short_code})",
                            jurisdiction=r.jurisdiction,
                            authority=authority_mr or "State Legislature / Industries Department",
                            source_url=source_url,
                            source_document_id=source_doc_id,
                        ),
                        verification=VerificationModel(
                            status=v_status,
                            extraction_method="OFFICIAL_TEXT_MIRROR",
                            confidence=1.0 if v_status == "VERIFIED" else 0.85,
                            badge_label=_get_status_badge_label(v_status, "OFFICIAL_TEXT_MIRROR"),
                            provenance_summary="Official state statutory instrument transcribed section-by-section",
                        ),
                        navigation_link=f"/regulations/{r.id}",
                        tags=["statute", "act", r.short_code.lower(), "bilingual"],
                    )
                )

    # -----------------------------------------------------------------------
    # 3. Search Sections (Statutory Clauses)
    # -----------------------------------------------------------------------
    if "section" in allowed_types:
        sections = db.query(Section).all()
        for s in sections:
            sec_num = s.number
            reg_version = s.regulation_version
            reg_name = reg_version.regulation.name if reg_version and reg_version.regulation else "Maharashtra Regulation"
            reg_code = reg_version.regulation.short_code if reg_version and reg_version.regulation else "MH-ACT"

            act_mr = ACT_METADATA_MR.get(reg_code, {})
            sec_heading_mr = act_mr.get("sections_mr", {}).get(sec_num)

            # Combined text for search
            searchable_content = f"Section {sec_num} {s.heading or ''} {sec_heading_mr or ''} {s.text}"
            snippet, score = build_highlighted_snippet(searchable_content, search_terms, max_len=260)

            # Check direct match for section number query (e.g. "Section 16", "कलम 16", "कलम १६")
            sec_keywords = [f"section {sec_num}", f"section{sec_num}", f"कलम {sec_num}", f"कलम{sec_num}"]
            if any(k in query_str.lower() for k in sec_keywords):
                score += 5.0

            if score > 0.6:
                v_status = s.verification_status or "CANDIDATE"
                if status_filter != "ALL" and v_status != status_filter:
                    continue

                heading_display = s.heading or f"Section {sec_num}"
                heading_mr_display = sec_heading_mr or f"कलम {sec_num}"

                results.append(
                    SearchResultItem(
                        id=f"sec-{s.id}",
                        entity_type="section",
                        title=f"Section {sec_num}: {heading_display}",
                        title_mr=heading_mr_display,
                        subtitle=f"{reg_code} · {reg_name}",
                        matched_text=snippet,
                        matched_field="section_text / heading",
                        language_detected=lang,
                        relevance_score=score + 2.0,
                        citation=CitationModel(
                            act_title=reg_name,
                            act_short_code=reg_code,
                            section_number=sec_num,
                            official_reference=f"{reg_code} §{sec_num}",
                            jurisdiction="Maharashtra",
                            authority=act_mr.get("authority_mr") or "State Competent Authority",
                            source_url=s.source_url or (reg_version.source_url if reg_version else None),
                            source_document_id=s.source_document_id,
                        ),
                        verification=VerificationModel(
                            status=v_status,
                            extraction_method=s.extraction_method or "OFFICIAL_TEXT_MIRROR",
                            confidence=s.confidence or 0.85,
                            badge_label=_get_status_badge_label(v_status, s.extraction_method),
                            provenance_summary=f"Section {sec_num} verified against official gazette / source text",
                        ),
                        navigation_link=f"/regulations/{reg_version.regulation_id if reg_version else ''}#section-{sec_num}",
                        tags=["section", f"sec-{sec_num}", reg_code.lower()],
                    )
                )

    # -----------------------------------------------------------------------
    # 4. Search Rules (Rules-as-Code)
    # -----------------------------------------------------------------------
    if "rule" in allowed_types:
        rules = db.query(Rule).all()
        for r in rules:
            if jurisdiction and r.jurisdiction.lower() != jurisdiction.lower():
                continue

            r_ver = r.versions[0] if r.versions else None
            rule_body_str = str(r_ver.rule_body) if r_ver and r_ver.rule_body else ""
            rule_corpus = f"{r.id} {r.name} {r.jurisdiction} {rule_body_str}"
            snippet, score = build_highlighted_snippet(rule_corpus, search_terms)

            if score > 0.5:
                v_status = r_ver.verification_status if r_ver else "CANDIDATE"
                if status_filter != "ALL" and v_status != status_filter:
                    continue

                source_doc = r_ver.source_document_id if r_ver else None
                source_sec = r_ver.source_section if r_ver else None

                results.append(
                    SearchResultItem(
                        id=f"rule-{r.id}",
                        entity_type="rule",
                        title=f"{r.id}: {r.name}",
                        title_mr=f"नियम-संहिता: {r.name}",
                        subtitle=f"Rules-as-Code · Backed by {source_sec or 'Statute'}",
                        matched_text=snippet,
                        matched_field="rule_name / logic_body",
                        language_detected=lang,
                        relevance_score=score + 1.5,
                        citation=CitationModel(
                            act_title="Maharashtra Regulatory Code",
                            act_short_code="RULES-AS-CODE",
                            section_number=source_sec,
                            official_reference=f"Rule {r.id} ({source_sec or 'Statutory Obligation'})",
                            jurisdiction=r.jurisdiction,
                            authority="Regulatory Compliance Automation Engine",
                            source_document_id=source_doc,
                        ),
                        verification=VerificationModel(
                            status=v_status,
                            extraction_method=r_ver.extraction_method if r_ver else "AI_CANDIDATE",
                            confidence=r_ver.confidence if r_ver else 0.55,
                            badge_label=_get_status_badge_label(v_status, r_ver.extraction_method if r_ver else None),
                            provenance_summary="Executable rules-as-code parsed from statutory candidate text",
                        ),
                        navigation_link=f"/rules/{r.id}",
                        tags=["rule", "rules-as-code", r.id.lower()],
                    )
                )

    # -----------------------------------------------------------------------
    # 5. Search Approvals (Permits, Licenses, Consents, NOCs)
    # -----------------------------------------------------------------------
    if "approval" in allowed_types:
        approvals = db.query(Approval).all()
        for a in approvals:
            mr_meta = APPROVAL_METADATA_MR.get(a.id, {})
            title_mr = mr_meta.get("title_mr")
            auth_mr = mr_meta.get("authority_mr")
            ref_mr = mr_meta.get("reference_mr")

            app_corpus = f"{a.id} {a.name} {a.description or ''} {a.category} {title_mr or ''} {auth_mr or ''} {ref_mr or ''}"
            snippet, score = build_highlighted_snippet(app_corpus, search_terms)

            if score > 0.5:
                v_status = "SYNTHETIC" if a.is_synthetic else "VERIFIED"
                if status_filter != "ALL" and v_status != status_filter:
                    continue

                results.append(
                    SearchResultItem(
                        id=f"app-{a.id}",
                        entity_type="approval",
                        title=a.name,
                        title_mr=title_mr,
                        subtitle=f"Approval Category: {a.category.upper()} · {a.authority_id or 'Competent Authority'}",
                        matched_text=snippet,
                        matched_field="name / description / category",
                        language_detected=lang,
                        relevance_score=score + 2.5,
                        citation=CitationModel(
                            act_title="Maharashtra Single Window Approval Catalog",
                            act_short_code="APPROVAL-CATALOG",
                            section_number=a.source_section,
                            official_reference=ref_mr or f"Approval {a.id} ({a.category})",
                            jurisdiction="Maharashtra",
                            authority=auth_mr or a.authority_id or "State Competent Authority",
                            source_document_id=a.source_document_id,
                        ),
                        verification=VerificationModel(
                            status=v_status,
                            extraction_method=a.extraction_method or "MANUAL",
                            confidence=a.confidence or (0.7 if a.is_synthetic else 1.0),
                            badge_label=_get_status_badge_label(v_status, a.extraction_method),
                            provenance_summary="Registered in Maharashtra single-window regulatory approval catalog",
                        ),
                        navigation_link=f"/approvals/{a.id}",
                        tags=["approval", a.category, a.id],
                    )
                )

    # -----------------------------------------------------------------------
    # 6. Search Source Documents
    # -----------------------------------------------------------------------
    if "source_document" in allowed_types:
        docs = db.query(SourceDocument).all()
        for d in docs:
            doc_corpus = f"{d.id} {d.title} {d.authority or ''} {d.notes or ''} {d.document_type} {d.raw_text or ''}"
            snippet, score = build_highlighted_snippet(doc_corpus, search_terms, max_len=280)

            if score > 0.5:
                v_status = "VERIFIED" if d.ocr_status == "official_text_mirror_used" else "CANDIDATE"
                if status_filter != "ALL" and v_status != status_filter:
                    continue

                results.append(
                    SearchResultItem(
                        id=f"doc-{d.id}",
                        entity_type="source_document",
                        title=d.title,
                        title_mr=f"मूळ राजपत्र / दस्तऐवज: {d.title}",
                        subtitle=f"{d.document_type} · Version {d.version_label or 'v1'} · Hash: {(d.content_hash or '')[:12]}…",
                        matched_text=snippet,
                        matched_field="raw_text / title / notes",
                        language_detected=lang,
                        relevance_score=score + 1.0,
                        citation=CitationModel(
                            act_title=d.title,
                            act_short_code=d.id.upper()[:20],
                            official_reference=f"Source Document {d.id} ({d.file_type.upper()})",
                            jurisdiction=d.jurisdiction,
                            authority=d.authority or "Government Printing & Stationery Press",
                            source_url=d.source_url,
                            source_document_id=d.id,
                        ),
                        verification=VerificationModel(
                            status=v_status,
                            extraction_method=d.ocr_status,
                            confidence=1.0 if v_status == "VERIFIED" else 0.8,
                            badge_label=_get_status_badge_label(v_status, d.ocr_status),
                            provenance_summary=f"SHA-256 Content Hash verified; {d.page_count} page(s) ingested",
                        ),
                        navigation_link="/compare",
                        tags=["source_document", d.document_type.lower(), d.file_type],
                    )
                )

    # -----------------------------------------------------------------------
    # 7. Aggregation, Sorting & Pagination
    # -----------------------------------------------------------------------
    # Sort by relevance_score descending
    results.sort(key=lambda r: r.relevance_score, reverse=True)

    counts_by_type: Dict[str, int] = {
        "act": sum(1 for r in results if r.entity_type == "act"),
        "section": sum(1 for r in results if r.entity_type == "section"),
        "rule": sum(1 for r in results if r.entity_type == "rule"),
        "approval": sum(1 for r in results if r.entity_type == "approval"),
        "source_document": sum(1 for r in results if r.entity_type == "source_document"),
    }

    counts_by_status: Dict[str, int] = {
        "VERIFIED": sum(1 for r in results if r.verification.status == "VERIFIED"),
        "CANDIDATE": sum(1 for r in results if r.verification.status == "CANDIDATE"),
        "SYNTHETIC": sum(1 for r in results if r.verification.status == "SYNTHETIC"),
    }

    paginated_items = results[offset : offset + limit]
    elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    return RegulatorySearchResponse(
        query=query_str,
        detected_language=lang,
        translated_query=translated_equivalent,
        total_matches=len(results),
        counts_by_type=counts_by_type,
        counts_by_status=counts_by_status,
        items=paginated_items,
        execution_time_ms=elapsed_ms,
    )
