"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { FreeAnalysisReport } from "@/lib/types";
import { track } from "@/lib/analytics";
import ScanningLoader from "@/components/ScanningLoader";
import ScoreHeader from "@/components/ScoreHeader";
import BusinessSnapshot from "@/components/BusinessSnapshot";
import SiteMapSummary from "@/components/SiteMapSummary";
import CategoryCard from "@/components/CategoryCard";
import FindingsList from "@/components/FindingsList";
import LimitsNotice from "@/components/LimitsNotice";
import FullAuditCta from "@/components/FullAuditCta";

type FormStep = "url" | "contact";

type ViewState =
  | { status: "form" }
  | { status: "loading" }
  | { status: "report"; report: FreeAnalysisReport }
  | { status: "error"; message: string; warnings?: string[] };

const EMPTY_FORM = { name: "", email: "", url: "", businessName: "", field: "", region: "" };

// Soft client-side sanity check only — the server crawl is what actually
// determines whether a URL is reachable and worth analyzing.
const URL_RE = /^(https?:\/\/)?[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)+(\/\S*)?$/;

// Shared card treatment used by the value-props and URL cards.
const CARD_CLASS = "rounded-[24px] border border-[#E6EAF2] shadow-[0_10px_30px_rgba(20,35,90,0.07)]";

export default function Home() {
  const [view, setView] = useState<ViewState>({ status: "form" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [formStep, setFormStep] = useState<FormStep>("url");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const trackedLanding = useRef(false);

  useEffect(() => {
    if (!trackedLanding.current) {
      trackedLanding.current = true;
      track("landing_view");
    }
  }, []);

  function handleUrlStepSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = form.url.trim();
    if (!trimmed || !URL_RE.test(trimmed)) {
      setUrlError("נראה שזו לא כתובת אתר תקינה. בדקו ונסו שוב (לדוגמה: https://example.co.il).");
      return;
    }
    setUrlError(null);
    track("url_submitted", { url: trimmed });
    setFormStep("contact");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setView({ status: "loading" });
    track("audit_started");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, marketingConsent: consent }),
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
      track("lead_submitted");
      const report = data.report as FreeAnalysisReport;
      track("business_detected", { unclearCount: report.businessSnapshot.unclear.length });
      track("audit_completed", { score: report.totalScore });
      setView({ status: "report", report });
    } catch {
      setView({ status: "error", message: "אירעה שגיאת תקשורת. בדקו את החיבור ונסו שוב." });
    }
  }

  function resetAll() {
    setForm(EMPTY_FORM);
    setFormStep("url");
    setConsent(false);
    setUrlError(null);
    setView({ status: "form" });
  }

  return (
    <main className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-14">
      {view.status !== "report" && <BackgroundGlow />}
      {view.status !== "report" && <TopBar />}

      {view.status === "form" && formStep === "url" && (
        <div>
          <div className="mx-auto max-w-2xl">
            <Hero />
            <EngineRow />
          </div>

          <div className="mx-auto max-w-lg">
            <ValuePropsCard />

            <form onSubmit={handleUrlStepSubmit} className={`${CARD_CLASS} space-y-5 bg-white p-7 sm:p-8`}>
              <UrlField
                value={form.url}
                onChange={(v) => {
                  setForm((f) => ({ ...f, url: v }));
                  if (urlError) setUrlError(null);
                }}
                error={urlError}
              />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(90deg,#2F67FF_0%,#6D37FF_100%)] py-4 text-base font-bold text-white shadow-[0_9px_22px_rgba(83,76,255,0.25)] transition hover:opacity-95"
              >
                בדקו איך ה-AI רואה את העסק שלי
                <IconArrowLeft className="h-4 w-4" />
              </button>
              <p className="text-center text-lg leading-relaxed text-slate-400">
                הבדיקה החינמית מנתחת את דף הבית – נקודת הכניסה המרכזית שדרכה מנועי AI מתחילים להבין
                את העסק, ומספקת גם הצעות ראשוניות לשיפור ללא עלות.
              </p>
            </form>

            <TrustBadges />
          </div>
        </div>
      )}

      {view.status === "form" && formStep === "contact" && (
        <div className="mx-auto max-w-md">
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setFormStep("url")}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              ← חזרה
            </button>
            <p className="truncate rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
              בודקים את: <span className="font-medium text-slate-700">{form.url}</span>
            </p>
            <h2 className="text-lg font-bold text-slate-800">לאן לשלוח את תוצאות הבדיקה?</h2>
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
            <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>אשמח לקבל גם טיפים ועדכונים על שיווק דיגיטלי לעסקים (ניתן להסיר בכל עת)</span>
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              קבלו את תוצאות הבדיקה
            </button>
          </form>
        </div>
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
            onClick={() => {
              setFormStep("url");
              setView({ status: "form" });
            }}
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
          <FullAuditCta onCtaClick={() => track("full_report_cta_clicked")} />

          <div className="text-center">
            <button type="button" onClick={resetAll} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              בדקו אתר נוסף
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// Very soft, subtle depth in the page corners — decorative only.
function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#EEF2FF] opacity-70 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#F0ECFF] opacity-60 blur-3xl" />
    </div>
  );
}

function TopBar() {
  return (
    <div className="mx-auto mb-10 flex max-w-2xl items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
        <IconSparkle className="h-4 w-4 text-indigo-600" />
        AI Visibility
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
        <IconRocket className="h-3.5 w-3.5" />
        מוביל עסקים לצמיחה בעולם ה-AI
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="mb-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="order-2 sm:order-none">
          <Mascot />
        </div>
        <div className="order-1 text-center sm:order-none sm:flex-1 sm:text-right">
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-[#0F172A]">
            האם ה-AI מבין מספיק טוב את העסק שלך כדי{" "}
            <span className="bg-[linear-gradient(90deg,#3563FF_0%,#6D4CFF_100%)] bg-clip-text text-transparent">
              להמליץ עליו?
            </span>
          </h1>
        </div>
      </div>
      <p className="mx-auto mt-5 max-w-xl text-center font-sans text-lg font-normal leading-relaxed text-[#334155]">
        יותר ויותר לקוחות מחפשים עסקים ושירותים באמצעות ChatGPT, Gemini ומנועי AI.
        <br />
        הבדיקה של דף הבית תגלה עד כמה האתר שלך מסביר ל-AI מה העסק שלכם, מה אתם מציעים ומי קהל
        היעד.
      </p>
    </div>
  );
}

function Mascot() {
  return (
    <div className="relative flex h-[190px] w-[190px] shrink-0 items-center justify-center sm:h-[300px] sm:w-[300px]">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -top-4 right-2 h-32 w-32 rounded-full bg-[#EEF2FF] blur-2xl sm:h-48 sm:w-48" />
        <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-[#E9F2FF] blur-2xl sm:h-40 sm:w-40" />
        <div className="absolute left-1/2 top-1/3 h-24 w-24 -translate-x-1/2 rounded-full bg-[#F0ECFF] blur-2xl sm:h-36 sm:w-36" />
      </div>
      <Image
        src="/robot-main.png"
        alt="דמות רובוט ידידותית של AI Visibility"
        width={660}
        height={660}
        priority
        sizes="(min-width: 640px) 300px, 190px"
        className="relative h-full w-full object-contain"
      />
    </div>
  );
}

function EngineRow() {
  const engines: { name: string; src: string }[] = [
    { name: "ChatGPT", src: "/logo-chatgpt.png" },
    { name: "Gemini", src: "/logo-gemini.png" },
    { name: "Claude", src: "/logo-claude.png" },
  ];
  return (
    <div className="mb-8 text-center">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {engines.map((e, i) => (
          <Fragment key={e.name}>
            {i > 0 && <span aria-hidden className="h-6 w-px bg-[#DCE3F0]" />}
            <Image
              src={e.src}
              alt={e.name}
              width={198}
              height={79}
              className="h-7 w-auto object-contain sm:h-8"
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function ValuePropsCard() {
  const items: { src: string; label: string }[] = [
    { src: "/icon-bars.png", label: "ציון ברור לדף הבית" },
    { src: "/icon-document.png", label: "מה ה-AI מצליח להבין על העסק" },
    { src: "/icon-lightbulb.png", label: "מה חסר והמלצות לשיפור" },
  ];
  return (
    <div className={`${CARD_CLASS} mb-6 bg-[#F0EFFD] p-6`}>
      <p className="mb-5 text-center text-lg font-semibold text-slate-700">בבדיקה תקבלו:</p>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-0">
        {items.map(({ src, label }, i) => (
          <Fragment key={label}>
            {i > 0 && <span aria-hidden className="hidden h-16 w-px self-center bg-[#E6EAF2] sm:block" />}
            <div className="flex flex-1 flex-col items-center gap-2.5 text-center sm:px-3">
              <Image src={src} alt="" width={128} height={128} className="h-14 w-14 object-contain" />
              <span className="text-lg font-medium leading-snug text-slate-600">{label}</span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function TrustBadges() {
  return (
    <div className="mt-6 text-center">
      <a
        href="https://odesign.co.il/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-base text-[#667085] hover:text-[#5266E8] hover:underline"
      >
        פותח על ידי Odesign - אסטרטגיה, שיווק ודיגיטל
      </a>
    </div>
  );
}

function UrlField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        כתובת האתר שלך<span className="text-rose-500"> *</span>
      </span>
      <div className="relative">
        <IconLink className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.co.il"
          className={`h-[60px] w-full rounded-[14px] border pr-11 pl-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500"
              : "border-[#DCE4F2] focus:border-[#6D4CFF] focus:ring-[#6D4CFF]"
          }`}
        />
      </div>
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
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

function IconLink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
    </svg>
  );
}

function IconRocket({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4.5 16.5c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.8-.8 1-2 .5-3.5-1.5-.5-2.7-.3-3.5.5z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-8.5C12.5 1.5 16 1 19 4s2.5 6.5.5 8.5A22 22 0 0 1 12 15z" />
      <circle cx="15" cy="9" r="1.5" />
    </svg>
  );
}
