"""Extractive Content Analysis and Source-Grounded Fallback Service.

This service performs deterministic, rule-based content extraction and
structuring directly from source text without AI hallucination.
It preserves authentic terminology, numbers, and dates while respecting
source structure (headings, lists, paragraph boundaries).
"""
from __future__ import annotations
import re
from typing import Optional
from app.schemas.infographic import (
    ProcessInfographic, ProcessStep,
    TimelineInfographic, TimelineEvent,
    ComparisonInfographic, ComparisonItem, ComparisonAttribute,
    ConceptMapInfographic, ConceptSubtopic,
    InfographicData,
)


# ── Text Cleaning and Normalization ──────────────────────────────────────────

def clean_and_normalize(text: str) -> str:
    """Normalize whitespace, remove artifacts, and standardize punctuation."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Replace weird unicode quotes and dashes
    text = text.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")
    text = text.replace("–", "-").replace("—", "-")
    # Collapse 3+ newlines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove excessive horizontal spaces
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def extract_paragraphs(text: str) -> list[str]:
    """Split text into distinct meaningful paragraphs."""
    cleaned = clean_and_normalize(text)
    paragraphs = [p.strip() for p in cleaned.split("\n\n") if len(p.strip()) > 15]
    if not paragraphs:
        # Fall back to single lines if no double newlines
        paragraphs = [p.strip() for p in cleaned.splitlines() if len(p.strip()) > 20]
    return paragraphs if paragraphs else [cleaned]


def split_sentences(text: str) -> list[str]:
    """Split text into complete, grammatically sound sentences."""
    # Avoid splitting on common abbreviations like e.g., i.e., Dr., etc.
    raw = clean_and_normalize(text)
    # Protect common abbreviations
    protected = raw
    abbrs = ["e.g.", "i.e.", "vs.", "al.", "etc.", "approx.", "Dr.", "Prof."]
    for idx, abbr in enumerate(abbrs):
        protected = protected.replace(abbr, f"__ABBR_{idx}__")

    # Split on sentence boundaries followed by space and capital letter or quote
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])", protected)

    sentences = []
    for p in parts:
        for idx, abbr in enumerate(abbrs):
            p = p.replace(f"__ABBR_{idx}__", abbr)
        s = p.strip()
        if len(s) > 15:
            sentences.append(s)

    return sentences if sentences else [raw.strip()]


def extract_title(text: str) -> tuple[str, str]:
    """Extract a meaningful title and subtitle from the source text."""
    lines = [l.strip() for l in clean_and_normalize(text).splitlines() if l.strip()]
    if not lines:
        return ("Overview & Analysis", "Structured summary from source")

    first_line = lines[0]
    # Check if first line looks like a title or heading (e.g. short, or starting with #)
    if first_line.startswith("#"):
        title = first_line.lstrip("#").strip()
        sub = lines[1] if len(lines) > 1 and len(lines[1]) < 120 else "A structured overview"
        return (clean_title(title), sub)

    # If first line is reasonably short (<= 80 chars) and doesn't end with a period
    if len(first_line) <= 80 and not first_line.endswith((".", "!", "?")):
        sub = lines[1] if len(lines) > 1 and len(lines[1]) < 120 else "Key concepts and insights"
        return (clean_title(first_line), sub)

    # First sentence extraction
    sentences = split_sentences(text)
    if sentences:
        first_sent = sentences[0]
        # Look for leading subject before 'is/are/consists/refers to/was/were'
        match = re.match(r"^([^.,:;]{3,60}?)\s+(?:is|are|was|were|refers to|consists of|represents)\b", first_sent, re.IGNORECASE)
        if match:
            subj = match.group(1).strip()
            return (clean_title(subj), clean_subtitle(first_sent))
        # Otherwise use first words
        words = first_sent.split()
        if len(words) <= 8:
            return (clean_title(first_sent.rstrip(".")), "Summary of key source insights")
        return (clean_title(" ".join(words[:6])), clean_subtitle(first_sent))

    return ("Source Analysis", "Grounded overview from provided content")


def clean_title(title: str) -> str:
    title = title.strip().rstrip(".:;")
    # Strip leading timeline prepositions like "In 1950, "
    title = re.sub(r"^(?:in|during|by|around|circa)\s+\d{4}[,\s]+", "", title, flags=re.IGNORECASE)
    # Strip leading generic procedural prefixes
    title = re.sub(r"^(?:the\s+)?(?:first|second|next|initial)\s+step\s+(?:in|is\s+to|of)\s+", "", title, flags=re.IGNORECASE)
    if len(title) > 70:
        title = title[:67].rsplit(" ", 1)[0] + "…"
    return title.title() if title.islower() else title


def clean_subtitle(text: str) -> str:
    text = text.strip()
    if len(text) > 120:
        text = text[:117].rsplit(" ", 1)[0] + "…"
    return text


def clean_description(text: str, max_chars: int = 240) -> str:
    """Trim description to complete sentence/clause without cutting words abruptly."""
    text = text.strip()
    if len(text) <= max_chars:
        return text
    # Cut at last period, comma, or semicolon before max_chars
    cut = text[:max_chars]
    last_punct = max(cut.rfind(". "), cut.rfind(", "), cut.rfind("; "))
    if last_punct > max_chars * 0.6:
        return cut[:last_punct + (1 if cut[last_punct] == "." else 0)].strip()
    # Otherwise cut at word boundary
    return cut.rsplit(" ", 1)[0].rstrip(",;:-") + "…"


# ── Format Classification ───────────────────────────────────────────────────

def classify_format(text: str) -> str:
    """Accurately classify source text into Process, Timeline, Comparison, or Concept Map."""
    lower = text.lower()
    paragraphs = extract_paragraphs(text)
    sentences = split_sentences(text)

    # 1. Timeline Detection: Look for concrete dates, years, and chronological progression
    year_matches = re.findall(r"\b(1[6-9][0-9]{2}|20[0-2][0-9])\b", text)
    date_marker_matches = re.findall(
        r"\b(?:in|during|by|since|circa|around|from|until)\s+(?:1[6-9][0-9]{2}|20[0-2][0-9]|january|february|march|april|may|june|july|august|september|october|november|december)\b",
        lower,
    )
    if len(set(year_matches)) >= 2 or len(date_marker_matches) >= 2:
        return "timeline"

    # 2. Comparison Detection: Look for comparison patterns and contrasting entities
    comparison_signals = [
        r"\bvs\.?\b", r"\bversus\b", r"\bcompared\s+to\b", r"\bin\s+contrast\b",
        r"\bon\s+the\s+other\s+hand\b", r"\bwhereas\b", r"\bunlike\b",
        r"\bdifferences?\s+between\b", r"\bsimilarit(?:y|ies)\b", r"\bdistinctions?\b",
    ]
    cmp_score = sum(len(re.findall(pat, lower)) for pat in comparison_signals)

    contrasting_terms = [
        ("supervised", "unsupervised"),
        ("frontend", "backend"),
        ("sql", "nosql"),
        ("serverless", "server-based"),
        ("monolith", "microservices"),
        ("rest", "graphql"),
        ("tcp", "udp"),
        ("qualitative", "quantitative"),
        ("client", "server"),
        ("relational", "non-relational"),
    ]
    if any(t1 in lower and t2 in lower for t1, t2 in contrasting_terms):
        cmp_score += 2

    if re.search(r"\b[\w\s]{2,25}\s+(?:vs\.?|versus)\s+[\w\s]{2,25}\b", lower):
        return "comparison"
    if cmp_score >= 2:
        return "comparison"

    # 3. Process Detection: Look for explicit step enumeration or procedural sequences
    step_pattern = re.findall(r"\b(?:step|stage|phase|action)\s+\d+[:.]?|\b\d+\.\s+[A-Z]", text, re.IGNORECASE)
    has_numbered_steps = len(step_pattern) >= 2

    process_keywords = [
        r"\bstep\s+\d+\b", r"\bstage\s+\d+\b", r"\bphase\s+\d+\b",
        r"\b(?:first|second|third|next|final)\s+step\b",
        r"\bhow\s+to\b", r"\bprocedure\b", r"\bworkflow\b", r"\blifecycle\b", r"\bpipeline\b",
        r"\bfirst\b\s*,", r"\bnext\b\s*,", r"\bthen\b\s*,", r"\bsubsequently\b\s*,", r"\bfinally\b\s*,",
        r"\bforward\s+propagation\b.*?\bbackpropagation\b",
    ]
    proc_score = sum(len(re.findall(kw, lower, re.DOTALL)) for kw in process_keywords)

    if has_numbered_steps or proc_score >= 2:
        return "process"

    # 4. Concept Map / Overview: Explanatory, architectural, or conceptual texts
    concept_markers = [
        "is defined as", "consists of", "composed of", "principles of",
        "architecture", "fundamental", "concept", "theory", "types of",
        "classified into", "characterized by", "key components",
    ]
    concept_score = sum(1 for cm in concept_markers if cm in lower)

    if concept_score >= 1 or len(paragraphs) >= 2 or len(sentences) >= 3:
        return "concept_map"

    if proc_score >= 1:
        return "process"

    return "concept_map"


# ── Extractive Generators ───────────────────────────────────────────────────

def generate_demo(text: str, fmt: str) -> InfographicData:
    """Generate source-grounded structured content using semantic heuristic extraction."""
    cleaned = clean_and_normalize(text)
    if fmt == "auto":
        fmt = classify_format(cleaned)

    if fmt == "process":
        return _make_process(cleaned)
    elif fmt == "timeline":
        return _make_timeline(cleaned)
    elif fmt == "comparison":
        return _make_comparison(cleaned)
    elif fmt == "concept_map":
        return _make_concept_map(cleaned)
    else:
        return _make_concept_map(cleaned)


# ── Process Extractor ────────────────────────────────────────────────────────

def _make_process(text: str) -> ProcessInfographic:
    title, subtitle = extract_title(text)
    paragraphs = extract_paragraphs(text)
    sentences = split_sentences(text)

    steps: list[ProcessStep] = []

    # Strategy A: Check for explicit Step / Phase / Numbered lines
    numbered_regex = re.compile(
        r"^(?:(?:Step|Stage|Phase)\s*(\d+)[:.]?|\(?(\d+)\)?[.:])\s*(.+)$",
        re.IGNORECASE,
    )

    detected_items = []
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    for line in lines:
        m = numbered_regex.match(line)
        if m:
            raw_title_desc = m.group(3).strip()
            # Split title and description if separated by - or :
            if " - " in raw_title_desc:
                stitle, sdesc = raw_title_desc.split(" - ", 1)
            elif ": " in raw_title_desc:
                stitle, sdesc = raw_title_desc.split(": ", 1)
            else:
                words = raw_title_desc.split()
                stitle = " ".join(words[:4])
                sdesc = raw_title_desc
            detected_items.append((clean_title(stitle), sdesc))

    # If numbered lines found
    if len(detected_items) >= 2:
        for idx, (stitle, sdesc) in enumerate(detected_items[:8]):
            steps.append(ProcessStep(
                step_number=idx + 1,
                title=stitle,
                description=clean_description(sdesc, 220),
            ))
    else:
        # Strategy B: Identify paragraph or sentence-level stages by key transition words or semantic chunks
        units = paragraphs if len(paragraphs) >= 3 else sentences
        # Filter out intro line if used as title
        usable_units = [u for u in units if len(u.strip()) > 25]

        for idx, unit in enumerate(usable_units[:7]):
            # Try to derive an action-oriented title from the first words of the sentence
            unit_sent = split_sentences(unit)[0] if unit else ""
            words = unit_sent.split()

            # Clean transition prefixes and procedural phrases
            cleaned_unit = re.sub(
                r"^(?:first(?:ly)?|second(?:ly)?|third(?:ly)?|next|then|afterwards|subsequently|finally|in addition|furthermore)[,\s]+",
                "",
                unit_sent,
                flags=re.IGNORECASE,
            ).strip()
            cleaned_unit = re.sub(
                r"^(?:the\s+)?(?:first|second|third|fourth|fifth|next|initial|final|subsequent)\s+step\s+(?:in\s+[^,;:]+?\s+(?:is\s+to\s+|is\s+)?|is\s+to\s+|of\s+)?",
                "",
                cleaned_unit,
                flags=re.IGNORECASE,
            ).strip()

            step_title = ""
            # Check for leading action phrase (e.g. "Collect and preprocess training data")
            lead_match = re.match(r"^([A-Za-z]+(?:\s+(?:and|the|to|of|for|with)?\s+[A-Za-z]+){1,4})", cleaned_unit)
            if lead_match and len(lead_match.group(1)) <= 40:
                step_title = clean_title(lead_match.group(1))
            else:
                step_words = cleaned_unit.split()
                step_title = clean_title(" ".join(step_words[:4])) if step_words else f"Stage {idx + 1}"

            steps.append(ProcessStep(
                step_number=idx + 1,
                title=step_title,
                description=clean_description(unit, 220),
            ))

    # Fallback ensure at least 2 steps
    if len(steps) < 2:
        if sentences:
            for i, sent in enumerate(sentences[:4]):
                steps.append(ProcessStep(
                    step_number=i + 1,
                    title=f"Stage {i + 1}: " + clean_title(" ".join(sent.split()[:3])),
                    description=clean_description(sent, 200),
                ))
        else:
            steps = [
                ProcessStep(step_number=1, title="Initial Stage", description=clean_description(text, 180)),
                ProcessStep(step_number=2, title="Subsequent Execution", description="Key procedural follow-through from the source."),
            ]

    # Meaningful takeaway summary
    summary = None
    if len(sentences) >= 3:
        summary = clean_description(sentences[-1], 200)

    return ProcessInfographic(
        title=title,
        subtitle=subtitle if subtitle else "Step-by-step procedural breakdown",
        steps=steps,
        summary=summary,
    )


# ── Timeline Extractor ───────────────────────────────────────────────────────

def _make_timeline(text: str) -> TimelineInfographic:
    title, subtitle = extract_title(text)
    sentences = split_sentences(text)

    events: list[TimelineEvent] = []
    seen_descriptions = set()

    # Match 4-digit years (1700 - 2099) or dates
    year_regex = re.compile(r"\b(1[7-9]\d{2}|20\d{2})\b")

    for sent in sentences:
        matches = year_regex.findall(sent)
        if matches:
            year = matches[0]
            # Deriving event label cleanly without dangling prepositions or commas
            clean_sent = re.sub(rf"\b{year}\b", "", sent)
            clean_sent = re.sub(r"^(?:in|during|by|around|circa|at)\s*,?\s*", "", clean_sent.strip(" ,-:"), flags=re.IGNORECASE)
            clean_sent = clean_sent.lstrip(" ,-:")
            words = clean_sent.split()
            label_text = " ".join(words[:5]) if words else f"Milestone {year}"
            label = clean_title(label_text)

            desc = clean_description(sent, 220)
            if desc not in seen_descriptions:
                events.append(TimelineEvent(
                    label=label,
                    date=year,
                    description=desc,
                ))
                seen_descriptions.add(desc)

        if len(events) >= 8:
            break

    # Sort chronologically if numeric dates exist
    if events and all(e.date and e.date.isdigit() for e in events):
        events.sort(key=lambda e: int(e.date or "0"))

    # If no dated events found in source, extract sequential phases WITHOUT fabricating years
    limitation_note = None
    if len(events) < 2:
        events = []
        paragraphs = extract_paragraphs(text)
        units = paragraphs if len(paragraphs) >= 3 else sentences
        for idx, u in enumerate(units[:6]):
            first_sent = split_sentences(u)[0] if u else ""
            words = first_sent.split()
            label = clean_title(" ".join(words[:4])) if words else f"Phase {idx + 1}"
            events.append(TimelineEvent(
                label=label,
                date=None,  # NEVER invent dates!
                description=clean_description(u, 200),
            ))
        limitation_note = "Note: The source text does not contain chronological dates or a dated sequence. Recommended format: Concept Map or Process."

    # Guarantee at least 2 events
    if len(events) < 2:
        if len(events) == 1:
            events.append(TimelineEvent(
                label="Subsequent Context",
                date=None,
                description="Related observation or implication from the source.",
            ))
        else:
            events = [
                TimelineEvent(label="Primary Milestone", date=None, description=clean_description(text, 180)),
                TimelineEvent(label="Subsequent Development", date=None, description="Contextual progression from the source."),
            ]

    summary = limitation_note or (clean_description(sentences[-1], 200) if len(sentences) > 3 else None)

    return TimelineInfographic(
        title=title,
        subtitle=subtitle if subtitle else "Chronological sequence of key developments",
        events=events[:8],
        summary=summary,
    )


# ── Comparison Extractor ────────────────────────────────────────────────────

def _make_comparison(text: str) -> ComparisonInfographic:
    title, subtitle = extract_title(text)
    paragraphs = extract_paragraphs(text)
    sentences = split_sentences(text)

    # 1. Identify comparison subjects (entities) from the source
    entity_a = "Subject A"
    entity_b = "Subject B"

    vs_match = re.search(r"([A-Za-z0-9\s]{3,30})\s+(?:vs\.?|versus)\s+([A-Za-z0-9\s]{3,30})", text, re.IGNORECASE)
    if vs_match:
        entity_a = clean_title(vs_match.group(1))
        entity_b = clean_title(vs_match.group(2))
    else:
        # Check contrasting terms pairs with full phrase match (e.g. "Supervised Learning" vs "Unsupervised Learning")
        contrasting_terms = [
            ("supervised", "unsupervised"),
            ("frontend", "backend"),
            ("sql", "nosql"),
            ("serverless", "server-based"),
            ("monolith", "microservices"),
            ("rest", "graphql"),
            ("tcp", "udp"),
            ("qualitative", "quantitative"),
            ("client", "server"),
            ("relational", "non-relational"),
        ]
        lower_text = text.lower()
        matched = False
        for t1, t2 in contrasting_terms:
            if t1 in lower_text and t2 in lower_text:
                m1 = re.search(rf"\b({t1}(?:\s+[a-z]+)?)\b", text, re.IGNORECASE)
                m2 = re.search(rf"\b({t2}(?:\s+[a-z]+)?)\b", text, re.IGNORECASE)
                if m1 and m2:
                    entity_a = clean_title(m1.group(1))
                    entity_b = clean_title(m2.group(1))
                    matched = True
                    break

        if not matched:
            # Look at first sentence for "X and Y"
            first_sent = sentences[0] if sentences else ""
            and_match = re.search(r"^([A-Z][a-z]+(?:\s+[A-Za-z]+)?)\s+and\s+([A-Z][a-z]+(?:\s+[A-Za-z]+)?)", first_sent)
            if and_match:
                entity_a = clean_title(and_match.group(1))
                entity_b = clean_title(and_match.group(2))

    # 2. Extract grounded attributes and corresponding values
    attributes: list[ComparisonAttribute] = []

    # Map sentences mentioning entity_a vs entity_b
    a_sentences = [s for s in sentences if entity_a.lower() in s.lower()]
    b_sentences = [s for s in sentences if entity_b.lower() in s.lower()]

    if a_sentences and b_sentences:
        # Definition / Core Concept attribute
        attributes.append(ComparisonAttribute(
            attribute="Core Principle",
            values={
                entity_a: clean_description(a_sentences[0], 180),
                entity_b: clean_description(b_sentences[0], 180),
            },
        ))

        # Check for secondary attributes like Data, Approach, Application
        if len(a_sentences) > 1 and len(b_sentences) > 1:
            attributes.append(ComparisonAttribute(
                attribute="Mechanism & Methodology",
                values={
                    entity_a: clean_description(a_sentences[1], 180),
                    entity_b: clean_description(b_sentences[1], 180),
                },
            ))
        if len(a_sentences) > 2 and len(b_sentences) > 2:
            attributes.append(ComparisonAttribute(
                attribute="Key Characteristics",
                values={
                    entity_a: clean_description(a_sentences[2], 180),
                    entity_b: clean_description(b_sentences[2], 180),
                },
            ))

    # If insufficient specific mentions, split paragraphs into meaningful comparative dimensions
    if len(attributes) < 2:
        split_point = max(1, len(sentences) // 2)
        part_a = sentences[:split_point]
        part_b = sentences[split_point:]

        attributes.append(ComparisonAttribute(
            attribute="Primary Focus",
            values={
                entity_a: clean_description(part_a[0] if part_a else text, 180),
                entity_b: clean_description(part_b[0] if part_b else text, 180),
            },
        ))
        if len(part_a) > 1 or len(part_b) > 1:
            attributes.append(ComparisonAttribute(
                attribute="Application & Context",
                values={
                    entity_a: clean_description(part_a[1] if len(part_a) > 1 else part_a[0], 180),
                    entity_b: clean_description(part_b[1] if len(part_b) > 1 else part_b[0], 180),
                },
            ))
        if len(part_a) > 2 or len(part_b) > 2:
            attributes.append(ComparisonAttribute(
                attribute="Key Distinction",
                values={
                    entity_a: clean_description(part_a[2] if len(part_a) > 2 else part_a[-1], 180),
                    entity_b: clean_description(part_b[2] if len(part_b) > 2 else part_b[-1], 180),
                },
            ))

    items = [
        ComparisonItem(
            name=entity_a,
            description=clean_description(a_sentences[0] if a_sentences else (sentences[0] if sentences else ""), 120),
        ),
        ComparisonItem(
            name=entity_b,
            description=clean_description(b_sentences[0] if b_sentences else (sentences[min(1, len(sentences)-1)] if sentences else ""), 120),
        ),
    ]

    summary = clean_description(sentences[-1], 200) if len(sentences) >= 2 else "Comparative overview based on source text."

    return ComparisonInfographic(
        title=title,
        subtitle=f"Side-by-side analysis of {entity_a} and {entity_b}",
        items=items,
        attributes=attributes,
        summary=summary,
    )


# ── Concept Map / Overview Extractor ────────────────────────────────────────

def _make_concept_map(text: str) -> ConceptMapInfographic:
    title, subtitle = extract_title(text)
    paragraphs = extract_paragraphs(text)
    sentences = split_sentences(text)

    # The main concept is the core subject of the text
    main_concept = title

    # Extract distinct subtopics / aspects from paragraphs or distinct sentences
    subtopics: list[ConceptSubtopic] = []
    seen_names = set()

    # Relationship connectors that express conceptual meaning
    rel_types = [
        "Consists of", "Processes", "Executes", "Optimizes",
        "Evaluates", "Governed by", "Facilitates", "Enables",
    ]

    units = paragraphs if len(paragraphs) >= 3 else sentences
    for idx, unit in enumerate(units[:6]):
        unit_sents = split_sentences(unit)
        first_sent = unit_sents[0] if unit_sents else unit

        # Extract subtopic name from lead of sentence/paragraph
        words = first_sent.split()
        subtopic_name = ""

        # Check for headings or colons like "Data: ..."
        if ":" in first_sent and len(first_sent.split(":")[0]) < 35:
            subtopic_name = clean_title(first_sent.split(":")[0])
            desc_text = first_sent.split(":", 1)[1].strip()
        else:
            # Extract 2-4 key words, stripping trailing verbs/fillers
            lead = " ".join(words[:4])
            lead = re.sub(r"^(?:in|for|the|a|an|during|each)\s+", "", lead, flags=re.IGNORECASE)
            lead = re.sub(r"\s+(?:are|is|was|were|such\s+as|such|that|which|to|and|in)\b.*$", "", lead, flags=re.IGNORECASE)
            subtopic_name = clean_title(lead) if lead else f"Aspect {idx + 1}"
            desc_text = unit

        if subtopic_name in seen_names:
            subtopic_name = f"{subtopic_name} (Part {idx + 1})"
        seen_names.add(subtopic_name)

        rel = rel_types[idx % len(rel_types)]
        sub_id = f"sub-{idx + 1}"

        subtopics.append(ConceptSubtopic(
            id=sub_id,
            name=subtopic_name,
            description=clean_description(desc_text, 220),
            relationship_to_main=rel,
            connected_to=[f"sub-{((idx) % len(units)) + 1}"] if idx > 0 else [],
        ))

    # Guarantee at least 2 subtopics
    if len(subtopics) < 2:
        subtopics = [
            ConceptSubtopic(
                id="sub-1",
                name="Core Definition",
                description=clean_description(sentences[0] if sentences else text, 200),
                relationship_to_main="Defines",
            ),
            ConceptSubtopic(
                id="sub-2",
                name="Operational Scope",
                description=clean_description(sentences[1] if len(sentences) > 1 else text, 200),
                relationship_to_main="Extends to",
            ),
        ]

    summary = clean_description(sentences[-1], 200) if len(sentences) >= 3 else "Conceptual overview and component map."

    return ConceptMapInfographic(
        title=title,
        subtitle=subtitle if subtitle else "Conceptual architecture and relationships",
        main_concept=main_concept,
        subtopics=subtopics,
        summary=summary,
    )
