from io import BytesIO

from reportlab.lib import colors  # type: ignore[reportMissingModuleSource]
from reportlab.lib.enums import TA_CENTER  # type: ignore[reportMissingModuleSource]
from reportlab.lib.pagesizes import A4  # type: ignore[reportMissingModuleSource]
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle  # type: ignore[reportMissingModuleSource]
from reportlab.lib.units import mm  # type: ignore[reportMissingModuleSource]

from reportlab.platypus import (  # type: ignore[reportMissingModuleSource]
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


# =========================================================
# HELPERS
# =========================================================

def safe(value, default="Not available"):
    if value is None:
        return default

    value = str(value).strip()

    return value if value else default


def score_text(value):
    if value is None:
        return "--"

    return f"{value}/100"


# =========================================================
# PDF GENERATOR
# =========================================================

def generate_readiness_report(data: dict):

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="ResearchReady AI - Journal Readiness Report",
        author="ResearchReady AI",
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#1D4ED8"),
        spaceAfter=8,
    )

    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=18,
    )

    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=12,
        spaceAfter=8,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=15,
        textColor=colors.HexColor("#334155"),
    )

    small_style = ParagraphStyle(
        "Small",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8,
        leading=12,
        textColor=colors.HexColor("#64748B"),
    )

    story = []

    # =====================================================
    # DATA
    # =====================================================

    file_data = data.get("file", {})
    readiness = data.get("readiness", {})
    structure = data.get("structure_analysis", {})
    ai = data.get("ai_analysis", {})
    references = data.get("reference_analysis", {})
    journals = data.get("journal_analysis", {})
    abstract = data.get("abstract_analysis", {})
    keywords = data.get("keyword_analysis", {})

    # =====================================================
    # HEADER
    # =====================================================

    story.append(
        Paragraph(
            "ResearchReady AI",
            title_style,
        )
    )

    story.append(
        Paragraph(
            "Journal Readiness Report",
            subtitle_style,
        )
    )

    story.append(
        Paragraph(
            f"<b>Manuscript:</b> {safe(file_data.get('filename'))}",
            body_style,
        )
    )

    story.append(Spacer(1, 10))

    # =====================================================
    # OVERALL READINESS
    # =====================================================

    story.append(
        Paragraph(
            "Overall Readiness",
            section_style,
        )
    )

    readiness_table = Table(
        [
            [
                "Readiness Score",
                "Status",
                "Structure",
                "AI Quality",
            ],
            [
                score_text(
                    readiness.get("score")
                ),
                safe(
                    readiness.get("status")
                ),
                score_text(
                    structure.get("score")
                ),
                score_text(
                    ai.get("ai_score")
                    if ai.get("available")
                    else None
                ),
            ],
        ],
        colWidths=[
            40 * mm,
            48 * mm,
            38 * mm,
            38 * mm,
        ],
    )

    readiness_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#EFF6FF"),
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#1D4ED8"),
                ),
                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold",
                ),
                (
                    "FONTNAME",
                    (0, 1),
                    (-1, 1),
                    "Helvetica",
                ),
                (
                    "ALIGN",
                    (0, 0),
                    (-1, -1),
                    "CENTER",
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "BOX",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.HexColor("#CBD5E1"),
                ),
                (
                    "INNERGRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.HexColor("#E2E8F0"),
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),
            ]
        )
    )

    story.append(
        readiness_table
    )

    if readiness.get("note"):

        story.append(Spacer(1, 8))

        story.append(
            Paragraph(
                safe(
                    readiness.get("note")
                ),
                small_style,
            )
        )

    # =====================================================
    # AI SCORES
    # =====================================================

    if ai.get("available"):

        story.append(
            Paragraph(
                "AI Manuscript Assessment",
                section_style,
            )
        )

        ai_rows = [
            [
                "Assessment",
                "Score",
            ],
            [
                "Abstract Quality",
                score_text(
                    ai.get(
                        "abstract_score"
                    )
                ),
            ],
            [
                "Academic Writing",
                score_text(
                    ai.get(
                        "academic_writing_score"
                    )
                ),
            ],
            [
                "Research Clarity",
                score_text(
                    ai.get(
                        "research_clarity_score"
                    )
                ),
            ],
            [
                "Methodology Clarity",
                score_text(
                    ai.get(
                        "methodology_clarity_score"
                    )
                ),
            ],
            [
                "Results Clarity",
                score_text(
                    ai.get(
                        "results_clarity_score"
                    )
                ),
            ],
            [
                "Conclusion Quality",
                score_text(
                    ai.get(
                        "conclusion_score"
                    )
                ),
            ],
        ]

        ai_table = Table(
            ai_rows,
            colWidths=[
                110 * mm,
                45 * mm,
            ],
        )

        ai_table.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        colors.HexColor("#F1F5F9"),
                    ),
                    (
                        "FONTNAME",
                        (0, 0),
                        (-1, 0),
                        "Helvetica-Bold",
                    ),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.4,
                        colors.HexColor("#CBD5E1"),
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        7,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        7,
                    ),
                ]
            )
        )

        story.append(
            ai_table
        )

        if ai.get("summary"):

            story.append(Spacer(1, 10))

            story.append(
                Paragraph(
                    "<b>AI Summary</b>",
                    body_style,
                )
            )

            story.append(
                Paragraph(
                    safe(
                        ai.get("summary")
                    ),
                    body_style,
                )
            )

    # =====================================================
    # STRENGTHS
    # =====================================================

    strengths = ai.get(
        "strengths",
        []
    )

    if strengths:

        story.append(
            Paragraph(
                "Manuscript Strengths",
                section_style,
            )
        )

        for strength in strengths:

            story.append(
                Paragraph(
                    f"- {safe(strength)}",
                    body_style,
                )
            )

            story.append(
                Spacer(1, 4)
            )

    # =====================================================
    # ISSUES
    # =====================================================

    issues = ai.get(
        "issues",
        []
    )

    if issues:

        story.append(
            Paragraph(
                "Issues Detected",
                section_style,
            )
        )

        for index, issue in enumerate(
            issues,
            start=1,
        ):

            story.append(
                Paragraph(
                    (
                        f"<b>{index}. "
                        f"{safe(issue.get('issue'))}</b>"
                    ),
                    body_style,
                )
            )

            story.append(
                Paragraph(
                    (
                        f"Severity: "
                        f"{safe(issue.get('severity')).upper()}"
                    ),
                    small_style,
                )
            )

            story.append(
                Paragraph(
                    (
                        f"Recommendation: "
                        f"{safe(issue.get('recommendation'))}"
                    ),
                    body_style,
                )
            )

            story.append(
                Spacer(1, 7)
            )

    # =====================================================
    # RECOMMENDATIONS
    # =====================================================

    recommendations = ai.get(
        "recommendations",
        []
    )

    if recommendations:

        story.append(
            Paragraph(
                "Recommendations",
                section_style,
            )
        )

        for index, recommendation in enumerate(
            recommendations,
            start=1,
        ):

            story.append(
                Paragraph(
                    (
                        f"{index}. "
                        f"{safe(recommendation)}"
                    ),
                    body_style,
                )
            )

            story.append(
                Spacer(1, 4)
            )

    # =====================================================
    # ABSTRACT
    # =====================================================

    story.append(
        Paragraph(
            "Abstract Analysis",
            section_style,
        )
    )

    story.append(
        Paragraph(
            (
                f"<b>Status:</b> "
                f"{safe(abstract.get('status'))}<br/>"
                f"<b>Word Count:</b> "
                f"{abstract.get('word_count', 0)}"
            ),
            body_style,
        )
    )

    if abstract.get("message"):

        story.append(
            Paragraph(
                safe(
                    abstract.get("message")
                ),
                body_style,
            )
        )

    # =====================================================
    # KEYWORDS
    # =====================================================

    keyword_list = keywords.get(
        "keywords",
        []
    )

    if keyword_list:

        story.append(
            Paragraph(
                "Detected Keywords",
                section_style,
            )
        )

        story.append(
            Paragraph(
                ", ".join(
                    keyword_list
                ),
                body_style,
            )
        )

    # =====================================================
    # REFERENCE VERIFICATION
    # =====================================================

    story.append(
        PageBreak()
    )

    story.append(
        Paragraph(
            "Reference Verification",
            section_style,
        )
    )

    reference_summary = Table(
        [
            [
                "Checked",
                "Verified",
                "Possible Matches",
                "Unverified",
                "Score",
            ],
            [
                references.get(
                    "total_checked",
                    0,
                ),
                references.get(
                    "verified",
                    0,
                ),
                references.get(
                    "possible_matches",
                    0,
                ),
                references.get(
                    "unverified",
                    0,
                ),
                score_text(
                    references.get(
                        "verification_score"
                    )
                ),
            ],
        ],
        colWidths=[
            30 * mm,
            30 * mm,
            40 * mm,
            30 * mm,
            32 * mm,
        ],
    )

    reference_summary.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#F1F5F9"),
                ),
                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold",
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.HexColor("#CBD5E1"),
                ),
                (
                    "ALIGN",
                    (0, 0),
                    (-1, -1),
                    "CENTER",
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
            ]
        )
    )

    story.append(
        reference_summary
    )

    story.append(
        Spacer(1, 12)
    )

    for index, reference in enumerate(
        references.get(
            "references",
            []
        ),
        start=1,
    ):

        story.append(
            Paragraph(
                (
                    f"<b>Reference {index}</b> - "
                    f"{safe(reference.get('status')).replace('_', ' ').title()}"
                ),
                body_style,
            )
        )

        story.append(
            Paragraph(
                safe(
                    reference.get(
                        "original_reference"
                    )
                ),
                small_style,
            )
        )

        if reference.get(
            "matched_title"
        ):

            story.append(
                Paragraph(
                    (
                        f"<b>Matched Title:</b> "
                        f"{safe(reference.get('matched_title'))}<br/>"
                        f"<b>Journal:</b> "
                        f"{safe(reference.get('journal'))}<br/>"
                        f"<b>DOI:</b> "
                        f"{safe(reference.get('doi'))}<br/>"
                        f"<b>Confidence:</b> "
                        f"{reference.get('confidence', 0)}%"
                    ),
                    small_style,
                )
            )

        story.append(
            Spacer(1, 8)
        )

    # =====================================================
    # JOURNAL FINDER
    # =====================================================

    story.append(
        Paragraph(
            "Recommended Journals",
            section_style,
        )
    )

    journal_list = journals.get(
        "journals",
        []
    )

    if journal_list:

        journal_rows = [
            [
                "Journal",
                "Topic Relevance",
                "Publisher",
                "Related Papers",
            ]
        ]

        for journal in journal_list:

            journal_rows.append(
                [
                    safe(
                        journal.get(
                            "journal_name"
                        )
                    ),
                    (
                        f"{journal.get('relevance_score', 0)}%"
                    ),
                    safe(
                        journal.get(
                            "publisher"
                        )
                    ),
                    journal.get(
                        "related_papers",
                        0,
                    ),
                ]
            )

        journal_table = Table(
            journal_rows,
            colWidths=[
                70 * mm,
                32 * mm,
                50 * mm,
                28 * mm,
            ],
            repeatRows=1,
        )

        journal_table.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        colors.HexColor("#F3E8FF"),
                    ),
                    (
                        "TEXTCOLOR",
                        (0, 0),
                        (-1, 0),
                        colors.HexColor("#7E22CE"),
                    ),
                    (
                        "FONTNAME",
                        (0, 0),
                        (-1, 0),
                        "Helvetica-Bold",
                    ),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.4,
                        colors.HexColor("#CBD5E1"),
                    ),
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "TOP",
                    ),
                    (
                        "TOPPADDING",
                        (0, 0),
                        (-1, -1),
                        7,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, -1),
                        7,
                    ),
                ]
            )
        )

        story.append(
            journal_table
        )

    else:

        story.append(
            Paragraph(
                "No journal recommendations were available.",
                body_style,
            )
        )

    # =====================================================
    # DISCLAIMER
    # =====================================================

    story.append(
        Spacer(1, 20)
    )

    story.append(
        Paragraph(
            "Important Notice",
            section_style,
        )
    )

    story.append(
        Paragraph(
            (
                "ResearchReady AI provides automated pre-submission "
                "assistance. Scores are heuristic indicators. "
                "Reference matching depends on available scholarly "
                "metadata. Journal relevance indicates topic similarity "
                "and does not predict acceptance or guarantee suitability. "
                "Researchers should verify requirements directly with "
                "the target journal before submission."
            ),
            small_style,
        )
    )

    # =====================================================
    # BUILD
    # =====================================================

    document.build(
        story
    )

    buffer.seek(0)

    return buffer