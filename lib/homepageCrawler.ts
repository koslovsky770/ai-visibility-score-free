import * as cheerio from "cheerio";
import type { PageSnapshot, PageRole } from "./types";
import { mapSiteLinks, type DiscoveredLink } from "./pageDiscovery";

export interface RawSiteMap {
  totalPagesFound: number;
  byRole: Record<Exclude<PageRole, "home" | "other">, DiscoveredLink[]>;
}

const USER_AGENT = "AIVisibilityScoreFreeBot/0.1 (+MVP homepage readiness checker)";
const FETCH_TIMEOUT_MS = 10_000;

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,*/*" },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseRobotsTxt(raw: string): { disallowedAll: boolean; disallowedPaths: string[]; sitemapUrls: string[] } {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const sitemapUrls: string[] = [];
  const disallowedPaths: string[] = [];
  let inWildcardBlock = false;
  let sawWildcardAgent = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("sitemap:")) {
      sitemapUrls.push(line.slice(line.indexOf(":") + 1).trim());
      continue;
    }
    if (lower.startsWith("user-agent:")) {
      const agent = line.slice(line.indexOf(":") + 1).trim();
      inWildcardBlock = agent === "*";
      if (inWildcardBlock) sawWildcardAgent = true;
      continue;
    }
    if (inWildcardBlock && lower.startsWith("disallow:")) {
      const path = line.slice(line.indexOf(":") + 1).trim();
      if (path) disallowedPaths.push(path);
    }
  }

  const disallowedAll = sawWildcardAgent && disallowedPaths.includes("/");
  return { disallowedAll, disallowedPaths, sitemapUrls };
}

async function fetchRobotsTxt(origin: string) {
  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`, 6000);
    if (!res.ok) return { exists: false, disallowedAll: false, disallowedPaths: [], sitemapUrls: [] };
    const raw = await res.text();
    return { exists: true, ...parseRobotsTxt(raw) };
  } catch {
    return { exists: false, disallowedAll: false, disallowedPaths: [], sitemapUrls: [] };
  }
}

async function fetchSitemapUrls(origin: string, declaredSitemaps: string[]) {
  const candidates = declaredSitemaps.length > 0 ? declaredSitemaps : [`${origin}/sitemap.xml`];
  for (const sitemapUrl of candidates) {
    try {
      const res = await fetchWithTimeout(sitemapUrl, 6000);
      if (!res.ok) continue;
      const raw = await res.text();
      const $ = cheerio.load(raw, { xmlMode: true });
      const urls: string[] = [];
      $("loc").each((_, el) => {
        const text = $(el).text().trim();
        if (text) urls.push(text);
      });
      if (urls.length > 0) return { exists: true, urlCount: urls.length, urls };
    } catch {
      continue;
    }
  }
  return { exists: false, urlCount: 0, urls: [] as string[] };
}

async function fetchAndParseHomepage(url: string, siteHostname: string): Promise<PageSnapshot> {
  const base: Omit<PageSnapshot, "httpStatus" | "fetchError"> = {
    url,
    role: "home",
    title: null,
    metaDescription: null,
    canonical: null,
    robotsMeta: null,
    h1: [],
    h2: [],
    h3: [],
    bodyText: "",
    wordCount: 0,
    paragraphCount: 0,
    internalLinks: [],
    externalLinks: [],
    contactHrefs: [],
    images: [],
    jsonLd: [],
    hasBreadcrumbMarkup: false,
    scriptBytes: 0,
    htmlBytes: 0,
  };

  try {
    const res = await fetchWithTimeout(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const scriptBytes = $("script")
      .toArray()
      .reduce((sum, el) => sum + ($(el).html()?.length ?? 0), 0);

    const jsonLd: unknown[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      const raw = $(el).contents().text();
      try {
        jsonLd.push(JSON.parse(raw));
      } catch {
        // malformed JSON-LD — skip, don't crash the crawl
      }
    });

    const content = $.root().clone();
    content.find("script, style, noscript, svg").remove();
    const bodyText = content.text().replace(/\s+/g, " ").trim();
    const paragraphCount = $("p").filter((_, el) => $(el).text().trim().length > 0).length;

    const internalLinks: { href: string; text: string }[] = [];
    const externalLinks: { href: string; text: string }[] = [];
    const contactHrefs: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const text = $(el).text().trim().replace(/\s+/g, " ");
      if (!href || href.startsWith("#")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) {
        contactHrefs.push(href);
        return;
      }
      try {
        const abs = new URL(href, url);
        if (abs.hostname === siteHostname) {
          internalLinks.push({ href: abs.toString(), text });
        } else {
          externalLinks.push({ href: abs.toString(), text });
        }
      } catch {
        // ignore malformed hrefs
      }
    });

    const images: { src: string; alt: string | null }[] = [];
    $("img").each((_, el) => {
      const src = $(el).attr("src") ?? "";
      const alt = $(el).attr("alt") ?? null;
      if (src) images.push({ src, alt });
    });

    const hasBreadcrumbMarkup =
      jsonLd.some((b) => JSON.stringify(b).includes("BreadcrumbList")) ||
      $('[class*="breadcrumb" i], [aria-label*="breadcrumb" i]').length > 0;

    return {
      ...base,
      httpStatus: res.status,
      title: $("title").first().text().trim() || null,
      metaDescription: $('meta[name="description"]').attr("content")?.trim() || null,
      canonical: $('link[rel="canonical"]').attr("href")?.trim() || null,
      robotsMeta: $('meta[name="robots"]').attr("content")?.trim().toLowerCase() || null,
      h1: $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean),
      h2: $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean),
      h3: $("h3").map((_, el) => $(el).text().trim()).get().filter(Boolean),
      bodyText,
      wordCount: bodyText.split(/\s+/).filter(Boolean).length,
      paragraphCount,
      internalLinks,
      externalLinks,
      contactHrefs,
      images,
      jsonLd,
      hasBreadcrumbMarkup,
      scriptBytes,
      htmlBytes: html.length,
    };
  } catch (err) {
    return {
      ...base,
      httpStatus: null,
      fetchError: err instanceof Error ? err.message : "שגיאה לא ידועה בסריקת דף הבית",
    };
  }
}

export interface HomepageSnapshot {
  inputUrl: string;
  finalUrl: string;
  business: { name: string; field: string; region: string };
  robotsTxt: { exists: boolean; disallowedAll: boolean; disallowedPaths: string[]; sitemapUrls: string[] };
  sitemapXml: { exists: boolean; urlCount: number; urls: string[] };
  page: PageSnapshot;
  siteMap: RawSiteMap;
  crawlWarnings: string[];
  crawlFailed: boolean;
  crawlFailReason?: string;
}

export async function buildHomepageSnapshot(
  inputUrl: string,
  business: { name: string; field: string; region: string },
): Promise<HomepageSnapshot> {
  const homeUrl = normalizeUrl(inputUrl);
  const crawlWarnings: string[] = [];
  let origin: string;
  let hostname: string;
  try {
    const parsed = new URL(homeUrl);
    origin = parsed.origin;
    hostname = parsed.hostname;
  } catch {
    return {
      inputUrl,
      finalUrl: homeUrl,
      business,
      robotsTxt: { exists: false, disallowedAll: false, disallowedPaths: [], sitemapUrls: [] },
      sitemapXml: { exists: false, urlCount: 0, urls: [] },
      page: { ...emptyPage(homeUrl), httpStatus: null, fetchError: "invalid_url" },
      siteMap: { totalPagesFound: 0, byRole: emptyByRole() },
      crawlWarnings: ["כתובת ה-URL שהוזנה אינה תקינה"],
      crawlFailed: true,
      crawlFailReason: "invalid_url",
    };
  }

  const robotsTxt = await fetchRobotsTxt(origin);
  if (robotsTxt.disallowedAll) {
    crawlWarnings.push("robots.txt של האתר חוסם סריקה גורפת — הבדיקה מתבססת על מידע חלקי בלבד");
  }

  const sitemapXml = await fetchSitemapUrls(origin, robotsTxt.sitemapUrls);
  const page = await fetchAndParseHomepage(homeUrl, hostname);

  if (page.fetchError || (page.httpStatus !== null && page.httpStatus >= 400)) {
    return {
      inputUrl,
      finalUrl: homeUrl,
      business,
      robotsTxt,
      sitemapXml,
      page,
      siteMap: { totalPagesFound: 0, byRole: emptyByRole() },
      crawlWarnings: [
        ...crawlWarnings,
        "לא ניתן היה לגשת לדף הבית של האתר (חסימה, שגיאת שרת או timeout) — הבדיקה מבוססת על מידע חלקי בלבד",
      ],
      crawlFailed: true,
      crawlFailReason: page.fetchError ?? `http_${page.httpStatus}`,
    };
  }

  const navLinks: DiscoveredLink[] = page.internalLinks.map((l) => ({ url: l.href, text: l.text }));
  const byRole = mapSiteLinks(navLinks, sitemapXml.urls, homeUrl);
  const totalPagesFound = Object.values(byRole).reduce((s, arr) => s + arr.length, 0);

  const totalWords = page.wordCount;
  if (page.htmlBytes > 0 && totalWords < 40 && page.scriptBytes > page.htmlBytes * 0.3) {
    crawlWarnings.push(
      "דף הבית נראה כמבוסס במידה רבה על JavaScript בצד לקוח (SPA). הכלי סורק HTML סטטי בלבד, ולכן חלק מהתוכן עשוי שלא להיראות בבדיקה — אין להסיק מכך בהכרח שהתוכן חסר בפועל.",
    );
  }

  return {
    inputUrl,
    finalUrl: homeUrl,
    business,
    robotsTxt,
    sitemapXml,
    page,
    siteMap: { totalPagesFound, byRole },
    crawlWarnings,
    crawlFailed: false,
  };
}

function emptyByRole(): RawSiteMap["byRole"] {
  return { about: [], contact: [], service: [], blog: [], faq: [], portfolio: [], testimonials: [] };
}

function emptyPage(url: string): PageSnapshot {
  return {
    url,
    role: "home",
    httpStatus: null,
    title: null,
    metaDescription: null,
    canonical: null,
    robotsMeta: null,
    h1: [],
    h2: [],
    h3: [],
    bodyText: "",
    wordCount: 0,
    paragraphCount: 0,
    internalLinks: [],
    externalLinks: [],
    contactHrefs: [],
    images: [],
    jsonLd: [],
    hasBreadcrumbMarkup: false,
    scriptBytes: 0,
    htmlBytes: 0,
  };
}
