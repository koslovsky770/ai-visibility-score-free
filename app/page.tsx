"use client";

import { useState } from "react";
import type { FreeAnalysisReport } from "@/lib/types";
import ScanningLoader from "@/components/ScanningLoader";
import ScoreHeader from "@/components/ScoreHeader";
import BusinessSnapshot from "@/components/BusinessSnapshot";
import SiteMapSummary from "@/components/SiteMapSummary";
import CategoryCard from "@/components/CategoryCard";
import FindingsList from "@/components/FindingsList";
import LimitsNotice from "@/components/LimitsNotice";
import FullAuditCta from "@/components/FullAuditCta";

type ViewState =
  | { status: "form" }
  | { status: "loading" }
  | { status: "report"; report: FreeAnalysisReport }
  | { status: "error"; message: string; warnings?: string[] };

const EMPTY_FORM = { name: "", email: "", url: "", businessName: "", field: "", region: "" };

export default function Home() {
  const [view, setView] = useState<ViewState>({ status: "form" });
  const [form, setForm] = useState(EMPTY_FORM);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setView({ status: "loading" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setView({ status: "error", message: data.error ?? "אירעה שגיאה. נסו שוב." });
        return;
      }
      if (data.crawlFailed) {
        setView({ status: "error", message: data.message, warnings: data.crawlWarnings });
        return;
      }
      setView({ status: "report", report: data.report as FreeAnalysisReport });
    } catch {
      setView({ status: "error", message: "אירעה שגיאת תקשורת. בדקו את החיבור ונסו שוב." });
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-16">
      <header className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          בדיקת AI חינמית לדף הבית שלך
        </h1>
        <p className="mt-3 text-lg text-slate-500">
          עד כמה דף הבית שלך ממלא את תפקידו כשער כניסה להבנת העסק שלך?
        </p>
      </header>

      {view.status === "form" && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="שם מלא"
              required
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="השם שלך"
            />
            <Field
              label="אימייל"
              required
              type="email"
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              placeholder="you@example.com"
            />
          </div>
          <Field
            label="כתובת האתר"
            required
            value={form.url}
            onChange={(v) => setForm((f) => ({ ...f, url: v }))}
            placeholder="לדוגמה: mybusiness.co.il"
          />
          <Field
            label="שם העסק"
            required
            value={form.businessName}
            onChange={(v) => setForm((f) => ({ ...f, businessName: v }))}
            placeholder="שם העסק כפי שמופיע באתר"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="תחום הפעילות"
              value={form.field}
              onChange={(v) => setForm((f) => ({ ...f, field: v }))}
              placeholder="לדוגמה: עורך דין, מסעדה, ייעוץ עסקי"
            />
            <Field
              label="אזור פעילות (אופציונלי)"
              value={form.region}
              onChange={(v) => setForm((f) => ({ ...f, region: v }))}
              placeholder="לדוגמה: תל אביב, או 'ארצי'"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 font-bold text-white transition hover:bg-indigo-700"
          >
            בדקו את דף הבית שלי — בחינם
          </button>
          <p className="text-center text-xs text-slate-400">
            הבדיקה בודקת רק את דף הבית. לניתוח מלא של האתר כולו קיימת בדיקה מלאה בתשלום.
          </p>
        </form>
      )}

      {view.status === "loading" && <ScanningLoader />}

      {view.status === "error" && (
        <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="font-semibold text-rose-800">{view.message}</p>
          {view.warnings && view.warnings.length > 1 && (
            <ul className="text-sm text-rose-600">
              {view.warnings.slice(1).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setView({ status: "form" })}
            className="rounded-full bg-rose-600 px-5 py-2 font-medium text-white hover:bg-rose-700"
          >
            נסו שוב
          </button>
        </div>
      )}

      {view.status === "report" && (
        <div className="space-y-8">
          <ScoreHeader report={view.report} />

          {view.report.crawlWarnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold">שימו לב:</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {view.report.crawlWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <BusinessSnapshot snapshot={view.report.businessSnapshot} />

          <div className="grid gap-4 sm:grid-cols-2">
            {view.report.categories.map((cat) => (
              <CategoryCard key={cat.category} category={cat} />
            ))}
          </div>

          <FindingsList whatWorks={view.report.whatWorks} whatIsMissing={view.report.whatIsMissing} />
          <SiteMapSummary siteMap={view.report.siteMap} />
          <LimitsNotice totalPagesFound={view.report.siteMap.totalPagesFound} />
          <FullAuditCta />

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setView({ status: "form" });
              }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              בדקו אתר נוסף
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "email";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </label>
  );
}
