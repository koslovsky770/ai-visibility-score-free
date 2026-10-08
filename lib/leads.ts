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
 * Fans a lead + its free-check report out to every configured destination.
 * Each destination is opt-in via its own env vars and silently no-ops when
 * they're missing (same graceful-degradation pattern as
 * lib/rateLimitAndCache.ts's getRedis()), so local dev and any deploy
 * without a destination configured keep working, just without persistence.
 * Destinations run in parallel and fail independently — one being down
 * never blocks the others.
 *
 * In local dev, leads are also appended to a gitignored JSON-lines file so
 * they're inspectable without needing any live destination.
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

  const results = await Promise.allSettled([
    sendToGoogleSheets(lead),
    sendToPlando(lead),
    sendToCpanelApi(lead),
  ]);
  const sentAnywhere = results.some((r) => r.status === "fulfilled" && r.value);
  if (!sentAnywhere) {
    console.warn("Lead was not persisted to any destination (none configured, or all failed).");
  }
}

/**
 * Appends a row to a Google Sheet via a Google Apps Script web app — see
 * integrations/google-sheets/. Apps Script can't read request headers, so
 * the shared secret travels in the body.
 */
async function sendToGoogleSheets(lead: StoredLead): Promise<boolean> {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  if (!url || !secret) return false;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        createdAt: lead.createdAt,
        name: lead.name,
        email: lead.email,
        submittedUrl: lead.url,
        analyzedUrl: lead.report.analyzedUrl,
        score: lead.score,
        tierLabel: lead.report.tier.label,
        marketingConsent: lead.marketingConsent ?? false,
        businessWhat: lead.report.businessSnapshot.what ?? "",
        topGaps: lead.report.whatIsMissing
          .slice(0, 3)
          .map((c) => c.label)
          .join(" | "),
        cached: lead.cached ?? false,
        estimatedCostUsd: lead.estimatedCostUsd ?? 0,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    // Apps Script answers 200 even for script-level errors, so trust the body.
    const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !data?.ok) {
      console.error("Google Sheets webhook failed", res.status, data?.error ?? "");
      return false;
    }
    return true;
  } catch (err) {
    // Never let a lead-persistence failure surface to the visitor — they
    // already have a valid report on screen by the time this runs.
    console.error("Failed to call Google Sheets webhook", err);
    return false;
  }
}

/**
 * Creates (or updates, matched by email) a contact in Plando CRM via its
 * lead-form API — see integrations/plando/README.md for the parameter list.
 * PLANDO_LEAD_ORIGIN_ID / PLANDO_LEAD_STATUS_ID are optional numeric
 * category ids from the Plando account.
 */
async function sendToPlando(lead: StoredLead): Promise<boolean> {
  const accessKey = process.env.PLANDO_ACCESS_KEY;
  if (!accessKey) return false;

  const report = lead.report;
  const gaps = report.whatIsMissing.slice(0, 3).map((c) => `- ${c.label}`);
  const remark = [
    `בדיקת AI Visibility חינמית`,
    `אתר: ${report.analyzedUrl}`,
    `ציון: ${lead.score}/100 (${report.tier.label})`,
    ...(gaps.length ? ["פערים מרכזיים:", ...gaps] : []),
  ].join("\n");

  const form = new URLSearchParams({
    access_key: accessKey,
    name: lead.name,
    email: lead.email,
    update_contact: "1",
    approve_mailing: lead.marketingConsent ? "1" : "0",
    tags: "AI Visibility FREE",
    no_redirect: "1",
    "contact[remark]": remark,
  });
  const originId = process.env.PLANDO_LEAD_ORIGIN_ID;
  if (originId) form.set("contact[lead_origin_cat_id]", originId);
  const salesPersonId = process.env.PLANDO_SALES_PERSON_ID;
  if (salesPersonId) form.set("contact[customer_sales_person_id]", salesPersonId);
  const statusId = process.env.PLANDO_LEAD_STATUS_ID;
  if (statusId) form.set("contact[lead_status_cat_id]", statusId);

  try {
    const res = await fetch("https://plando.co.il/contacts/lead_form1", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    let data: { err?: string | number; errdesc?: string } | null = null;
    try {
      data = JSON.parse(text);
    } catch {
      // fall through — logged below
    }
    if (!res.ok || !data || String(data.err) !== "0") {
      console.error("Plando lead API failed", res.status, data?.errdesc ?? text.slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to call Plando lead API", err);
    return false;
  }
}

/** MySQL + results email via the PHP bridge in cpanel-api/. */
async function sendToCpanelApi(lead: StoredLead): Promise<boolean> {
  const apiUrl = process.env.LEADS_API_URL;
  const apiKey = process.env.LEADS_API_KEY;
  if (!apiUrl || !apiKey) return false;

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
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to call lead API", err);
    return false;
  }
}
