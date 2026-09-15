import { NextRequest, NextResponse } from "next/server";
import { buildHomepageSnapshot } from "@/lib/homepageCrawler";
import { runFreeRuleEngine } from "@/lib/freeRuleEngine";
import { runFreeLlmAnalysis, FREE_LLM_MODEL } from "@/lib/freeLlmAnalysis";
import { aggregateFreeReport } from "@/lib/freeAggregator";
import { saveLead } from "@/lib/leads";
import { logCost } from "@/lib/costLog";
import {
  checkEmailQuota,
  checkDomainQuota,
  checkIpQuota,
  getCachedReport,
  setCachedReport,
} from "@/lib/rateLimitAndCache";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const url = typeof b.url === "string" ? b.url.trim() : "";
  const businessName = typeof b.businessName === "string" ? b.businessName.trim() : "";
  const field = typeof b.field === "string" ? b.field.trim() : "";
  const region = typeof b.region === "string" ? b.region.trim() : "";
  const marketingConsent = b.marketingConsent === true;

  // businessName/field are no longer collected upfront in the UI — the
  // point of the free check is to see whether the homepage itself explains
  // the business, not to ask the user to explain it first. They stay
  // optional here and, when blank, the report simply won't show a
  // business name/field (the AI-derived businessSnapshot is unaffected).
  if (!name || !email || !url) {
    return NextResponse.json({ error: "יש להזין שם, אימייל וכתובת אתר." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "כתובת האימייל שהוזנה אינה תקינה." }, { status: 400 });
  }

  // Server-side usage limits — must run before any expensive work, and
  // can't be bypassed from the client. See lib/rateLimitAndCache.ts.
  const ip = getClientIp(req);
  const ipQuota = await checkIpQuota(ip);
  if (!ipQuota.allowed) {
    return NextResponse.json({ error: ipQuota.message }, { status: 429 });
  }
  const emailQuota = await checkEmailQuota(email);
  if (!emailQuota.allowed) {
    return NextResponse.json({ error: emailQuota.message }, { status: 429 });
  }
  const domainQuota = await checkDomainQuota(url);
  if (!domainQuota.allowed) {
    return NextResponse.json({ error: domainQuota.message }, { status: 429 });
  }

  const cached = await getCachedReport(url);
  if (cached) {
    const report = { ...cached, business: { name: businessName, field, region } };
    logCost({ url, model: FREE_LLM_MODEL, usage: null, cached: true });
    await saveLead({
      name,
      email,
      url,
      businessName,
      field,
      region,
      score: report.totalScore,
      createdAt: new Date().toISOString(),
      cached: true,
      estimatedCostUsd: 0,
      marketingConsent,
    });
    return NextResponse.json({ report });
  }

  let snapshot;
  try {
    snapshot = await buildHomepageSnapshot(url, { name: businessName, field, region });
  } catch (err) {
    console.error("Homepage crawl failed unexpectedly", err);
    return NextResponse.json({ error: "אירעה שגיאה בסריקת האתר. נסו שוב מאוחר יותר." }, { status: 500 });
  }

  if (snapshot.crawlFailed) {
    return NextResponse.json(
      {
        crawlFailed: true,
        message: snapshot.crawlWarnings[0] ?? "לא ניתן היה לגשת לאתר.",
        crawlWarnings: snapshot.crawlWarnings,
      },
      { status: 200 },
    );
  }

  const ruleResults = runFreeRuleEngine(snapshot);

  let llmResults;
  let businessSnapshot;
  let usage;
  try {
    const llm = await runFreeLlmAnalysis(snapshot);
    llmResults = llm.criteria;
    businessSnapshot = llm.businessSnapshot;
    usage = llm.usage;
  } catch (err) {
    console.error("LLM analysis failed", err);
    return NextResponse.json(
      {
        error:
          "לא ניתן היה להשלים את ניתוח התוכן (שירות ה-AI לא זמין כרגע). ודאו שמוגדר מפתח ANTHROPIC_API_KEY ונסו שוב.",
      },
      { status: 502 },
    );
  }

  const report = aggregateFreeReport(snapshot, ruleResults, llmResults, businessSnapshot);
  const estimatedCostUsd = logCost({ url, model: FREE_LLM_MODEL, usage, cached: false });

  await setCachedReport(url, report);
  await saveLead({
    name,
    email,
    url,
    businessName,
    field,
    region,
    score: report.totalScore,
    createdAt: new Date().toISOString(),
    cached: false,
    estimatedCostUsd,
    marketingConsent,
  });

  return NextResponse.json({ report });
}
