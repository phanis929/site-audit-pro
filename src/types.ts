export type Severity = 'High' | 'Medium' | 'Low';

export interface Finding {
  issue: string;
  why_it_matters: string;
  suggested_fix: string;
  severity: Severity;
}

export interface CategoryAudit {
  score: number;
  findings: Finding[];
}

export interface PageSignals {
  url: string;
  title: string;
  meta_description: string;
  has_viewport: boolean;
  h1_count: number;
  h1_samples: string[];
  h2_count: number;
  h3_count: number;
  heading_hierarchy_valid: boolean;
  total_images: number;
  images_with_alt: number;
  alt_coverage_percentage: number;
  response_time_ms: number;
  page_size_kb: number;
  status_code: number;
  is_https: boolean;
  canonical_url?: string;
  has_favicon: boolean;
  content_type?: string;
  lang?: string;
}

export interface PageAudit {
  url: string;
  path: string;
  score: number;
  screenshot_url?: string;
  screenshot_base64?: string;
  signals: PageSignals;
  error?: string;
  categories: {
    ui_ux: CategoryAudit;
    content: CategoryAudit;
    accessibility: CategoryAudit;
    performance: CategoryAudit;
  };
}

export interface SiteWidePattern {
  pattern: string;
  affected_pages: string[];
  why_it_matters: string;
  suggested_fix: string;
  severity: Severity;
  category?: 'ui_ux' | 'content' | 'accessibility' | 'performance' | 'general';
}

export interface AuditReport {
  id: string;
  root_url: string;
  domain: string;
  created_at: string;
  site_score: number;
  category_averages: {
    ui_ux: number;
    content: number;
    accessibility: number;
    performance: number;
  };
  summary: string;
  total_pages_analyzed: number;
  site_wide_patterns: SiteWidePattern[];
  pages: PageAudit[];
  execution_time_seconds: number;
}

export type AuditProgressStage =
  | 'idle'
  | 'discovering'
  | 'screenshots'
  | 'reading_signals'
  | 'auditing_pages'
  | 'checking_accessibility'
  | 'checking_performance'
  | 'site_wide_patterns'
  | 'compiling'
  | 'completed'
  | 'error';

export interface ProgressUpdate {
  stage: AuditProgressStage;
  message: string;
  progressPercent: number;
  currentPage?: string;
  totalPages?: number;
  pagesDiscovered?: string[];
  partialReport?: Partial<AuditReport>;
  error?: string;
}

export interface AuditRequestPayload {
  url: string;
  maxPages: number;
  specificPages?: string[];
}
