import type { SiteMapSummary as SiteMapSummaryType, PageRole } from "@/lib/types";

const ROLE_LABELS: Record<Exclude<PageRole, "home" | "other">, string> = {
  about: "עמוד אודות",
  contact: "צור קשר",
  service: "עמודי שירותים / מוצרים",
  blog: "בלוג / מאמרים",
  faq: "שאלות ותשובות",
  portfolio: "תיק עבודות / פרויקטים",
  testimonials: "המלצות",
};

export default function SiteMapSummary({ siteMap }: { siteMap: SiteMapSummaryType }) {
  const entries = Object.entries(siteMap.byRole) as [Exclude<PageRole, "home" | "other">, { text: string; url: string }[]][];

  if (siteMap.totalPagesFound === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <h3 className="mb-2 font-bold text-slate-800">מיפוי האתר</h3>
        <p className="text-sm text-slate-500">
          לא זוהו מדף הבית קישורים ברורים לעמודים פנימיים נוספים (אודות, שירותים, בלוג וכדומה).
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <h3 className="mb-1 font-bold text-slate-800">מיפוי האתר</h3>
      <p className="mb-4 text-sm text-slate-500">
        זיהינו {siteMap.totalPagesFound} קישורים לעמודים פנימיים מדף הבית (לא נותחו לעומק בבדיקה החינמית).
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {entries.map(([role, links]) => (
          <li key={role} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-700">{ROLE_LABELS[role]}</span>
            <span className="font-semibold text-slate-500">{links.length}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
