try:
    import httpx  # type: ignore[import-not-found]
except ImportError:  # pragma: no cover - handled gracefully when dependency is unavailable
    httpx = None

import re


# =========================================================
# TEXT CLEANING
# =========================================================

def clean_query_text(text: str):

    if not text:
        return ""

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# =========================================================
# GET PUBLICATION YEAR
# =========================================================

def get_publication_year(item):

    possible_fields = [
        "published-print",
        "published-online",
        "published",
        "issued"
    ]

    for field in possible_fields:

        value = item.get(field)

        if not isinstance(
            value,
            dict
        ):
            continue

        date_parts = value.get(
            "date-parts"
        )

        if (
            date_parts
            and
            date_parts[0]
            and
            len(date_parts[0]) > 0
        ):

            try:
                return int(
                    date_parts[0][0]
                )

            except Exception:
                pass

    return None


# =========================================================
# BUILD SEARCH QUERY
# =========================================================

def build_journal_query(
    abstract: str,
    keywords
):

    query_parts = []


    # -------------------------------------
    # KEYWORDS
    # -------------------------------------

    if keywords:

        if isinstance(
            keywords,
            list
        ):

            keyword_text = " ".join(
                keywords[:8]
            )

        else:

            keyword_text = str(
                keywords
            )

        keyword_text = clean_query_text(
            keyword_text
        )

        if keyword_text:

            query_parts.append(
                keyword_text
            )


    # -------------------------------------
    # ABSTRACT
    # -------------------------------------

    if abstract:

        abstract_text = clean_query_text(
            abstract
        )

        # Don't send huge abstract text
        abstract_text = (
            abstract_text[:700]
        )

        if abstract_text:

            query_parts.append(
                abstract_text
            )


    return " ".join(
        query_parts
    ).strip()


# =========================================================
# NORMALIZE JOURNAL NAME
# =========================================================

def normalize_journal_name(
    journal_name: str
):

    journal_name = (
        journal_name
        .lower()
        .strip()
    )

    journal_name = re.sub(
        r"\s+",
        " ",
        journal_name
    )

    return journal_name


# =========================================================
# JOURNAL RECOMMENDATION ENGINE
# =========================================================

async def recommend_journals(
    abstract: str,
    keywords,
    crossref_email: str = "",
    limit: int = 5
):

    search_query = build_journal_query(
        abstract,
        keywords
    )


    # -------------------------------------
    # CHECK INPUT
    # -------------------------------------

    if not search_query:

        return {

            "available":
                False,

            "message":
                (
                    "Not enough abstract or keyword "
                    "information was available for "
                    "journal matching."
                ),

            "journals":
                []

        }


    # -------------------------------------
    # CROSSREF PARAMETERS
    # -------------------------------------

    params = {

        "query.bibliographic":
            search_query,

        "filter":
            "type:journal-article",

        "rows":
            30

    }


    if crossref_email:

        params[
            "mailto"
        ] = crossref_email


    # -------------------------------------
    # USER AGENT
    # -------------------------------------

    user_agent = (
        "ResearchReadyAI/1.0"
    )


    if crossref_email:

        user_agent += (
            f" (mailto:{crossref_email})"
        )


    headers = {

        "User-Agent":
            user_agent

    }


    try:

        async with httpx.AsyncClient(

            headers=headers,

            timeout=15.0,

            follow_redirects=True

        ) as client:


            response = await client.get(

                "https://api.crossref.org/works",

                params=params

            )


        # ---------------------------------
        # CROSSREF ERROR
        # ---------------------------------

        if response.status_code != 200:

            return {

                "available":
                    False,

                "message":
                    (
                        "Crossref journal search "
                        "could not be completed."
                    ),

                "status_code":
                    response.status_code,

                "journals":
                    []

            }


        data = response.json()


        items = (

            data
            .get(
                "message",
                {}
            )
            .get(
                "items",
                []
            )

        )


        if not items:

            return {

                "available":
                    True,

                "message":
                    (
                        "No sufficiently related "
                        "Crossref journal articles "
                        "were found."
                    ),

                "journals":
                    []

            }


        # =================================================
        # AGGREGATE JOURNALS
        # =================================================

        journal_data = {}


        for index, item in enumerate(
            items
        ):


            # ---------------------------------
            # JOURNAL NAME
            # ---------------------------------

            container_titles = (
                item.get(
                    "container-title",
                    []
                )
            )


            if not container_titles:

                continue


            journal_name = (
                container_titles[0]
                .strip()
            )


            if not journal_name:

                continue


            journal_key = (
                normalize_journal_name(
                    journal_name
                )
            )


            # ---------------------------------
            # SEARCH SCORE
            # ---------------------------------

            try:

                crossref_score = float(
                    item.get(
                        "score",
                        0
                    )
                )

            except Exception:

                crossref_score = 0


            # ---------------------------------
            # RANK WEIGHT
            # ---------------------------------

            rank_weight = max(
                0,
                30 - index
            )


            aggregate_value = (

                max(
                    crossref_score,
                    1
                )

                +

                rank_weight * 0.20

            )


            # ---------------------------------
            # CREATE JOURNAL ENTRY
            # ---------------------------------

            if journal_key not in journal_data:

                journal_data[
                    journal_key
                ] = {

                    "journal_name":
                        journal_name,

                    "publisher":
                        item.get(
                            "publisher"
                        ),

                    "issns":
                        [],

                    "related_papers":
                        0,

                    "aggregate_score":
                        0.0,

                    "sample_articles":
                        []

                }


            journal = (
                journal_data[
                    journal_key
                ]
            )


            journal[
                "related_papers"
            ] += 1


            journal[
                "aggregate_score"
            ] += aggregate_value


            # ---------------------------------
            # ISSN
            # ---------------------------------

            issns = item.get(
                "ISSN",
                []
            )


            for issn in issns:

                if (
                    issn
                    not in
                    journal["issns"]
                ):

                    journal[
                        "issns"
                    ].append(
                        issn
                    )


            # ---------------------------------
            # SAMPLE RELATED ARTICLES
            # ---------------------------------

            if (
                len(
                    journal[
                        "sample_articles"
                    ]
                )
                <
                3
            ):

                titles = item.get(
                    "title",
                    []
                )


                article_title = (

                    titles[0]

                    if titles

                    else "Untitled article"

                )


                journal[
                    "sample_articles"
                ].append({

                    "title":
                        article_title,

                    "doi":
                        item.get(
                            "DOI"
                        ),

                    "year":
                        get_publication_year(
                            item
                        )

                })


        # =================================================
        # SORT JOURNALS
        # =================================================

        journals = list(
            journal_data.values()
        )


        journals.sort(

            key=lambda x:
                x[
                    "aggregate_score"
                ],

            reverse=True

        )


        if not journals:

            return {

                "available":
                    True,

                "message":
                    (
                        "No journal metadata "
                        "could be extracted from "
                        "the related Crossref results."
                    ),

                "journals":
                    []

            }


        # =================================================
        # NORMALIZE RELEVANCE SCORE
        # =================================================

        highest_score = max(

            journal[
                "aggregate_score"
            ]

            for journal in journals

        )


        final_journals = []


        for journal in journals[:limit]:

            if highest_score > 0:

                relative_score = (

                    journal[
                        "aggregate_score"
                    ]

                    /
                    highest_score

                )

            else:

                relative_score = 0


            # Heuristic display score
            relevance_score = round(

                50

                +

                (
                    relative_score
                    * 45
                )

            )


            relevance_score = min(
                relevance_score,
                95
            )


            final_journals.append({

                "journal_name":
                    journal[
                        "journal_name"
                    ],

                "relevance_score":
                    relevance_score,

                "publisher":
                    journal[
                        "publisher"
                    ],

                "issns":
                    journal[
                        "issns"
                    ],

                "related_papers":
                    journal[
                        "related_papers"
                    ],

                "reason":
                    (
                        "This journal appears among "
                        "Crossref-indexed articles "
                        "related to the manuscript's "
                        "abstract and keywords."
                    ),

                "sample_articles":
                    journal[
                        "sample_articles"
                    ]

            })


        # =================================================
        # FINAL RESPONSE
        # =================================================

        return {

            "available":
                True,

            "query":
                search_query,

            "total_related_articles":
                len(items),

            "total_candidate_journals":
                len(journals),

            "method":
                (
                    "Crossref similar-work "
                    "journal aggregation"
                ),

            "note":
                (
                    "The relevance score is a "
                    "heuristic topic-match indicator. "
                    "It is not an acceptance "
                    "probability and does not guarantee "
                    "that the journal is suitable for "
                    "submission."
                ),

            "journals":
                final_journals

        }


    except Exception as error:

        return {

            "available":
                False,

            "message":
                (
                    "Journal recommendation "
                    "failed: "
                    f"{str(error)}"
                ),

            "journals":
                []

        }