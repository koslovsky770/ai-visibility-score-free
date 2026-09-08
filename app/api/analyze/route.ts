import { NextRequest, NextResponse } from "next/server";
import { buildHomepageSnapshot } from "@/lib/homepageCrawler";
import { runFreeRuleEngine } from "@/lib/freeRuleEngine";
import { runFreeLlmAnalysis } from "@/lib/freeLlmAnalysis";
import { aggregateFreeReport } from "@/lib/freeAggregator";
import { saveLead } from "@/lib/leads";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (!name || !email || !url || !businessName) {
    return NextResponse.json({ error: "יש להזין שם, אימייל, כתובת אתר ושם עסק." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "כתובת האימייל שהוזנה אינה תקינה." }, { status: 400 });
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
  try {
    const llm = await runFreeLlmAnalysis(snapshot);
    llmResults = llm.criteria;
    businessSnapshot = llm.businessSnapshot;
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

  await saveLead({
    name,
    email,
    url,
    businessName,
    field,
    region,
    score: report.totalScore,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ report });
}
