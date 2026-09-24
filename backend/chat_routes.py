import json
import os
from typing import List, Literal, Optional

try:
    from dotenv import load_dotenv  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - compatibility if python-dotenv is unavailable
    def load_dotenv(*_args, **_kwargs):
        return False

from fastapi import APIRouter, HTTPException  # type: ignore[import-not-found]
from google import genai

try:
    from pydantic import BaseModel  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - compatibility for Pydantic v1
    try:
        from pydantic.v1 import BaseModel  # type: ignore[import-not-found]
    except ImportError:  # pragma: no cover - compatibility if pydantic is unavailable
        class BaseModel:  # type: ignore[no-redef]
            pass


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


# =========================================================
# CHAT MODEL FALLBACK ORDER
# =========================================================
#
# Chat starts with Flash-Lite because it is fast and
# cost-efficient. If quota/capacity is unavailable,
# it automatically tries another stable Gemini model.
#

CHAT_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
]


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    tags=["AI Research Chat"]
)


# =========================================================
# GEMINI CLIENT
# =========================================================

client = None

if GEMINI_API_KEY:
    client = genai.Client(
        api_key=GEMINI_API_KEY
    )


# =========================================================
# REQUEST MODELS
# =========================================================

class ChatMessage(BaseModel):
    role: Literal[
        "user",
        "assistant"
    ]

    text: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]

    context: Optional[dict] = None


# =========================================================
# MANUSCRIPT CONTEXT
# =========================================================

def build_manuscript_context(
    context: Optional[dict]
) -> str:

    if not context:

        return """
No manuscript is currently selected.

Answer as a general academic research assistant.
"""

    useful_context = {

        "file":
            context.get("file"),

        "readiness":
            context.get("readiness"),

        "statistics":
            context.get("statistics"),

        "structure_analysis":
            context.get(
                "structure_analysis"
            ),

        "abstract_analysis":
            context.get(
                "abstract_analysis"
            ),

        "keyword_analysis":
            context.get(
                "keyword_analysis"
            ),

        "ai_analysis":
            context.get(
                "ai_analysis"
            ),

        "reference_analysis":
            context.get(
                "reference_analysis"
            ),

        "journal_analysis":
            context.get(
                "journal_analysis"
            ),

        "extracted_sections":
            context.get(
                "extracted_sections"
            ),

        "text_preview":
            context.get(
                "text_preview"
            ),
    }

    manuscript_json = json.dumps(
        useful_context,
        ensure_ascii=False,
        indent=2,
        default=str,
    )

    # Prevent extremely large requests
    if len(manuscript_json) > 35000:

        manuscript_json = (
            manuscript_json[:35000]
        )

    return f"""
The user selected a manuscript.

Use the following manuscript analysis
for manuscript-specific questions.

====================================
MANUSCRIPT CONTEXT
====================================

{manuscript_json}

====================================
END MANUSCRIPT CONTEXT
====================================
"""


# =========================================================
# CHAT HISTORY
# =========================================================

def build_chat_history(
    messages: List[ChatMessage]
) -> str:

    # Keep latest messages only
    recent_messages = (
        messages[-10:]
    )

    history = []

    for message in recent_messages:

        role = (
            "USER"
            if message.role == "user"
            else "ASSISTANT"
        )

        history.append(
            f"{role}: {message.text}"
        )

    return "\n\n".join(
        history
    )


# =========================================================
# CHECK WHETHER ERROR CAN USE FALLBACK
# =========================================================

def is_fallback_error(
    error: Exception
) -> bool:

    text = str(
        error
    ).upper()

    fallback_errors = [

        # Quota / rate limit
        "429",
        "RESOURCE_EXHAUSTED",
        "QUOTA",
        "RATE LIMIT",

        # Temporary service capacity
        "503",
        "UNAVAILABLE",
        "HIGH DEMAND",

        # Occasionally upstream transient
        "500",
        "INTERNAL",

        # Timeout
        "TIMEOUT",
        "TIMED OUT",
    ]

    return any(
        keyword in text
        for keyword in fallback_errors
    )


# =========================================================
# GEMINI MODEL FALLBACK
# =========================================================

def generate_ai_reply(
    prompt: str
):

    last_error = None

    for model_name in CHAT_MODELS:

        try:

            print(
                f"AI Chat trying: {model_name}"
            )

            response = (
                client.models
                .generate_content(
                    model=model_name,
                    contents=prompt,
                )
            )

            reply = getattr(
                response,
                "text",
                None,
            )

            if reply and reply.strip():

                print(
                    f"AI Chat success: {model_name}"
                )

                return (
                    reply.strip(),
                    model_name,
                )

            print(
                f"{model_name} returned no text."
            )

        except Exception as error:

            last_error = error

            print(
                f"AI Chat model failed: {model_name}"
            )

            print(
                str(error)
            )

            # Quota/capacity problem:
            # immediately try next model.
            if is_fallback_error(
                error
            ):

                print(
                    "Trying fallback model..."
                )

                continue

            # Authentication / invalid request etc.
            # Switching model usually won't fix these.
            raise

    raise RuntimeError(
        "All configured AI models are currently unavailable. "
        f"Last provider error: {last_error}"
    )


# =========================================================
# LOCAL SAFETY FALLBACK
# =========================================================
#
# This does NOT pretend to be generated AI.
# It gives a useful message rather than exposing
# a giant provider error to the frontend.
#

def local_fallback_reply(
    question: str,
    context: Optional[dict]
):

    question_lower = (
        question.lower()
    )

    if (
        "literature review"
        in question_lower
    ):

        return (
            "A literature review is a structured review of "
            "existing research related to your topic. It should "
            "summarize important studies, compare their findings, "
            "identify limitations or disagreements, and explain "
            "the research gap that your work addresses."
        )

    if (
        "methodology"
        in question_lower
    ):

        return (
            "A strong methodology section should clearly explain "
            "the research design, dataset or participants, data "
            "collection process, tools or algorithms used, "
            "evaluation metrics, and how the results were "
            "validated. It should contain enough detail for "
            "another researcher to understand or reproduce the "
            "study."
        )

    if (
        "abstract"
        in question_lower
    ):

        return (
            "A strong abstract usually includes the research "
            "problem, objective, methodology, key results, and "
            "main conclusion in a concise form. The exact length "
            "should follow the target journal's requirements."
        )

    if (
        "reference"
        in question_lower
        or
        "citation"
        in question_lower
    ):

        return (
            "For references, check that every citation points to "
            "the correct source, bibliographic details are "
            "complete, DOI information is accurate when available, "
            "and the formatting follows the target journal style. "
            "An unverified Crossref match does not automatically "
            "mean that a reference is fake."
        )

    if (
        "journal"
        in question_lower
    ):

        return (
            "Journal selection should consider topic and scope "
            "match, article type, author guidelines, indexing, "
            "publication model, and submission requirements. "
            "ResearchReady's journal relevance score represents "
            "topic similarity only and does not predict acceptance."
        )

    # Manuscript-aware basic fallback
    if context:

        readiness = (
            context.get(
                "readiness",
                {}
            )
        )

        ai_analysis = (
            context.get(
                "ai_analysis",
                {}
            )
        )

        score = readiness.get(
            "score"
        )

        recommendations = (
            ai_analysis.get(
                "recommendations",
                []
            )
        )

        response_parts = []

        if score is not None:

            response_parts.append(
                f"The selected manuscript currently has a "
                f"readiness score of {score}/100."
            )

        if recommendations:

            response_parts.append(
                "The saved analysis recommends: "
                + "; ".join(
                    recommendations[:3]
                )
            )

        if response_parts:

            return " ".join(
                response_parts
            )

    return (
        "The AI provider has temporarily reached its usage limit. "
        "Your ResearchReady application is still working, but a "
        "new generative response cannot be produced until an AI "
        "model becomes available. Please retry shortly."
    )


# =========================================================
# CHAT ENDPOINT
# =========================================================

@router.post("/chat")
async def research_chat(
    request: ChatRequest
):

    # -------------------------
    # CONFIG CHECK
    # -------------------------

    if not GEMINI_API_KEY:

        raise HTTPException(
            status_code=500,
            detail=(
                "GEMINI_API_KEY is not configured."
            ),
        )

    if client is None:

        raise HTTPException(
            status_code=500,
            detail=(
                "Gemini client could not be initialized."
            ),
        )

    # -------------------------
    # VALIDATE MESSAGE
    # -------------------------

    if not request.messages:

        raise HTTPException(
            status_code=400,
            detail=(
                "No chat messages were provided."
            ),
        )

    latest_message = (
        request.messages[-1]
    )

    if (
        latest_message.role
        != "user"
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Latest message must be from the user."
            ),
        )

    question = (
        latest_message
        .text
        .strip()
    )

    if not question:

        raise HTTPException(
            status_code=400,
            detail=(
                "Question cannot be empty."
            ),
        )

    # -------------------------
    # BUILD CONTEXT
    # -------------------------

    manuscript_context = (
        build_manuscript_context(
            request.context
        )
    )

    chat_history = (
        build_chat_history(
            request.messages
        )
    )

    # -------------------------
    # PROMPT
    # -------------------------

    prompt = f"""
You are ResearchReady AI, an academic research assistant.

Your purpose is to help students, researchers and authors improve
research work before journal submission.

You can help with:

- research paper structure
- abstracts
- introductions
- literature reviews
- research gaps
- objectives
- research questions
- hypotheses
- methodology
- research design
- results interpretation
- discussions
- conclusions
- limitations
- future work
- academic writing
- citations
- references
- journal selection
- reviewer-style feedback
- general research questions


RULES:

1. Never invent research findings.

2. Never invent statistics or experimental values.

3. Never fabricate authors, references, citations or DOI numbers.

4. Never guarantee journal acceptance.

5. Journal recommendations indicate topic relevance only.

6. An unverified reference does not automatically mean
   that it is fake.

7. If manuscript information is missing, say that
   the information is unavailable.

8. Preserve the researcher's intended meaning when
   suggesting writing improvements.

9. Clearly distinguish observations from suggestions.

10. Give clear, practical and academically appropriate answers.


{manuscript_context}


====================================
RECENT CONVERSATION
====================================

{chat_history}

====================================
END CONVERSATION
====================================


Answer the user's latest question naturally.

Do not repeat the question unnecessarily.

Do not start every answer with:
"As an AI language model".
"""

    # -------------------------
    # AI GENERATION
    # -------------------------

    try:

        reply, used_model = (
            generate_ai_reply(
                prompt
            )
        )

        return {
            "success": True,
            "reply": reply,
            "model": used_model,
            "fallback": False,
        }

    except Exception as error:

        print(
            "All Gemini models failed:"
        )

        print(
            str(error)
        )

        # Don't expose huge Gemini API error
        # to the frontend.
        fallback_reply = (
            local_fallback_reply(
                question,
                request.context,
            )
        )

        return {
            "success": True,
            "reply": fallback_reply,
            "model": "local-fallback",
            "fallback": True,
        }