import io
import json
import os
import re
from typing import TYPE_CHECKING, Any, Dict, List, Optional

import fitz  # pyright: ignore[reportMissingImports]
try:
    import httpx  # pyright: ignore[reportMissingImports]
except ImportError:  # pragma: no cover - optional dependency for some runtime paths
    httpx = None  # type: ignore[assignment]

if TYPE_CHECKING:
    try:
        from httpx import AsyncClient  # pyright: ignore[reportMissingImports]
    except ImportError:  # pragma: no cover - optional dependency for type checking
        AsyncClient = Any  # type: ignore[assignment]
else:
    AsyncClient = Any  # type: ignore[assignment]

from docx import Document  # pyright: ignore[reportMissingImports]
try:
    from dotenv import load_dotenv  # pyright: ignore[reportMissingImports]
except ImportError:
    def load_dotenv():
        pass

from fastapi import (  # pyright: ignore[reportMissingImports]
    Body,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)

from fastapi.middleware.cors import CORSMiddleware  # pyright: ignore[reportMissingImports]

from fastapi.responses import StreamingResponse  # pyright: ignore[reportMissingImports]

from google import genai

from journal_finder import recommend_journals
from report_generator import generate_readiness_report
from chat_routes import router as chat_router


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.8-flash",
)

CROSSREF_EMAIL = os.getenv(
    "CROSSREF_EMAIL",
    "",
)


# =========================================================
# GEMINI CLIENT
# =========================================================

gemini_client = None

if GEMINI_API_KEY:
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY
    )


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="ResearchReady AI API",
    version="1.0.0",
    description=(
        "AI-powered manuscript analysis, "
        "reference verification, journal discovery "
        "and research chat."
    ),
)


# =========================================================
# AI CHAT ROUTER
# =========================================================

app.include_router(chat_router)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
async def root():

    return {
        "message":
            "ResearchReady AI backend is running",

        "ai_configured":
            bool(GEMINI_API_KEY),

        "crossref_configured":
            bool(CROSSREF_EMAIL),

        "journal_finder_ready":
            True,

        "pdf_report_ready":
            True,

        "ai_chat_ready":
            True,
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
async def health():

    return {
        "status": "ok",
        "service": "ResearchReady AI",
    }


# =========================================================
# EXTRACT PDF
# =========================================================

def extract_pdf_text(
    file_bytes: bytes
) -> str:

    try:

        document = fitz.open(
            stream=file_bytes,
            filetype="pdf",
        )

        pages = []

        for page in document:

            page_text = page.get_text(
                "text"
            )

            if page_text:
                pages.append(
                    page_text
                )

        document.close()

        return "\n".join(
            pages
        ).strip()

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=(
                "Could not read PDF file: "
                + str(error)
            ),
        )


# =========================================================
# EXTRACT DOCX
# =========================================================

def extract_docx_text(
    file_bytes: bytes
) -> str:

    try:

        document = Document(
            io.BytesIO(
                file_bytes
            )
        )

        paragraphs = []

        for paragraph in document.paragraphs:

            text = (
                paragraph.text
                .strip()
            )

            if text:
                paragraphs.append(
                    text
                )

        return "\n".join(
            paragraphs
        ).strip()

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=(
                "Could not read DOCX file: "
                + str(error)
            ),
        )


# =========================================================
# NORMALIZE TEXT
# =========================================================

def normalize_text(
    text: str
) -> str:

    text = text.replace(
        "\r\n",
        "\n",
    )

    text = text.replace(
        "\r",
        "\n",
    )

    text = re.sub(
        r"[ \t]+",
        " ",
        text,
    )

    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )

    return text.strip()


# =========================================================
# DOCUMENT STATISTICS
# =========================================================

def get_statistics(
    text: str
) -> Dict[str, int]:

    words = re.findall(
        r"\b[\w'-]+\b",
        text,
    )

    paragraphs = [
        paragraph.strip()
        for paragraph
        in re.split(
            r"\n\s*\n",
            text,
        )
        if paragraph.strip()
    ]

    return {
        "word_count":
            len(words),

        "character_count":
            len(text),

        "paragraph_count":
            len(paragraphs),
    }


# =========================================================
# SECTION HEADINGS
# =========================================================

SECTION_PATTERNS = {

    "abstract": [
        r"abstract",
    ],

    "keywords": [
        r"keywords?",
        r"key words?",
    ],

    "introduction": [
        r"introduction",
        r"background",
    ],

    "literature_review": [
        r"literature review",
        r"related work",
        r"review of literature",
    ],

    "methodology": [
        r"methodology",
        r"methods?",
        r"materials and methods?",
        r"research methodology",
    ],

    "results": [
        r"results?",
        r"findings?",
        r"results and discussion",
    ],

    "discussion": [
        r"discussion",
        r"results and discussion",
    ],

    "conclusion": [
        r"conclusion",
        r"conclusions",
        r"conclusion and future work",
    ],

    "references": [
        r"references",
        r"bibliography",
    ],
}


# =========================================================
# FIND SECTION POSITIONS
# =========================================================

def find_section_positions(
    text: str
):

    positions = []

    lines = text.splitlines()

    character_position = 0

    for line in lines:

        stripped = (
            line.strip()
            .lower()
        )

        clean_heading = re.sub(
            r"^[\d.\sIVXivx]+",
            "",
            stripped,
        ).strip()

        for section_name, patterns in (
            SECTION_PATTERNS.items()
        ):

            for pattern in patterns:

                if re.fullmatch(
                    pattern,
                    clean_heading,
                    flags=re.IGNORECASE,
                ):

                    positions.append(
                        (
                            character_position,
                            section_name,
                            line.strip(),
                        )
                    )

                    break

        character_position += (
            len(line) + 1
        )

    positions.sort(
        key=lambda item:
            item[0]
    )

    return positions


# =========================================================
# EXTRACT SECTIONS
# =========================================================

def extract_sections(
    text: str
) -> Dict[str, str]:

    extracted = {
        section: ""
        for section
        in SECTION_PATTERNS
    }

    positions = (
        find_section_positions(
            text
        )
    )

    for index, (
        start_position,
        section_name,
        heading,
    ) in enumerate(
        positions
    ):

        content_start = (
            start_position
            + len(heading)
        )

        if (
            index + 1
            < len(positions)
        ):

            content_end = (
                positions[
                    index + 1
                ][0]
            )

        else:

            content_end = len(
                text
            )

        content = (
            text[
                content_start:
                content_end
            ]
            .strip()
        )

        if (
            len(content)
            >
            len(
                extracted.get(
                    section_name,
                    "",
                )
            )
        ):

            extracted[
                section_name
            ] = content

        # Combined Results and Discussion
        if (
            section_name
            == "results"
            and
            "results and discussion"
            in heading.lower()
        ):

            extracted[
                "discussion"
            ] = content

    return extracted


# =========================================================
# SECTION DETECTION
# =========================================================

def analyze_structure(
    extracted_sections:
    Dict[str, str]
) -> Dict[str, Any]:

    required_sections = [
        "abstract",
        "introduction",
        "methodology",
        "results",
        "discussion",
        "conclusion",
        "references",
    ]

    sections = {}

    for section in required_sections:

        sections[section] = bool(
            extracted_sections.get(
                section,
                "",
            ).strip()
        )

    detected_count = sum(
        1
        for detected
        in sections.values()
        if detected
    )

    total = len(
        required_sections
    )

    score = round(
        (
            detected_count
            / total
        )
        * 100
    )

    return {
        "score": score,
        "detected_count":
            detected_count,
        "total_sections":
            total,
        "sections":
            sections,
    }


# =========================================================
# ABSTRACT ANALYSIS
# =========================================================

def analyze_abstract(
    abstract_text: str
):

    if not abstract_text:

        return {
            "found": False,
            "word_count": 0,
            "status": "Missing",
            "message":
                "No abstract section was detected.",
        }

    words = re.findall(
        r"\b[\w'-]+\b",
        abstract_text,
    )

    count = len(
        words
    )

    if count < 100:

        status = "Short"

        message = (
            "The abstract appears short. "
            "Consider clearly covering the research problem, "
            "objective, methodology, main findings and conclusion."
        )

    elif count > 350:

        status = "Long"

        message = (
            "The abstract appears relatively long. "
            "Consider making it more concise according to "
            "your target journal guidelines."
        )

    else:

        status = "Good Length"

        message = (
            "The abstract length is within a common "
            "academic range. Check the exact word limit "
            "of the target journal."
        )

    return {
        "found": True,
        "word_count": count,
        "status": status,
        "message": message,
    }


# =========================================================
# KEYWORD EXTRACTION
# =========================================================

def extract_keywords(
    extracted_sections:
    Dict[str, str],
    full_text: str,
):

    keyword_section = (
        extracted_sections
        .get(
            "keywords",
            "",
        )
        .strip()
    )

    if keyword_section:

        first_lines = (
            keyword_section
            .splitlines()[:3]
        )

        raw = " ".join(
            first_lines
        )

        raw = re.sub(
            r"^keywords?\s*[:\-]?\s*",
            "",
            raw,
            flags=re.IGNORECASE,
        )

        values = re.split(
            r"[,;•|]",
            raw,
        )

        cleaned = []

        for value in values:

            value = (
                value.strip(
                    " .:-"
                )
            )

            if (
                2
                <= len(value)
                <= 80
            ):

                cleaned.append(
                    value
                )

        if cleaned:

            return {
                "keywords":
                    cleaned[:12]
            }

    # Simple fallback keyword detection

    stopwords = {
        "the",
        "and",
        "that",
        "this",
        "with",
        "from",
        "were",
        "have",
        "has",
        "for",
        "are",
        "was",
        "using",
        "used",
        "into",
        "their",
        "these",
        "those",
        "research",
        "study",
        "paper",
        "results",
        "method",
        "methods",
        "based",
        "between",
        "which",
        "also",
        "more",
        "than",
        "been",
        "such",
        "data",
    }

    words = re.findall(
        r"\b[a-zA-Z][a-zA-Z-]{3,}\b",
        full_text.lower(),
    )

    frequencies = {}

    for word in words:

        if word not in stopwords:

            frequencies[word] = (
                frequencies.get(
                    word,
                    0,
                )
                + 1
            )

    sorted_words = sorted(
        frequencies.items(),
        key=lambda item:
            item[1],
        reverse=True,
    )

    return {
        "keywords": [
            word
            for word, _
            in sorted_words[:10]
        ]
    }


# =========================================================
# JSON CLEANER
# =========================================================

def parse_ai_json(
    text: str
):

    clean = text.strip()

    clean = re.sub(
        r"^```json\s*",
        "",
        clean,
        flags=re.IGNORECASE,
    )

    clean = re.sub(
        r"^```\s*",
        "",
        clean,
    )

    clean = re.sub(
        r"\s*```$",
        "",
        clean,
    )

    try:

        return json.loads(
            clean
        )

    except Exception:

        json_match = re.search(
            r"\{.*\}",
            clean,
            flags=re.DOTALL,
        )

        if not json_match:

            raise ValueError(
                "AI did not return valid JSON."
            )

        return json.loads(
            json_match.group(0)
        )


# =========================================================
# SCORE NORMALIZER
# =========================================================

def normalize_score(
    value,
    default=0,
):

    try:

        value = int(
            round(
                float(value)
            )
        )

        return max(
            0,
            min(
                100,
                value,
            ),
        )

    except Exception:

        return default


# =========================================================
# AI MANUSCRIPT ANALYSIS
# =========================================================

def analyze_with_gemini(
    text: str,
    extracted_sections:
    Dict[str, str],
):

    if not gemini_client:

        return {
            "available": False,
            "message":
                "Gemini AI is not configured.",
        }

    limited_text = text[:50000]

    prompt = f"""
You are ResearchReady AI, an academic manuscript review assistant.

Analyze the following research manuscript.

IMPORTANT:
- Do not invent research findings.
- Do not fabricate citations.
- Do not invent statistics.
- Do not guarantee journal acceptance.
- Evaluate only the text supplied.
- Return ONLY valid JSON.
- Scores must be integers from 0 to 100.

Return JSON using exactly this structure:

{{
  "abstract_score": 0,
  "academic_writing_score": 0,
  "research_clarity_score": 0,
  "methodology_clarity_score": 0,
  "results_clarity_score": 0,
  "conclusion_score": 0,

  "abstract_checks": {{
    "research_problem_present": false,
    "objective_present": false,
    "methodology_present": false,
    "results_present": false,
    "conclusion_present": false
  }},

  "strengths": [
    "..."
  ],

  "issues": [
    {{
      "severity": "low",
      "category": "...",
      "issue": "...",
      "recommendation": "..."
    }}
  ],

  "recommendations": [
    "..."
  ],

  "summary": "..."
}}

Severity must be one of:
low, medium, high.

MANUSCRIPT:

{limited_text}
"""

    try:

        response = (
            gemini_client
            .models
            .generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
            )
        )

        response_text = getattr(
            response,
            "text",
            "",
        )

        if not response_text:

            raise ValueError(
                "Gemini returned an empty response."
            )

        result = parse_ai_json(
            response_text
        )

        score_fields = [
            "abstract_score",
            "academic_writing_score",
            "research_clarity_score",
            "methodology_clarity_score",
            "results_clarity_score",
            "conclusion_score",
        ]

        scores = []

        for field in score_fields:

            result[field] = (
                normalize_score(
                    result.get(
                        field,
                        0,
                    )
                )
            )

            scores.append(
                result[field]
            )

        result[
            "ai_score"
        ] = round(
            sum(scores)
            / len(scores)
        )

        result[
            "available"
        ] = True

        if (
            "abstract_checks"
            not in result
        ):

            result[
                "abstract_checks"
            ] = {}

        checks = result[
            "abstract_checks"
        ]

        for field in [
            "research_problem_present",
            "objective_present",
            "methodology_present",
            "results_present",
            "conclusion_present",
        ]:

            checks[field] = bool(
                checks.get(
                    field,
                    False,
                )
            )

        result[
            "strengths"
        ] = result.get(
            "strengths",
            [],
        )

        result[
            "issues"
        ] = result.get(
            "issues",
            [],
        )

        result[
            "recommendations"
        ] = result.get(
            "recommendations",
            [],
        )

        result[
            "summary"
        ] = result.get(
            "summary",
            "",
        )

        return result

    except Exception as error:

        print(
            "GEMINI ANALYSIS ERROR:",
            repr(error),
        )

        return {
            "available": False,
            "message":
                "AI manuscript analysis could not be completed: "
                + str(error),
        }


# =========================================================
# REFERENCES TEXT
# =========================================================

def split_references(
    references_text: str
) -> List[str]:

    if not references_text:

        return []

    lines = [
        line.strip()
        for line
        in references_text.splitlines()
        if line.strip()
    ]

    references = []

    current = []

    reference_start = re.compile(
        r"""
        ^
        (?:
            \[\d+\]
            |
            \d+[.)]
            |
            [A-Z][A-Za-z'-]+,
        )
        """,
        re.VERBOSE,
    )

    for line in lines:

        if (
            reference_start.match(
                line
            )
            and current
        ):

            references.append(
                " ".join(
                    current
                )
            )

            current = [
                line
            ]

        else:

            current.append(
                line
            )

    if current:

        references.append(
            " ".join(
                current
            )
        )

    # Fallback
    if len(references) <= 1:

        references = [
            line
            for line in lines
            if len(line) > 25
        ]

    return references[:10]


# =========================================================
# DOI EXTRACTION
# =========================================================

def extract_doi(
    reference: str
) -> Optional[str]:

    match = re.search(
        r"""
        10\.\d{4,9}/
        [-._;()/:A-Z0-9]+
        """,
        reference,
        flags=re.IGNORECASE
        | re.VERBOSE,
    )

    if not match:

        return None

    return (
        match.group(0)
        .rstrip(
            ".,;)]}"
        )
    )


# =========================================================
# CROSSREF HEADERS
# =========================================================

def crossref_headers():

    if CROSSREF_EMAIL:

        user_agent = (
            "ResearchReadyAI/1.0 "
            f"(mailto:{CROSSREF_EMAIL})"
        )

    else:

        user_agent = (
            "ResearchReadyAI/1.0"
        )

    return {
        "User-Agent":
            user_agent
    }


# =========================================================
# YEAR FROM CROSSREF
# =========================================================

def crossref_year(
    item: dict
):

    for key in [
        "published-print",
        "published-online",
        "published",
        "issued",
        "created",
    ]:

        value = item.get(
            key
        )

        if not isinstance(
            value,
            dict,
        ):

            continue

        date_parts = (
            value.get(
                "date-parts"
            )
        )

        if (
            isinstance(
                date_parts,
                list,
            )
            and date_parts
            and date_parts[0]
        ):

            return (
                date_parts[0][0]
            )

    return None


# =========================================================
# CROSSREF ITEM FORMAT
# =========================================================

def format_crossref_item(
    original_reference: str,
    item: dict,
    status: str,
    confidence: int,
):

    title_list = item.get(
        "title",
        [],
    )

    container_list = item.get(
        "container-title",
        [],
    )

    return {
        "original_reference":
            original_reference,

        "status":
            status,

        "confidence":
            confidence,

        "matched_title":
            (
                title_list[0]
                if title_list
                else None
            ),

        "journal":
            (
                container_list[0]
                if container_list
                else None
            ),

        "year":
            crossref_year(
                item
            ),

        "doi":
            item.get(
                "DOI"
            ),

        "publication_type":
            item.get(
                "type"
            ),
    }


# =========================================================
# VERIFY ONE REFERENCE
# =========================================================

async def verify_reference(
    client: Any,
    reference: str,
):

    doi = extract_doi(
        reference
    )

    try:

        # Direct DOI lookup
        if doi:

            response = await client.get(
                "https://api.crossref.org/works/"
                + doi,
                headers=crossref_headers(),
                timeout=15,
            )

            if response.status_code == 200:

                item = (
                    response.json()
                    .get(
                        "message",
                        {},
                    )
                )

                return (
                    format_crossref_item(
                        reference,
                        item,
                        "verified",
                        100,
                    )
                )

        # Bibliographic lookup
        response = await client.get(
            "https://api.crossref.org/works",
            params={
                "query.bibliographic":
                    reference[:500],

                "rows":
                    1,
            },
            headers=crossref_headers(),
            timeout=15,
        )

        if response.status_code != 200:

            return {
                "original_reference":
                    reference,

                "status":
                    "lookup_error",

                "confidence":
                    0,
            }

        data = (
            response.json()
            .get(
                "message",
                {},
            )
        )

        items = data.get(
            "items",
            [],
        )

        if not items:

            return {
                "original_reference":
                    reference,

                "status":
                    "unverified",

                "confidence":
                    0,
            }

        item = items[0]

        score = item.get(
            "score",
            0,
        )

        try:

            score = float(
                score
            )

        except Exception:

            score = 0

        # Crossref search score isn't a percentage.
        # Convert to a simple UI confidence heuristic.

        if score >= 50:

            status = (
                "verified"
            )

            confidence = 90

        elif score >= 20:

            status = (
                "possible_match"
            )

            confidence = 65

        else:

            status = (
                "unverified"
            )

            confidence = 30

        return format_crossref_item(
            reference,
            item,
            status,
            confidence,
        )

    except Exception as error:

        print(
            "CROSSREF ERROR:",
            repr(error),
        )

        return {
            "original_reference":
                reference,

            "status":
                "lookup_error",

            "confidence":
                0,
        }


# =========================================================
# VERIFY REFERENCES
# =========================================================

async def verify_references(
    references_text: str
):

    references = split_references(
        references_text
    )

    if not references:

        return {
            "total_checked": 0,
            "verified": 0,
            "possible_matches": 0,
            "unverified": 0,
            "verification_score": 0,
            "references": [],
            "message":
                "No references were available for verification.",
        }

    results = []

    async with httpx.AsyncClient(
        follow_redirects=True
    ) as client:

        for reference in references:

            result = (
                await verify_reference(
                    client,
                    reference,
                )
            )

            results.append(
                result
            )

    verified = sum(
        1
        for item in results
        if item.get(
            "status"
        ) == "verified"
    )

    possible_matches = sum(
        1
        for item in results
        if item.get(
            "status"
        )
        == "possible_match"
    )

    unverified = sum(
        1
        for item in results
        if item.get(
            "status"
        )
        in [
            "unverified",
            "lookup_error",
        ]
    )

    total = len(
        results
    )

    verification_score = round(
        (
            verified
            + (
                possible_matches
                * 0.5
            )
        )
        / total
        * 100
    )

    return {
        "total_checked":
            total,

        "verified":
            verified,

        "possible_matches":
            possible_matches,

        "unverified":
            unverified,

        "verification_score":
            verification_score,

        "references":
            results,

        "message":
            (
                "Crossref verification checks for scholarly "
                "metadata matches. An unverified reference does "
                "not automatically mean that the reference is fake."
            ),
    }


# =========================================================
# READINESS SCORE
# =========================================================

def build_readiness(
    structure_score: int,
    ai_analysis: dict,
):

    if ai_analysis.get(
        "available"
    ):

        ai_score = (
            ai_analysis.get(
                "ai_score",
                0,
            )
        )

        score = round(
            (
                structure_score
                * 0.40
            )
            +
            (
                ai_score
                * 0.60
            )
        )

    else:

        score = (
            structure_score
        )

    if score >= 85:

        status = (
            "Strong Readiness"
        )

    elif score >= 70:

        status = (
            "Good Progress"
        )

    elif score >= 50:

        status = (
            "Needs Improvement"
        )

    else:

        status = (
            "Early Stage"
        )

    return {
        "score":
            score,

        "status":
            status,

        "note":
            (
                "This is a heuristic pre-submission quality "
                "indicator based on manuscript structure and "
                "AI-assisted assessment. It does not predict "
                "journal acceptance."
            ),
    }


# =========================================================
# JOURNAL FINDER WRAPPER
# =========================================================

async def get_journal_recommendations(
    abstract_text: str,
    keywords: List[str],
):

    if not abstract_text:

        return {
            "available": False,
            "total_candidate_journals": 0,
            "journals": [],
            "message":
                "An abstract is required for journal recommendations.",
        }

    try:

        result = recommend_journals(
            abstract_text,
            keywords,
        )

        # Supports async journal_finder too
        if hasattr(
            result,
            "__await__",
        ):

            result = await result

        if result is None:

            return {
                "available": True,
                "total_candidate_journals": 0,
                "journals": [],
            }

        if isinstance(
            result,
            list,
        ):

            return {
                "available": True,
                "total_candidate_journals":
                    len(result),
                "journals":
                    result,
            }

        if isinstance(
            result,
            dict,
        ):

            result.setdefault(
                "available",
                True,
            )

            result.setdefault(
                "journals",
                [],
            )

            result.setdefault(
                "total_candidate_journals",
                len(
                    result.get(
                        "journals",
                        [],
                    )
                ),
            )

            return result

        return {
            "available": False,
            "total_candidate_journals": 0,
            "journals": [],
            "message":
                "Unexpected journal finder response.",
        }

    except Exception as error:

        print(
            "JOURNAL FINDER ERROR:",
            repr(error),
        )

        return {
            "available": False,
            "total_candidate_journals": 0,
            "journals": [],
            "message":
                "Journal recommendations could not be loaded: "
                + str(error),
        }


# =========================================================
# ANALYZE MANUSCRIPT
# =========================================================

@app.post("/analyze")
async def analyze_manuscript(
    file: UploadFile = File(...)
):

    filename = (
        file.filename
        or "manuscript"
    )

    extension = (
        os.path.splitext(
            filename
        )[1]
        .lower()
    )

    if extension not in [
        ".pdf",
        ".docx",
    ]:

        raise HTTPException(
            status_code=400,
            detail=(
                "Only PDF and DOCX files are supported."
            ),
        )

    file_bytes = await file.read()

    if not file_bytes:

        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    max_size = (
        20
        * 1024
        * 1024
    )

    if len(file_bytes) > max_size:

        raise HTTPException(
            status_code=400,
            detail=(
                "File size must be below 20 MB."
            ),
        )

    # -------------------------
    # EXTRACT TEXT
    # -------------------------

    if extension == ".pdf":

        text = extract_pdf_text(
            file_bytes
        )

        file_type = "PDF"

    else:

        text = extract_docx_text(
            file_bytes
        )

        file_type = "DOCX"

    text = normalize_text(
        text
    )

    if not text:

        raise HTTPException(
            status_code=400,
            detail=(
                "No readable text was found in the document."
            ),
        )

    # -------------------------
    # BASIC ANALYSIS
    # -------------------------

    statistics = (
        get_statistics(
            text
        )
    )

    extracted_sections = (
        extract_sections(
            text
        )
    )

    structure_analysis = (
        analyze_structure(
            extracted_sections
        )
    )

    abstract_text = (
        extracted_sections
        .get(
            "abstract",
            "",
        )
    )

    abstract_analysis = (
        analyze_abstract(
            abstract_text
        )
    )

    keyword_analysis = (
        extract_keywords(
            extracted_sections,
            text,
        )
    )

    keywords = (
        keyword_analysis
        .get(
            "keywords",
            [],
        )
    )

    # -------------------------
    # AI
    # -------------------------

    ai_analysis = (
        analyze_with_gemini(
            text,
            extracted_sections,
        )
    )

    # -------------------------
    # REFERENCES
    # -------------------------

    reference_analysis = (
        await verify_references(
            extracted_sections
            .get(
                "references",
                "",
            )
        )
    )

    # -------------------------
    # JOURNALS
    # -------------------------

    journal_analysis = (
        await get_journal_recommendations(
            abstract_text,
            keywords,
        )
    )

    # -------------------------
    # READINESS
    # -------------------------

    readiness = (
        build_readiness(
            structure_analysis[
                "score"
            ],
            ai_analysis,
        )
    )

    # -------------------------
    # RESPONSE
    # -------------------------

    return {
        "success": True,

        "file": {
            "filename":
                filename,

            "file_type":
                file_type,

            "size_bytes":
                len(
                    file_bytes
                ),
        },

        "statistics":
            statistics,

        "structure_analysis":
            structure_analysis,

        "abstract_analysis":
            abstract_analysis,

        "keyword_analysis":
            keyword_analysis,

        "ai_analysis":
            ai_analysis,

        "reference_analysis":
            reference_analysis,

        "journal_analysis":
            journal_analysis,

        "readiness":
            readiness,

        "extracted_sections":
            extracted_sections,

        "text_preview":
            text[:5000],
    }


# =========================================================
# PDF REPORT
# =========================================================

@app.post("/generate-report")
async def generate_report(
    analysis_result:
    Dict[str, Any]
    = Body(...)
):

    try:

        generated = (
            generate_readiness_report(
                analysis_result
            )
        )

        # Support async function
        if hasattr(
            generated,
            "__await__",
        ):

            generated = await generated

        # BytesIO
        if isinstance(
            generated,
            io.BytesIO,
        ):

            generated.seek(
                0
            )

            pdf_stream = (
                generated
            )

        # Raw bytes
        elif isinstance(
            generated,
            bytes,
        ):

            pdf_stream = (
                io.BytesIO(
                    generated
                )
            )

        else:

            # File-like object
            if hasattr(
                generated,
                "read",
            ):

                try:

                    generated.seek(
                        0
                    )

                except Exception:
                    pass

                pdf_stream = (
                    generated
                )

            else:

                raise ValueError(
                    "Report generator returned unsupported data."
                )

        filename = (
            analysis_result
            .get(
                "file",
                {},
            )
            .get(
                "filename",
                "manuscript",
            )
        )

        filename = re.sub(
            r"\.(pdf|docx)$",
            "",
            filename,
            flags=re.IGNORECASE,
        )

        output_filename = (
            filename
            + "_ResearchReady_Report.pdf"
        )

        return StreamingResponse(
            pdf_stream,
            media_type=(
                "application/pdf"
            ),
            headers={
                "Content-Disposition":
                    (
                        'attachment; filename="'
                        + output_filename
                        + '"'
                    )
            },
        )

    except Exception as error:

        print(
            "PDF REPORT ERROR:",
            repr(error),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not generate PDF report: "
                + str(error)
            ),
        )