import fs from "fs";
import path from "path";
import type { Lead, FreeAnalysisReport } from "./types";

export interface StoredLead extends Lead {
  score: number;
  createdAt: string;
  /** From lib/costLog.ts — 0 when served from cache. */
  estimatedCostUsd?: number;
  cached?: boolean;
  /** Full report already built at the call site — used for the email content
   *  and the audit-trail record on the MySQL side. */
  report: FreeAnalysisReport;
}

/**
 * Persists a lead + its free-check report via a small PHP API on the user's
 * own cPanel hosting (see cpanel-api/), which writes to MySQL and sends the
 * customer a results email. Requires LEADS_API_URL / LEADS_API_KEY — without
 * them this silently no-ops (same graceful-degradation pattern as
 * lib/rateLimitAndCache.ts's getRedis()), so local dev and any deploy
 * without the cPanel side configured keep working, just without persistence.
 *
 * In local dev, leads are also appended to a gitignored JSON-lines file so
 * they're inspectable without needing the live API.
 */
export async function saveLead(lead: StoredLead): Promise<void> {
  console.log("NEW_LEAD", JSON.stringify({ ...lead, report: undefined }));

  if (process.env.NODE_ENV !== "production") {
    try {
      const filePath = path.join(process.cwd(), ".leads.local.jsonl");
      fs.appendFileSync(filePath, JSON.stringify(lead) + "\n", "utf-8");
    } catch (err) {
      console.error("Failed to write local lead file", err);
    }
  }

  const apiUrl = process.env.LEADS_API_URL;
  const apiKey = process.env.LEADS_API_KEY;
  if (!apiUrl || !apiKey) {
    console.warn("LEADS_API_URL/LEADS_API_KEY not set — lead was not persisted to MySQL or emailed.");
    return;
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({
        name: lead.name,
        email: lead.email,
        submittedUrl: lead.url,
        analyzedUrl: lead.report.analyzedUrl,
        businessName: lead.businessName,
        field: lead.field,
        region: lead.region,
        marketingConsent: lead.marketingConsent ?? false,
        score: lead.score,
        tierLabel: lead.report.tier.label,
        cached: lead.cached ?? false,
        estimatedCostUsd: lead.estimatedCostUsd ?? 0,
        businessSnapshot: lead.report.businessSnapshot,
        fullReport: lead.report,
        createdAt: lead.createdAt,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("Lead API returned non-OK status", res.status, await res.text());
    }
  } catch (err) {
    // Never let a lead-persistence failure surface to the visitor — they
    // already have a valid report on screen by the time this runs.
    console.error("Failed to call lead API", err);
  }
}
