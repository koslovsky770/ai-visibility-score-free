import { track as vercelTrack } from "@vercel/analytics";

/**
 * Client-side analytics abstraction, backed by Vercel Analytics (page views
 * come from <Analytics /> in app/layout.tsx; these are the funnel's custom
 * events). Call sites only use `track`, so swapping providers later means
 * changing this one file.
 */
export type AnalyticsEvent =
  | "landing_view"
  | "url_submitted"
  | "business_detected"
  | "lead_submitted"
  | "audit_started"
  | "audit_completed"
  | "full_report_cta_clicked";

export function track(event: AnalyticsEvent, payload?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", event, payload ?? {});
  }
  try {
    vercelTrack(event, payload as Record<string, string | number | boolean | null> | undefined);
  } catch {
    // Analytics must never break the app.
  }
}
