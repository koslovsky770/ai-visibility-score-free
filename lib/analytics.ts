/**
 * Minimal client-side analytics abstraction. No analytics provider is wired
 * up in this project yet, so `track` only logs to the console in
 * development. When a real provider (PostHog, GA4, Vercel Analytics, ...)
 * is chosen, replace the body of this function — call sites elsewhere in
 * the app don't need to change.
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
  // TODO: send to a real analytics provider once one is chosen.
}
