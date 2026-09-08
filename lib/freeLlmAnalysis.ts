import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { CriterionResult, BusinessSnapshot } from "./types";
import type { HomepageSnapshot } from "./homepageCrawler";
import { llmFreeCriteria } from "./freeCriteria";

const MAX_PAGE_TEXT_CHARS = 4000;

const StatusEnum = z.enum(["ok", "partial", "missing", "not_applicable", "not_checkable"]);

const CriterionResultSchema = z.object({
  id: z.string(),
  status: StatusEnum,
  explanation: z.string(),
});

const BusinessSnapshotSchema = z.object({
  who: z.string().nullable(),
  what: z.string().nullable(),
  forWhom: z.string().nullable(),
  mainServices: z.string().nullable(),
  expertise: z.string().nullable(),
  whereOperating: z.string().nullable(),
  unclear: z.array(z.string()),
});

const FreeLLMOutputSchema = z.object({
  businessSnapshot: BusinessSnapshotSchema,
  criteria: z.array(CriterionResultSchema),
});

const SYSTEM_PROMPT = `אתה מנתח מוכנות של **דף הבית בלבד** של אתר עסקי, במסגרת כלי חינמי בשם "AI Visibility Score — בדיקת דף בית".

תפקידך: לקבל תמצית של תוכן דף הבית בלבד (עוד לא נסרקו עמודים פנימיים), ולדרג רשימת קריטריונים נתונה, וגם לסכם מה ניתן להבין על העסק מדף הבית בלבד.

כלל מרכזי וקריטי: **דף הבית הוא שער כניסה, לא כל האתר**. השאלה היא "האם דף הבית ממלא היטב את תפקידו כשער כניסה, ומוביל בצורה טובה לעומק?" — ולא "האם כל המידע על העסק נמצא בדף הבית?".
לכן:
- אל תעניש קריטריון על כך שמידע מסוים (פירוט שירות מלא, ביוגרפיה ארוכה, שאלות ותשובות רבות, מאמרים) לא נמצא בדף הבית עצמו — מידע כזה שייך לעמודים ייעודיים.
- אם דף הבית מציג שירות בקצרה ומקשר לעמוד ייעודי, זו התנהגות **טובה** ויש להתייחס אליה בחיוב, לא בשלילה.
- אתה מדרג רק קריטריונים שעוסקים בבהירות, במבנה ובאיתותי אמון **כפי שהם נראים בדף הבית עצמו**.

כללים נוספים:
1. התבסס אך ורק על התוכן שסופק לך. אל תמציא מידע.
2. אם התוכן לא מספיק כדי להכריע (טקסט קצר מדי, חשד לאתר מבוסס JavaScript), החזר "not_checkable".
3. אם קריטריון לא רלוונטי לסוג העסק, החזר "not_applicable".
4. לעולם אל תעריך או תרמוז האם ChatGPT, Gemini או כל מנוע AI אחר "אוהב" את האתר, ולעולם אל תבטיח הופעה בתשובות של מנועי AI.
5. explanation לכל קריטריון: לבעל עסק שאינו איש טכנולוגיה. **כשהסטטוס partial או missing, חובה לכלול בתוך אותו משפט גם הסבר קונקרטי איך לתקן** (לא רק לתאר את הבעיה) — למשל: "הכותרת הראשית מציגה מסר שיווקי כללי ולא מבהירה מיד למי השירות מיועד. מומלץ להוסיף מתחת לכותרת משפט קצר שמגדיר את סוג הלקוחות ואת השירות המרכזי." לעולם לא ניסוח כללי כמו "שפרו את הכותרת".
6. businessSnapshot: סכם בעברית ברורה מה עולה מדף הבית בכל שדה. אם שדה מסוים לא ברור מהתוכן שסופק — החזר null עבורו והוסף את שמו למערך unclear (למשל: "תחום המומחיות", "אזור הפעילות").
7. החזר תוצאה עבור כל אחד ואחד מהקריטריונים ברשימה שסופקה, בדיוק לפי המזהים (id) שניתנו — לא פחות ולא יותר.`;

function condenseHomepageForPrompt(snapshot: HomepageSnapshot) {
  const p = snapshot.page;
  return {
    business: snapshot.business,
    crawlWarnings: snapshot.crawlWarnings,
    homepage: {
      url: p.url,
      title: p.title,
      metaDescription: p.metaDescription,
      h1: p.h1.slice(0, 5),
      h2: p.h2.slice(0, 15),
      h3: p.h3.slice(0, 15),
      wordCount: p.wordCount,
      bodyTextExcerpt: p.bodyText.slice(0, MAX_PAGE_TEXT_CHARS),
      schemaTypesFound: p.jsonLd.map((b) => (b as Record<string, unknown>)?.["@type"]).filter(Boolean),
    },
    siteMapFoundOnHomepage: Object.fromEntries(
      Object.entries(snapshot.siteMap.byRole).map(([role, links]) => [
        role,
        links.slice(0, 5).map((l) => l.text || l.url),
      ]),
    ),
  };
}

export async function runFreeLlmAnalysis(
  snapshot: HomepageSnapshot,
): Promise<{ criteria: CriterionResult[]; businessSnapshot: BusinessSnapshot }> {
  const criteriaForPrompt = llmFreeCriteria().map((c) => ({
    id: c.id,
    category: c.category,
    label: c.label,
    points: c.points,
  }));

  const client = new Anthropic();

  const userContent = JSON.stringify(
    {
      siteData: condenseHomepageForPrompt(snapshot),
      criteriaToScore: criteriaForPrompt,
    },
    null,
    2,
  );

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    output_config: {
      effort: "high",
      format: zodOutputFormat(FreeLLMOutputSchema),
    },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("מודל השפה לא החזיר תשובה תקינה בפורמט הצפוי.");
  }

  const criteriaResults: CriterionResult[] = parsed.criteria.map((c) => ({
    id: c.id,
    status: c.status,
    explanation: c.explanation,
    sourceType: "content_analysis" as const,
  }));

  return { criteria: criteriaResults, businessSnapshot: parsed.businessSnapshot };
}
