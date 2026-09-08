import type { PageSnapshot, CriterionResult, CriterionStatus } from "./types";
import type { HomepageSnapshot, RawSiteMap } from "./homepageCrawler";

const PHONE_RE = /(?:\+972[-\s]?|0)(?:[23489]|5[0-9]|7[0-9])[-\s]?\d{3}[-\s]?\d{4}/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const KNOWN_PROFILE_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "tiktok.com",
];

function result(id: string, status: CriterionStatus, explanation: string): CriterionResult {
  return { id, status, explanation, sourceType: "automatic" };
}

function extractPhones(text: string): string[] {
  return [...text.matchAll(PHONE_RE)].map((m) => m[0].replace(/[-\s]/g, ""));
}

function extractEmails(text: string): string[] {
  return [...text.matchAll(EMAIL_RE)].map((m) => m[0].toLowerCase());
}

function ratioStatus(ratio: number): CriterionStatus {
  if (ratio >= 0.7) return "ok";
  if (ratio > 0) return "partial";
  return "missing";
}

// ---- Category 1 ----
function checkContactDetailsClear(page: PageSnapshot, siteMap: RawSiteMap): CriterionResult {
  const text = `${page.title ?? ""} ${page.bodyText}`;
  const hasPhone = extractPhones(text).length > 0 || page.contactHrefs.some((h) => h.startsWith("tel:"));
  const hasEmail = extractEmails(text).length > 0 || page.contactHrefs.some((h) => h.startsWith("mailto:"));
  const hasContactLink = (siteMap.byRole.contact?.length ?? 0) > 0;
  if ((hasPhone && hasEmail) || (hasContactLink && (hasPhone || hasEmail))) {
    return result("contact_details_clear", "ok", "נמצאו פרטי קשר (טלפון ו/או אימייל) בדף הבית או קישור ברור לעמוד צור קשר.");
  }
  if (hasPhone || hasEmail || hasContactLink) {
    return result("contact_details_clear", "partial", "נמצא ערוץ קשר אחד בלבד — לא נמצאו גם טלפון וגם אימייל, וגם לא קישור ברור לעמוד צור קשר.");
  }
  return result("contact_details_clear", "missing", "לא נמצאו טלפון, אימייל או קישור לעמוד צור קשר בדף הבית.");
}

// ---- Category 2 ----
function checkExternalProfileLinks(page: PageSnapshot): CriterionResult {
  const links = page.externalLinks.map((l) => l.href.toLowerCase());
  const found = KNOWN_PROFILE_HOSTS.filter((host) => links.some((l) => l.includes(host)));
  if (found.length >= 2) return result("external_profile_links", "ok", `נמצאו קישורים לפרופילים חיצוניים: ${found.join(", ")}.`);
  if (found.length === 1) return result("external_profile_links", "partial", `נמצא קישור חיצוני יחיד (${found[0]}).`);
  return result("external_profile_links", "missing", "לא נמצאו קישורים לפרופילים עסקיים חיצוניים בדף הבית.");
}

// ---- Category 3 ----
function checkH1(page: PageSnapshot): CriterionResult {
  if (page.h1.length === 1) return result("h1_present", "ok", "בדף הבית קיימת כותרת H1 יחידה וברורה.");
  if (page.h1.length > 1) return result("h1_present", "partial", `נמצאו ${page.h1.length} כותרות H1 בדף הבית — מומלץ שתהיה כותרת H1 אחת בלבד.`);
  return result("h1_present", "missing", "לא נמצאה כותרת H1 בדף הבית.");
}

function checkHeadingHierarchy(page: PageSnapshot): CriterionResult {
  if (page.h1.length === 0) return result("heading_hierarchy", "not_checkable", "לא נמצאה כותרת H1 לבחינת ההיררכיה שמתחתיה.");
  if (page.h2.length > 0) return result("heading_hierarchy", "ok", "דף הבית כולל היררכיה סבירה של כותרות משנה (H2) מתחת ל-H1.");
  return result("heading_hierarchy", "missing", "לא נמצאו כותרות משנה (H2) בדף הבית.");
}

function checkParagraphStructure(page: PageSnapshot): CriterionResult {
  if (page.paragraphCount >= 3) return result("paragraph_structure", "ok", "דף הבית מחולק למספר פסקאות ברורות.");
  if (page.paragraphCount >= 1) return result("paragraph_structure", "partial", "דף הבית כולל מעט מאוד פסקאות טקסט.");
  return result("paragraph_structure", "missing", "לא נמצאה חלוקה לפסקאות בדף הבית.");
}

function checkContentNotImageOnly(page: PageSnapshot): CriterionResult {
  if (page.wordCount < 40 && page.images.length >= 3) {
    return result("content_not_image_only", "missing", "כמות הטקסט בדף הבית נמוכה מאוד ביחס לכמות התמונות — ייתכן שתוכן מרכזי מוצג כתמונה או נטען ב-JavaScript.");
  }
  if (page.wordCount < 100) {
    return result("content_not_image_only", "partial", "כמות הטקסט בדף הבית מצומצמת יחסית.");
  }
  return result("content_not_image_only", "ok", "דף הבית כולל תוכן טקסטואלי משמעותי ב-HTML.");
}

function checkNavigation(page: PageSnapshot): CriterionResult {
  if (page.internalLinks.length >= 4) return result("clear_navigation", "ok", "דף הבית כולל ניווט עשיר עם מספר קישורים פנימיים.");
  if (page.internalLinks.length >= 1) return result("clear_navigation", "partial", "דף הבית כולל ניווט מצומצם בלבד.");
  return result("clear_navigation", "missing", "לא נמצאו קישורי ניווט פנימיים בדף הבית.");
}

function checkTitleMeta(page: PageSnapshot): CriterionResult {
  const hasTitle = (page.title?.length ?? 0) >= 10;
  const hasMeta = (page.metaDescription?.length ?? 0) >= 20;
  if (hasTitle && hasMeta) return result("title_meta", "ok", "לדף הבית יש Title ו-Meta Description תקינים.");
  if (hasTitle || hasMeta) return result("title_meta", "partial", "לדף הבית חסר Title או Meta Description תקין (יש רק אחד מהם).");
  return result("title_meta", "missing", "לדף הבית חסרים Title ו-Meta Description תקינים.");
}

// ---- Category 4 — mapping only ----
function checkLinksToRole(id: string, label: string, count: number): CriterionResult {
  if (count >= 2) return result(id, "ok", `דף הבית מפנה ל-${label} (נמצאו ${count} קישורים רלוונטיים).`);
  if (count === 1) return result(id, "ok", `דף הבית מפנה ל-${label}.`);
  return result(id, "missing", `לא נמצא בדף הבית קישור ל-${label}.`);
}

function checkInternalLinksGeneral(page: PageSnapshot): CriterionResult {
  return result(
    "internal_links_general",
    ratioStatus(Math.min(page.internalLinks.length / 6, 1)),
    `נמצאו ${page.internalLinks.length} קישורים פנימיים בדף הבית.`,
  );
}

// ---- Category 5 ----
function checkCrawlableNoLogin(snapshot: HomepageSnapshot): CriterionResult {
  if (snapshot.crawlFailed) return result("crawlable_no_login", "missing", "לא ניתן היה לגשת לאתר ללא חסימה או הפניה.");
  const looksLikeLogin = /login|signin|sign-in|התחבר/i.test(snapshot.page.url);
  return looksLikeLogin
    ? result("crawlable_no_login", "partial", "דף הבית מפנה למסך התחברות — ייתכן שחלק מהתוכן נעול.")
    : result("crawlable_no_login", "ok", "האתר נגיש לסריקה ללא צורך בהתחברות.");
}

function checkRobotsTxt(snapshot: HomepageSnapshot): CriterionResult {
  if (!snapshot.robotsTxt.exists) return result("robots_txt", "missing", "לא נמצא קובץ robots.txt.");
  if (snapshot.robotsTxt.disallowedAll) return result("robots_txt", "partial", "קיים robots.txt אך הוא חוסם סריקה גורפת של האתר.");
  return result("robots_txt", "ok", "קיים קובץ robots.txt תקין.");
}

function checkSitemap(snapshot: HomepageSnapshot): CriterionResult {
  if (!snapshot.sitemapXml.exists) return result("sitemap_xml", "missing", "לא נמצאה מפת אתר XML.");
  return result("sitemap_xml", "ok", `נמצאה מפת אתר XML עם ${snapshot.sitemapXml.urlCount} כתובות.`);
}

function checkNoIndex(page: PageSnapshot): CriterionResult {
  if (page.robotsMeta?.includes("noindex")) return result("no_noindex", "missing", "דף הבית מסומן ב-noindex — הוא חסום בפני מנועי חיפוש.");
  return result("no_noindex", "ok", "לא נמצא תג noindex בדף הבית.");
}

function checkCanonical(page: PageSnapshot): CriterionResult {
  return page.canonical
    ? result("canonical_valid", "ok", "דף הבית כולל תג canonical.")
    : result("canonical_valid", "missing", "לא נמצא תג canonical בדף הבית.");
}

const RELEVANT_SCHEMA_TYPES = ["Organization", "LocalBusiness", "Service", "Article", "FAQPage", "BreadcrumbList", "Product", "WebSite"];

function schemaTypesOf(block: unknown): string[] {
  if (!block || typeof block !== "object") return [];
  const obj = block as Record<string, unknown>;
  const t = obj["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  if (Array.isArray(obj["@graph"])) return (obj["@graph"] as unknown[]).flatMap(schemaTypesOf);
  return [];
}

function checkStructuredData(page: PageSnapshot): CriterionResult {
  if (page.jsonLd.length === 0) return result("structured_data_relevant", "missing", "לא נמצא structured data (JSON-LD) בדף הבית.");
  const types = page.jsonLd.flatMap(schemaTypesOf);
  const relevantTypes = types.filter((t) => RELEVANT_SCHEMA_TYPES.includes(t));
  if (relevantTypes.length === 0) {
    return result("structured_data_relevant", "partial", `נמצא structured data אך מסוגים כלליים בלבד (${[...new Set(types)].join(", ") || "לא זוהה סוג"}).`);
  }
  return result("structured_data_relevant", "ok", `נמצא structured data רלוונטי מסוג: ${[...new Set(relevantTypes)].join(", ")}.`);
}

function checkLocalBusinessSchema(page: PageSnapshot): CriterionResult {
  const types = page.jsonLd.flatMap(schemaTypesOf);
  const hasOrg = types.some((t) => ["Organization", "LocalBusiness"].includes(t));
  if (!hasOrg) return result("local_business_schema", "missing", "לא נמצא סימון Schema מסוג Organization או LocalBusiness.");
  const block = page.jsonLd.find((b) => schemaTypesOf(b).some((t) => ["Organization", "LocalBusiness"].includes(t))) as
    | Record<string, unknown>
    | undefined;
  const hasName = !!block?.["name"];
  const hasContact = !!block?.["telephone"] || !!block?.["address"];
  if (hasName && hasContact) return result("local_business_schema", "ok", "נמצא Schema של Organization/LocalBusiness הכולל שם ופרטי קשר.");
  return result("local_business_schema", "partial", "נמצא Schema של Organization/LocalBusiness אך חסרים בו שדות מהותיים.");
}

function checkNapSchemaConsistency(page: PageSnapshot): CriterionResult {
  const text = `${page.title ?? ""} ${page.bodyText}`;
  const textPhones = new Set(extractPhones(text));
  const schemaPhones = new Set(
    page.jsonLd
      .map((b) => (b as Record<string, unknown>)?.["telephone"])
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.replace(/[-\s]/g, "")),
  );
  if (schemaPhones.size === 0 || textPhones.size === 0) {
    return result("nap_schema_consistency", "not_checkable", "לא נמצא מספיק מידע (טלפון בטקסט ו/או בסכימה) כדי לבדוק עקביות.");
  }
  const consistent = [...schemaPhones].some((sp) => [...textPhones].some((tp) => tp.includes(sp) || sp.includes(tp)));
  return consistent
    ? result("nap_schema_consistency", "ok", "פרטי הטלפון בטקסט הגלוי תואמים לאלה שב-structured data.")
    : result("nap_schema_consistency", "partial", "נמצא אי-התאמה בין פרטי הטלפון בטקסט הגלוי לבין אלה שב-structured data.");
}

function checkImagesAltText(page: PageSnapshot): CriterionResult {
  if (page.images.length === 0) return result("images_alt_text", "not_applicable", "אין תמונות בדף הבית.");
  const withAlt = page.images.filter((i) => (i.alt ?? "").trim().length > 2).length;
  return result(
    "images_alt_text",
    ratioStatus(withAlt / page.images.length),
    `${withAlt} מתוך ${page.images.length} תמונות בדף הבית כוללות טקסט alt משמעותי.`,
  );
}

export function runFreeRuleEngine(snapshot: HomepageSnapshot): CriterionResult[] {
  const { page, siteMap } = snapshot;
  return [
    checkContactDetailsClear(page, siteMap),
    checkExternalProfileLinks(page),
    checkH1(page),
    checkHeadingHierarchy(page),
    checkParagraphStructure(page),
    checkContentNotImageOnly(page),
    checkNavigation(page),
    checkTitleMeta(page),
    checkLinksToRole("links_to_about", "עמוד אודות", siteMap.byRole.about?.length ?? 0),
    checkLinksToRole("links_to_services", "עמודי שירותים/מוצרים", siteMap.byRole.service?.length ?? 0),
    checkLinksToRole("links_to_content", "תוכן מקצועי (בלוג/מאמרים)", siteMap.byRole.blog?.length ?? 0),
    checkLinksToRole("links_to_faq", "שאלות ותשובות", siteMap.byRole.faq?.length ?? 0),
    checkLinksToRole(
      "links_to_proof",
      "המלצות או תיק עבודות",
      (siteMap.byRole.testimonials?.length ?? 0) + (siteMap.byRole.portfolio?.length ?? 0),
    ),
    checkInternalLinksGeneral(page),
    checkCrawlableNoLogin(snapshot),
    checkRobotsTxt(snapshot),
    checkSitemap(snapshot),
    checkNoIndex(page),
    checkCanonical(page),
    checkStructuredData(page),
    checkLocalBusinessSchema(page),
    checkNapSchemaConsistency(page),
    checkImagesAltText(page),
  ];
}
