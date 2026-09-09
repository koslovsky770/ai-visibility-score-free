export type PageRole =
  | "home"
  | "about"
  | "contact"
  | "service"
  | "blog"
  | "faq"
  | "portfolio"
  | "testimonials"
  | "other";

export interface PageSnapshot {
  url: string;
  role: PageRole;
  httpStatus: number | null;
  fetchError?: string;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  bodyText: string;
  /** Same as bodyText but with nav/footer/header stripped — used for the LLM prompt only. */
  mainText: string;
  wordCount: number;
  paragraphCount: number;
  internalLinks: { href: string; text: string }[];
  externalLinks: { href: string; text: string }[];
  contactHrefs: string[];
  images: { src: string; alt: string | null }[];
  jsonLd: unknown[];
  hasBreadcrumbMarkup: boolean;
  scriptBytes: number;
  htmlBytes: number;
}

export interface SiteSnapshot {
  inputUrl: string;
  finalUrl: string;
  business: { name: string; field: string; region: string };
  robotsTxt: {
    exists: boolean;
    disallowedAll: boolean;
    disallowedPaths: string[];
    sitemapUrls: string[];
  };
  sitemapXml: { exists: boolean; urlCount: number; urls: string[] };
  pages: PageSnapshot[];
  crawlWarnings: string[];
  crawlFailed: boolean;
  crawlFailReason?: string;
}

export type CriterionStatus =
  | "ok"
  | "partial"
  | "missing"
  | "not_applicable"
  | "not_checkable";

export type CriterionSourceType = "automatic" | "content_analysis" | "manual_required";

export interface CriterionResult {
  id: string;
  status: CriterionStatus;
  explanation: string;
  sourceType: CriterionSourceType;
}

export interface EnrichedCriterionResult extends CriterionResult {
  label: string;
  points: number;
  category: number;
}

export interface CategoryScore {
  category: number;
  name: string;
  maxPoints: number;
  earnedPoints: number;
  criteria: EnrichedCriterionResult[];
}

export interface TopAction {
  title: string;
  detail: string;
}

export interface AnalysisReport {
  business: { name: string; field: string; region: string };
  analyzedUrl: string;
  totalScore: number;
  tier: { label: string; range: string };
  categories: CategoryScore[];
  whatWorks: EnrichedCriterionResult[];
  whatIsMissing: EnrichedCriterionResult[];
  topActions: TopAction[];
  crawlWarnings: string[];
  pagesAnalyzed: { url: string; role: PageRole }[];
}

// ---- FREE (homepage-only) report ----

export interface Lead {
  name: string;
  email: string;
  url: string;
  businessName: string;
  field: string;
  region: string;
}

export interface DiscoveredLinkMap {
  role: Exclude<PageRole, "home" | "other">;
  url: string;
  text: string;
}

export interface SiteMapSummary {
  totalPagesFound: number;
  byRole: Partial<Record<Exclude<PageRole, "home" | "other">, DiscoveredLinkMap[]>>;
}

export interface BusinessSnapshot {
  who: string | null;
  what: string | null;
  forWhom: string | null;
  mainServices: string | null;
  expertise: string | null;
  whereOperating: string | null;
  unclear: string[];
}

export interface FreeAnalysisReport {
  business: { name: string; field: string; region: string };
  analyzedUrl: string;
  totalScore: number;
  tier: { label: string; range: string };
  categories: CategoryScore[];
  businessSnapshot: BusinessSnapshot;
  siteMap: SiteMapSummary;
  whatWorks: EnrichedCriterionResult[];
  whatIsMissing: EnrichedCriterionResult[];
  crawlWarnings: string[];
}
