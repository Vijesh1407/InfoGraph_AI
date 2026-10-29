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
  // Real AI image synthesis
  image_url?: string | null;
  image_b64?: string | null;
  image_prompt?: string | null;
  image_provider?: string | null;
  image_model?: string | null;
  image_status?:
    | 'generated'
    | 'missing_credentials'
    | 'missing_token'
    | 'auth_error'
    | 'not_found'
    | 'rate_limited'
    | 'provider_error'
    | 'unverified'
    | 'model_loading'
    | string
    | null;
  image_error?: string | null;
  image_metadata?: Record<string, unknown> | null;
}

export interface SystemConfig {
  llm_provider: string;
  image_provider: string;
  image_model: string;
  has_credentials?: boolean;
  has_hf_token?: boolean;
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
