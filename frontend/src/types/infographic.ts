// Infographic data types mirroring the backend Pydantic schemas

export type InfographicFormat = 'auto' | 'process' | 'timeline' | 'comparison' | 'concept_map';

export type ThemeName = 'default' | 'ocean' | 'forest' | 'slate' | 'violet';

// ── Process ──────────────────────────────────────────────────────────────────

export interface ProcessStep {
  step_number: number;
  title: string;
  description: string;
}

export interface ProcessInfographic {
  type: 'process';
  title: string;
  subtitle: string;
  steps: ProcessStep[];
  summary?: string | null;
}

// ── Timeline ─────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  label: string;
  date?: string | null;
  description: string;
}

export interface TimelineInfographic {
  type: 'timeline';
  title: string;
  subtitle: string;
  events: TimelineEvent[];
  summary?: string | null;
}

// ── Comparison ───────────────────────────────────────────────────────────────

export interface ComparisonAttribute {
  attribute: string;
  values: Record<string, string>;
}

export interface ComparisonItem {
  name: string;
  description: string;
}

export interface ComparisonInfographic {
  type: 'comparison';
  title: string;
  subtitle: string;
  items: ComparisonItem[];
  attributes: ComparisonAttribute[];
  summary?: string | null;
}

// ── Concept Map / Overview ───────────────────────────────────────────────────

export interface ConceptSubtopic {
  id: string;
  name: string;
  description: string;
  relationship_to_main?: string | null;
  connected_to?: string[];
}

export interface ConceptMapInfographic {
  type: 'concept_map';
  title: string;
  subtitle: string;
  main_concept: string;
  subtopics: ConceptSubtopic[];
  summary?: string | null;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type InfographicData =
  | ProcessInfographic
  | TimelineInfographic
  | ComparisonInfographic
  | ConceptMapInfographic;

// ── API ───────────────────────────────────────────────────────────────────────

export interface GenerateResponse {
  success: boolean;
  data?: InfographicData;
  format_used?: string;
  is_demo: boolean;
  demo_notice?: string | null;
  error?: string | null;
}

export interface ExtractPdfResponse {
  success: boolean;
  is_scanned: boolean;
  text: string;
  char_count: number;
}

// ── Theme ─────────────────────────────────────────────────────────────────────

export interface ThemeConfig {
  id: ThemeName;
  label: string;
  bg: string;
  headerBg: string;
  accent: string;
  accentText: string;
  text: string;
  subText: string;
  border: string;
  stepBg: string;
  footerBg: string;
  nodeBg?: string;
}
