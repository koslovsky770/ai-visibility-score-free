export type FreeCriterionSource = "rule" | "llm";

export interface FreeCriterionDef {
  id: string;
  category: 1 | 2 | 3 | 4 | 5;
  label: string;
  points: number;
  source: FreeCriterionSource;
}

export const FREE_CATEGORY_INFO: Record<number, { name: string; maxPoints: number }> = {
  1: { name: "בהירות העסק וההצעה", maxPoints: 25 },
  2: { name: "אמון וסמכות (איתותים בדף הבית)", maxPoints: 15 },
  3: { name: "מבנה ותוכן דף הבית", maxPoints: 20 },
  4: { name: "מיפוי האתר ודרך לעומק", maxPoints: 20 },
  5: { name: "נגישות טכנית ומידע מובנה", maxPoints: 20 },
};

// Single source of truth for the FREE (homepage-only) scoring model.
// Unlike the full product, this list has no local/brand tracks — it
// evaluates the homepage as a gateway, not the whole business profile.
export const FREE_CRITERIA: FreeCriterionDef[] = [
  // קטגוריה 1 — בהירות העסק וההצעה (25)
  { id: "biz_name_clear", category: 1, label: "שם העסק מופיע בבירור", points: 3, source: "llm" },
  { id: "above_fold_clarity", category: 1, label: "ברור מיד מה העסק עושה", points: 5, source: "llm" },
  { id: "target_audience_clear", category: 1, label: "ברור למי מיועד השירות", points: 4, source: "llm" },
  { id: "services_listed", category: 1, label: "השירותים/המוצרים המרכזיים מוצגים בבירור", points: 4, source: "llm" },
  { id: "value_proposition_clear", category: 1, label: "קיימת הצעת ערך ברורה", points: 3, source: "llm" },
  { id: "differentiation_clear", category: 1, label: "קיים בידול או מומחיות ניכרים", points: 3, source: "llm" },
  { id: "service_area_or_scope_clear", category: 1, label: "ברור היקף/אזור הפעילות (מקומי, ארצי או אונליין)", points: 1, source: "llm" },
  { id: "contact_details_clear", category: 1, label: "פרטי קשר ברורים", points: 2, source: "rule" },

  // קטגוריה 2 — אמון וסמכות, איתותים בלבד על דף הבית (15)
  { id: "experience_signals", category: 2, label: "איתותי ניסיון או ותק מוצגים", points: 3, source: "llm" },
  { id: "credentials_mentioned", category: 2, label: "הכשרות/הסמכות מוזכרות (כשרלוונטי)", points: 2, source: "llm" },
  { id: "clients_or_projects_reference", category: 2, label: "אזכור או קישור ללקוחות, פרויקטים או מקרי בוחן", points: 3, source: "llm" },
  { id: "testimonials_reference", category: 2, label: "אזכור או קישור להמלצות", points: 3, source: "llm" },
  { id: "clear_who_is_behind", category: 2, label: "ברור מי עומד מאחורי המידע", points: 2, source: "llm" },
  { id: "external_profile_links", category: 2, label: "קישורים לפרופילים עסקיים חיצוניים", points: 2, source: "rule" },

  // קטגוריה 3 — מבנה ותוכן דף הבית (20)
  { id: "h1_present", category: 3, label: "כותרת H1 ברורה", points: 4, source: "rule" },
  { id: "heading_hierarchy", category: 3, label: "היררכיה סבירה של H2/H3", points: 3, source: "rule" },
  { id: "headings_descriptive", category: 3, label: "כותרות שמתארות את התוכן ולא רק סלוגן", points: 3, source: "llm" },
  { id: "paragraph_structure", category: 3, label: "חלוקה הגיונית לפסקאות ואזורים", points: 2, source: "rule" },
  { id: "content_not_image_only", category: 3, label: "טקסט משמעותי ולא רק תמונות ועיצוב", points: 3, source: "rule" },
  { id: "clear_navigation", category: 3, label: "ניווט ברור", points: 3, source: "rule" },
  { id: "title_meta", category: 3, label: "Title ו-Meta Description", points: 2, source: "rule" },

  // קטגוריה 4 — מיפוי האתר ודרך לעומק (20) — בודקת קישור/הפניה בלבד, לא תוכן העמודים
  { id: "links_to_about", category: 4, label: "קישור לעמוד אודות משמעותי", points: 4, source: "rule" },
  { id: "links_to_services", category: 4, label: "קישור לעמודי שירותים או מוצרים", points: 5, source: "rule" },
  { id: "links_to_content", category: 4, label: "קישור לתוכן מקצועי (בלוג / מאמרים)", points: 3, source: "rule" },
  { id: "links_to_faq", category: 4, label: "קישור לשאלות ותשובות", points: 2, source: "rule" },
  { id: "links_to_proof", category: 4, label: "קישור להמלצות, תיק עבודות או פרויקטים", points: 3, source: "rule" },
  { id: "internal_links_general", category: 4, label: "קישורים פנימיים רלוונטיים מדף הבית", points: 3, source: "rule" },

  // קטגוריה 5 — נגישות טכנית ומידע מובנה (20)
  { id: "crawlable_no_login", category: 5, label: "האתר נגיש לסריקה ללא login", points: 2, source: "rule" },
  { id: "robots_txt", category: 5, label: "robots.txt קיים ותקין", points: 1, source: "rule" },
  { id: "sitemap_xml", category: 5, label: "קיימת מפת אתר XML", points: 2, source: "rule" },
  { id: "no_noindex", category: 5, label: "אין noindex בדף הבית", points: 3, source: "rule" },
  { id: "canonical_valid", category: 5, label: "קיים canonical תקין", points: 1, source: "rule" },
  { id: "structured_data_relevant", category: 5, label: "קיים structured data רלוונטי", points: 4, source: "rule" },
  { id: "local_business_schema", category: 5, label: "Organization / LocalBusiness schema", points: 3, source: "rule" },
  { id: "nap_schema_consistency", category: 5, label: "עקביות פרטי עסק בין הטקסט לסכימה", points: 2, source: "rule" },
  { id: "images_alt_text", category: 5, label: "תמונות מרכזיות עם טקסט alt משמעותי", points: 2, source: "rule" },
];

export function llmFreeCriteria(): FreeCriterionDef[] {
  return FREE_CRITERIA.filter((c) => c.source === "llm");
}

export function ruleFreeCriteria(): FreeCriterionDef[] {
  return FREE_CRITERIA.filter((c) => c.source === "rule");
}
