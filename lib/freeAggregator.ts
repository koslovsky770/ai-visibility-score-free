import type {
  CriterionResult,
  EnrichedCriterionResult,
  CategoryScore,
  FreeAnalysisReport,
  BusinessSnapshot,
  SiteMapSummary,
  PageRole,
} from "./types";
import type { HomepageSnapshot } from "./homepageCrawler";
import { FREE_CATEGORY_INFO, FREE_CRITERIA } from "./freeCriteria";

function statusEarnedRatio(status: CriterionResult["status"]): number {
  switch (status) {
    case "ok":
      return 1;
    case "partial":
      return 0.5;
    default:
      return 0;
  }
}

function tierFor(score: number): { label: string; range: string } {
  if (score >= 90) return { label: "רמת מוכנות גבוהה מאוד", range: "90–100" };
  if (score >= 75) return { label: "דף הבית בנוי בצורה טובה מאוד", range: "75–89" };
  if (score >= 60) return { label: "בסיס טוב, ויש מקום לשיפור", range: "60–74" };
  if (score >= 40) return { label: "יש בסיס, אבל קיימים פערים משמעותיים", range: "40–59" };
  return { label: "דף הבית כמעט לא מוכן", range: "0–39" };
}

function buildSiteMapSummary(snapshot: HomepageSnapshot): SiteMapSummary {
  const byRole: SiteMapSummary["byRole"] = {};
  let total = 0;
  for (const [role, links] of Object.entries(snapshot.siteMap.byRole)) {
    if (links.length === 0) continue;
    byRole[role as Exclude<PageRole, "home" | "other">] = links.map((l) => ({
      role: role as Exclude<PageRole, "home" | "other">,
      url: l.url,
      text: l.text,
    }));
    total += links.length;
  }
  return { totalPagesFound: total, byRole };
}

export function aggregateFreeReport(
  snapshot: HomepageSnapshot,
  ruleResults: CriterionResult[],
  llmResults: CriterionResult[],
  businessSnapshot: BusinessSnapshot,
): FreeAnalysisReport {
  const resultsById = new Map<string, CriterionResult>();
  for (const r of [...ruleResults, ...llmResults]) resultsById.set(r.id, r);

  const enrichedAll: EnrichedCriterionResult[] = FREE_CRITERIA.map((def) => {
    const found = resultsById.get(def.id);
    const res: CriterionResult = found ?? {
      id: def.id,
      status: "not_checkable",
      explanation: "לא ניתן היה לבדוק קריטריון זה.",
      sourceType: "manual_required",
    };
    return { ...res, label: def.label, points: def.points, category: def.category };
  });

  const categories: CategoryScore[] = [1, 2, 3, 4, 5].map((catNum) => {
    const info = FREE_CATEGORY_INFO[catNum];
    const inCategory = enrichedAll.filter((c) => c.category === catNum);
    const applicable = inCategory.filter((c) => c.status !== "not_applicable" && c.status !== "not_checkable");
    const applicableMaxPoints = applicable.reduce((s, c) => s + c.points, 0);
    const applicableEarned = applicable.reduce((s, c) => s + c.points * statusEarnedRatio(c.status), 0);
    const earnedPoints = applicableMaxPoints > 0 ? (applicableEarned / applicableMaxPoints) * info.maxPoints : 0;

    return {
      category: catNum,
      name: info.name,
      maxPoints: info.maxPoints,
      earnedPoints: Math.round(earnedPoints * 10) / 10,
      criteria: inCategory,
    };
  });

  const totalScore = Math.round(categories.reduce((s, c) => s + c.earnedPoints, 0));

  const whatWorks = enrichedAll
    .filter((c) => c.status === "ok")
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  const whatIsMissing = enrichedAll
    .filter((c) => c.status === "missing" || c.status === "partial")
    .sort((a, b) => {
      const lostA = a.points * (1 - statusEarnedRatio(a.status));
      const lostB = b.points * (1 - statusEarnedRatio(b.status));
      return lostB - lostA;
    })
    .slice(0, 8);

  return {
    business: snapshot.business,
    analyzedUrl: snapshot.finalUrl,
    totalScore,
    tier: tierFor(totalScore),
    categories,
    businessSnapshot,
    siteMap: buildSiteMapSummary(snapshot),
    whatWorks,
    whatIsMissing,
    crawlWarnings: snapshot.crawlWarnings,
  };
}
