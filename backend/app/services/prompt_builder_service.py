"""Category-aware visual prompt builder for infographic image generation.

Translates structured infographic data (Process, Timeline, Comparison, Concept Map)
into rich, category-specific visual prompts for open-source diffusion models like FLUX.1-schnell.
"""
from __future__ import annotations
from typing import Optional
from app.schemas.infographic import (
    InfographicData,
    ProcessInfographic,
    TimelineInfographic,
    ComparisonInfographic,
    ConceptMapInfographic,
)

THEME_PALETTES = {
    "default": "modern navy blue, vibrant indigo, cool slate, and crisp white accents with warm gold highlights",
    "ocean": "deep oceanic blue, bright cyan, seafoam teal, and crisp white accents",
    "forest": "emerald green, sage, deep pine, botanical earth tones, and warm beige accents",
    "slate": "minimalist charcoal, monochromatic slate gray, silver, and crisp high-contrast white",
    "violet": "rich violet, deep purple, vibrant magenta, and neon electric lilac accents",
}


def build_image_prompt(
    data: InfographicData,
    category: str,
    theme: Optional[str] = "default",
    source_text: Optional[str] = None,
) -> str:
    """Construct a detailed, category-aware prompt for FLUX.1-schnell.

    Guarantees that the visual composition and iconography directly reflect
    the semantic relationships and factual content of the input text,
    strictly avoiding generic unrelated technology pictures.
    """
    palette_desc = THEME_PALETTES.get(theme or "default", THEME_PALETTES["default"])
    actual_type = getattr(data, "type", category)

    if actual_type == "process" or isinstance(data, ProcessInfographic):
        return _build_process_prompt(data, palette_desc)
    elif actual_type == "timeline" or isinstance(data, TimelineInfographic):
        return _build_timeline_prompt(data, palette_desc)
    elif actual_type == "comparison" or isinstance(data, ComparisonInfographic):
        return _build_comparison_prompt(data, palette_desc)
    elif actual_type == "concept_map" or isinstance(data, ConceptMapInfographic):
        return _build_concept_map_prompt(data, palette_desc)
    else:
        return _build_generic_infographic_prompt(data, palette_desc)


def _build_process_prompt(data: ProcessInfographic, palette: str) -> str:
    """Builds a sequential stage-by-stage workflow visual prompt with directional flow."""
    steps_desc = []
    for step in data.steps:
        # Include specific step names and technical details
        steps_desc.append(f"Stage {step.step_number}: '{step.title}' ({step.description})")
    stages_str = " -> ".join(steps_desc)

    return (
        f"A professional educational process workflow infographic poster illustrating '{data.title}'. "
        f"Structured sequential workflow diagram with {len(data.steps)} ordered stages: {stages_str}. "
        f"Visual composition: A clear horizontal chevron pipeline with directional arrows connecting each stage sequentially from left to right. "
        f"Each stage is enclosed in a distinct card module featuring a large numbered badge (1 to {len(data.steps)}), "
        f"relevant contextual technical icons and mini-diagrams illustrating the specific operation of that stage, "
        f"and clear typographic hierarchy with stage headings. "
        f"Design style: Clean modern vector infographic design, flat graphics, high visual contrast, balanced composition, "
        f"color palette using {palette}. "
        f"Educational graphic design, award-winning informational layout, vector schematics, 8k resolution, crisp clean lines. "
        f"No chaotic clutter, no random stock photo of robots, strictly ordered chronological workflow."
    )


def _build_timeline_prompt(data: TimelineInfographic, palette: str) -> str:
    """Builds a chronological milestone infographic visual prompt with milestone spine."""
    events_desc = []
    for event in data.events:
        date_str = f" [{event.date}]" if event.date else ""
        events_desc.append(f"Milestone '{event.label}'{date_str}: {event.description}")
    milestones_str = " | ".join(events_desc)

    return (
        f"A professional chronological historical timeline infographic poster titled '{data.title}'. "
        f"Subtitle: '{data.subtitle}'. "
        f"Sequential chronological timeline tracking {len(data.events)} milestones: {milestones_str}. "
        f"Visual composition: An elegant chronological timeline spine curving through the composition, "
        f"with alternating milestone markers, circular node checkpoints, and vertical indicator stems. "
        f"Each milestone features a prominent date badge, milestone label, concise event description card, "
        f"and an illustrative pictorial icon representing that historical or technological milestone. "
        f"Design style: Sophisticated educational timeline poster, minimalist editorial infographic, "
        f"clear chronological progression from start to finish, color palette of {palette}. "
        f"High readability, crisp typography layout, clean vector art, balanced informational hierarchy. "
        f"No fabricated dates, no disorganized clusters, strictly linear progression."
    )


def _build_comparison_prompt(data: ComparisonInfographic, palette: str) -> str:
    """Builds a balanced side-by-side comparative infographic visual prompt."""
    items = data.items
    item_names = [item.name for item in items]
    versus_str = " versus ".join(item_names)

    # Compile comparative dimensions
    attr_comparisons = []
    for attr in data.attributes[:4]:
        vals = [f"{k}: {v}" for k, v in attr.values.items()]
        attr_comparisons.append(f"Dimension '{attr.attribute}' ({', '.join(vals)})")
    attrs_str = "; ".join(attr_comparisons)

    return (
        f"A balanced side-by-side comparison infographic poster titled '{data.title}': {versus_str}. "
        f"Visual composition: Two distinct, symmetrical vertical columns comparing {versus_str} side-by-side with a central divider line. "
        f"Left column dedicated to '{items[0].name}' ({items[0].description}) with distinct theme accents and specific illustrative symbols. "
        f"Right column dedicated to '{items[1].name}' ({items[1].description if len(items) > 1 else ''}) with complementary contrasting accents. "
        f"Comparative rows evaluating key dimensions: {attrs_str}. "
        f"Visual badges and comparative icons highlighting core differences (e.g. labeled vs unlabeled, mechanisms, tradeoffs). "
        f"Design style: Modern analytical comparison chart, clean split-screen educational poster, "
        f"color palette using {palette}. "
        f"Symmetrical layout, clean informational architecture, high legibility, professional vector graphics. "
        f"No single-subject bias, no chaotic collage, strictly balanced two-column comparison."
    )


def _build_concept_map_prompt(data: ConceptMapInfographic, palette: str) -> str:
    """Builds a hierarchical concept map and relationship network visual prompt."""
    subtopics_desc = []
    for sub in data.subtopics:
        rel = f" ({sub.relationship_to_main})" if sub.relationship_to_main else ""
        subtopics_desc.append(f"Subconcept '{sub.name}'{rel}: {sub.description}")
    subtopics_str = " | ".join(subtopics_desc)

    return (
        f"A structured conceptual map and relationship diagram infographic poster titled '{data.title}'. "
        f"Central core topic: '{data.main_concept}'. "
        f"Connected conceptual modules: {subtopics_str}. "
        f"Visual composition: A prominent central core hub representing '{data.main_concept}', "
        f"with radiating organic branch lines and labeled relationship vectors connecting to surrounding subordinate concept nodes. "
        f"Each subtopic is housed in a clean geometric node container with descriptive technical icons, clear category headers, "
        f"and directional connector lines illustrating functional hierarchies and dependencies. "
        f"Design style: Modern systems architecture diagram, clean educational knowledge graph poster, "
        f"color palette based on {palette}. "
        f"Balanced circular or radial network composition, elegant vector lines, clear informational hierarchy. "
        f"No random floating icons, strictly connected relational concept network."
    )


def _build_generic_infographic_prompt(data: InfographicData, palette: str) -> str:
    """Fallback generator for any general infographic schema."""
    title = getattr(data, "title", "Educational Infographic")
    subtitle = getattr(data, "subtitle", "")
    return (
        f"A modern educational infographic poster titled '{title}'. {subtitle}. "
        f"Visual composition: Structured informational layout with distinct sections, technical iconography, "
        f"clean data visualization cards, and cohesive visual hierarchy. "
        f"Design style: High quality professional vector infographic, minimalist flat aesthetic, "
        f"color palette featuring {palette}. Crisp typography layout, balanced design, 8k resolution."
    )
